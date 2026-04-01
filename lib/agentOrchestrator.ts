/**
 * Agent Orchestrator
 * Main orchestration logic for the agentic code review system
 * Implements the agent loop: GPT-4o → tool calls → local execution → loop
 */

import OpenAI from "openai";
import { ReviewComment, AgentReviewResult } from "@/types";
import { AGENT_TOOLS } from "@/lib/agentTools";
import { AGENT_SYSTEM_PROMPT, AGENT_USER_PROMPT_TEMPLATE, AGENT_FINALIZE_PROMPT } from "@/lib/agentPrompts";
import {
  analyzeFile,
  checkSecurity,
  checkPerformance,
  checkTypes,
} from "@/lib/toolImplementations";

export interface FileToAnalyze {
  filename: string;
  patch?: string;
  content?: string; // Full file content for analysis
  language?: "typescript" | "javascript" | "jsx" | "tsx";
}

/**
 * Determines programming language from filename
 */
function getLanguageFromFilename(
  filename: string
): "typescript" | "javascript" | "jsx" | "tsx" {
  if (filename.endsWith(".tsx")) return "tsx";
  if (filename.endsWith(".ts")) return "typescript";
  if (filename.endsWith(".jsx")) return "jsx";
  if (filename.endsWith(".js")) return "javascript";
  return "javascript"; // default
}

/**
 * Execute a tool function based on tool name
 */
async function executeTool(
  toolName: string,
  toolInput: Record<string, unknown>
): Promise<{ file: string; findings: Array<{ line: number; severity: string; issue: string }> }> {
  const { file, code, language } = toolInput as {
    file: string;
    code: string;
    language: string;
  };

  const typedLanguage = language as "typescript" | "javascript" | "jsx" | "tsx";

  let findings = [];

  switch (toolName) {
    case "analyze_file":
      findings = await analyzeFile(file, code, typedLanguage);
      break;
    case "check_security":
      findings = await checkSecurity(file, code, typedLanguage);
      break;
    case "check_performance":
      findings = await checkPerformance(file, code, typedLanguage);
      break;
    case "check_types":
      findings = await checkTypes(file, code, typedLanguage);
      break;
    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }

  return { file, findings };
}

/**
 * Main orchestrator function
 * Runs the agentic code review loop
 */
export async function orchestrateCodeReview(
  files: FileToAnalyze[],
  openaiApiKey: string
): Promise<AgentReviewResult> {
  const client = new OpenAI({ apiKey: openaiApiKey });

  // Filter and prepare files for analysis
  const jstsFiles = files.filter(
    (f) => f.language || /\.(js|jsx|ts|tsx)$/.test(f.filename)
  );

  if (jstsFiles.length === 0) {
    return {
      findings: [],
      summary: {
        totalIssues: 0,
        errors: 0,
        warnings: 0,
        suggestions: 0,
        filesReviewed: 0,
      },
    };
  }

  // Prepare file list for analysis
  const fileList = jstsFiles
    .map((f) => `- ${f.filename} (${f.language || getLanguageFromFilename(f.filename)})`)
    .join("\n");

  // Prepare file contents with line numbers for context
  const filesContent = jstsFiles
    .map((f) => {
      if (!f.content) {
        return `### ${f.filename}\n\`\`\`\nNo content provided\n\`\`\``;
      }
      const lines = f.content
        .split("\n")
        .map((line, idx) => `${String(idx + 1).padStart(4, " ")} | ${line}`)
        .join("\n");
      return `### ${f.filename}\n\`\`\`\n${lines}\n\`\`\``;
    })
    .join("\n\n");

  // Initialize conversation messages
  const messages: OpenAI.ChatCompletionMessageParam[] = [
    {
      role: "user",
      content: AGENT_USER_PROMPT_TEMPLATE(fileList, filesContent),
    },
  ];

  let allToolResults: Record<
    string,
    Array<{ line: number; severity: string; issue: string }>
  > = {};
  let iterations = 0;
  const maxIterations = 20;

  console.log("[agent] Starting orchestration loop for", jstsFiles.length, "files");

  // Agentic loop
  while (iterations < maxIterations) {
    iterations++;
    console.log(`[agent] Iteration ${iterations}`);

    try {
      // Call GPT-4o with tools
      const response = await client.chat.completions.create({
        model: "gpt-4o",
        messages,
        tools: AGENT_TOOLS as unknown as OpenAI.ChatCompletionTool[],
        tool_choice: "auto",
        temperature: 0.3,
        max_tokens: 4096,
      });

      console.log(`[agent] Response stop_reason: ${response.choices[0].finish_reason}`);

      // Check if there are tool calls
      if (response.choices[0].finish_reason === "tool_calls") {
        const toolCalls = response.choices[0].message.tool_calls || [];
        console.log(`[agent] Processing ${toolCalls.length} tool calls`);

        // Add assistant message to conversation
        messages.push({
          role: "assistant",
          content: response.choices[0].message.content || "",
          tool_calls: toolCalls as OpenAI.ChatCompletionMessageToolCall[],
        });

        // Execute all tool calls locally
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const toolResults: any[] = [];

        for (const toolCall of toolCalls) {
          try {
            const toolInput = JSON.parse(toolCall.function.arguments);
            console.log(`[agent] Executing tool: ${toolCall.function.name} for file: ${toolInput.file}`);

            const result = await executeTool(toolCall.function.name, toolInput);

            // Store results for later aggregation
            if (!allToolResults[result.file]) {
              allToolResults[result.file] = [];
            }
            allToolResults[result.file].push(...result.findings);

            toolResults.push({
              type: "tool_result",
              tool_use_id: toolCall.id,
              content: JSON.stringify(result),
            });
          } catch (error) {
            console.error(`[agent] Tool execution error:`, error);
            toolResults.push({
              type: "tool_result",
              tool_use_id: toolCall.id,
              content: JSON.stringify({
                error: error instanceof Error ? error.message : "Unknown error",
              }),
              is_error: true,
            });
          }
        }

        // Add tool results to conversation
        messages.push({
          role: "user",
          content: toolResults,
        } as unknown as OpenAI.ChatCompletionMessageParam);
      } else if (response.choices[0].finish_reason === "stop") {
        // Agent is done - break loop
        console.log("[agent] Agent finished (stop)");
        break;
      } else {
        console.log(`[agent] Unexpected finish reason: ${response.choices[0].finish_reason}`);
        break;
      }
    } catch (error) {
      console.error("[agent] Orchestration error:", error);
      throw error;
    }
  }

  console.log("[agent] Orchestration complete. Total iterations:", iterations);

  // Aggregate and consolidate findings
  const findings = aggregateFindings(allToolResults);

  // Calculate summary
  const summary = {
    totalIssues: findings.length,
    errors: findings.filter((f) => f.severity === "error").length,
    warnings: findings.filter((f) => f.severity === "warning").length,
    suggestions: findings.filter((f) => f.severity === "suggestion").length,
    filesReviewed: jstsFiles.length,
  };

  return {
    findings,
    summary,
  };
}

/**
 * Aggregate findings from multiple tool runs
 * Deduplicates issues, picks highest severity if same line mentioned multiple times
 */
function aggregateFindings(
  allToolResults: Record<string, Array<{ line: number; severity: string; issue: string }>>
): ReviewComment[] {
  const aggregated: Record<string, ReviewComment> = {};

  Object.entries(allToolResults).forEach(([file, findings]) => {
    findings.forEach((finding) => {
      const key = `${file}:${finding.line}`;

      if (aggregated[key]) {
        // Same line already has finding - keep highest severity
        const severityRank = { error: 3, warning: 2, suggestion: 1 };
        const currentRank = severityRank[finding.severity as keyof typeof severityRank] || 0;
        const existingRank =
          severityRank[aggregated[key].severity as keyof typeof severityRank] || 0;

        if (currentRank > existingRank) {
          // Update with higher severity
          aggregated[key].severity = finding.severity as "error" | "warning" | "suggestion";
          aggregated[key].comment = finding.issue;
        }
      } else {
        // New finding for this line
        aggregated[key] = {
          file,
          line: finding.line,
          severity: finding.severity as "error" | "warning" | "suggestion",
          comment: finding.issue,
        };
      }
    });
  });

  // Convert to array and sort by severity + line number
  return Object.values(aggregated)
    .sort((a, b) => {
      const severityRank = { error: 3, warning: 2, suggestion: 1 };
      const aDifference =
        severityRank[a.severity as keyof typeof severityRank] - severityRank[b.severity as keyof typeof severityRank];
      if (aDifference !== 0) return -aDifference; // Higher severity first
      return a.line - b.line; // Same severity, sort by line
    });
}
