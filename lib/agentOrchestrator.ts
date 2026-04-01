/**
 * Agent Orchestrator
 * Main orchestration logic for the agentic code review system
 * Implements the agent loop: GPT-4o → tool calls → local execution → loop
 */

import OpenAI from "openai";
import { ReviewComment, AgentReviewResult, Severity } from "@/types";
import { AGENT_TOOLS } from "@/lib/agentTools";
import { AGENT_SYSTEM_PROMPT, AGENT_USER_PROMPT_TEMPLATE, AGENT_FINALIZE_PROMPT } from "@/lib/agentPrompts";
import {
  analyzeFile,
  checkSecurity,
  checkPerformance,
  checkTypes,
} from "@/lib/toolImplementations";
import { analyzeSemanticallyLLM } from "@/lib/llmAnalyzerTool";

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
 * Analyze a single file using LLM semantic analysis (Phase 2)
 * Replaces regex-based tools with deep AI understanding
 */
async function analyzeFileSemanticLLM(
  file: FileToAnalyze,
  client: OpenAI
): Promise<ReviewComment[]> {
  if (!file.content) {
    console.log(`[llm-analyzer] Skipping ${file.filename} - no content`);
    return [];
  }

  const language = file.language || getLanguageFromFilename(file.filename);
  
  try {
    const findings = await analyzeSemanticallyLLM(client, file.filename, file.content, language);
    
    // Convert semantic findings to ReviewComment format
    const comments: ReviewComment[] = findings.map((finding) => ({
      file: file.filename,
      line: finding.line,
      severity: finding.severity,
      comment: finding.issue,
      reasoning: finding.reasoning,
      suggestedFix: finding.suggestedFix,
      confidence: finding.confidence,
    }));

    return comments;
  } catch (error) {
    console.error(`[llm-analyzer] Error analyzing ${file.filename}:`, error);
    return [];
  }
}

/**
 * Analyze a single file with its own agent loop
 * Each file gets independent analysis to avoid token limits
 */
async function analyzeFileWithAgent(
  file: FileToAnalyze,
  client: OpenAI
): Promise<Array<{ line: number; severity: string; issue: string }>> {
  if (!file.content) {
    console.log(`[agent-file] Skipping ${file.filename} - no content`);
    return [];
  }

  const language = file.language || getLanguageFromFilename(file.filename);
  const messages: OpenAI.ChatCompletionMessageParam[] = [
    {
      role: "user",
      content: `Analyze this code file using all available tools:

File: ${file.filename}
Language: ${language}

Code changes:
\`\`\`${language}
${file.content}
\`\`\`

Call all 4 tools: analyze_file, check_security, check_performance, and check_types for this file.`,
    },
  ];

  let fileFindings: Array<{ line: number; severity: string; issue: string }> = [];
  let iterations = 0;
  const maxIterations = 10; // Each file gets up to 10 iterations (increased from 5)

  console.log(`[agent-file] Analyzing ${file.filename}...`);

  while (iterations < maxIterations) {
    iterations++;

    try {
      const response = await client.chat.completions.create({
        model: "gpt-4o",
        messages,
        tools: AGENT_TOOLS as unknown as OpenAI.ChatCompletionTool[],
        tool_choice: "auto",
        temperature: 0.3,
        max_tokens: 2048, // Increased from 1024 for deeper analysis
      });

      if (response.choices[0].finish_reason === "tool_calls") {
        const toolCalls = response.choices[0].message.tool_calls || [];

        messages.push({
          role: "assistant",
          content: response.choices[0].message.content || "",
          tool_calls: toolCalls as OpenAI.ChatCompletionMessageToolCall[],
        });

        // Execute tools and add results as separate messages (correct OpenAI format)
        for (const toolCall of toolCalls) {
          try {
            const toolInput = JSON.parse(toolCall.function.arguments);
            const result = await executeTool(toolCall.function.name, toolInput);
            fileFindings.push(...result.findings);

            // Add each tool result as a separate message with role 'tool'
            messages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: JSON.stringify(result),
            });
          } catch (error) {
            // Add error as tool result
            messages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: JSON.stringify({
                error: error instanceof Error ? error.message : "Unknown error",
              }),
            });
          }
        }
      } else {
        // Agent finished or hit limit
        break;
      }
    } catch (error) {
      console.error(`[agent-file] Error analyzing ${file.filename}:`, error);
      break;
    }
  }

  console.log(
    `[agent-file] ${file.filename}: ${fileFindings.length} findings in ${iterations} iterations`
  );
  return fileFindings;
}

/**
 * Main orchestrator function
 * Processes files individually to prevent token limits
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
        improvements: 0,
        filesReviewed: 0,
      },
    };
  }

  console.log(`[agent] Processing ${jstsFiles.length} files in parallel batches`);

  // Batch files and process in parallel for efficiency
  const BATCH_SIZE = 5; // Process 5 files at a time in parallel
  const allFindings: ReviewComment[] = [];

  for (let i = 0; i < jstsFiles.length; i += BATCH_SIZE) {
    const batch = jstsFiles.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(jstsFiles.length / BATCH_SIZE);

    console.log(
      `[agent] Processing batch ${batchNum}/${totalBatches} (${batch.length} files in parallel)`
    );

    // Process all files in batch in parallel
    const batchResults = await Promise.all(
      batch.map(async (file) => {
        try {
          console.log(`[llm-analyzer] Analyzing ${file.filename}...`);
          // Use LLM semantic analysis (Phase 2) instead of regex-based tools
          const fileComments = await analyzeFileSemanticLLM(file, client);
          return fileComments;
        } catch (error) {
          console.error(`[agent] Failed to analyze ${file.filename}:`, error);
          return [];
        }
      })
    );

    // Flatten and add to all findings
    batchResults.forEach((batchFinding) => {
      allFindings.push(...batchFinding);
    });
  }

  console.log(`[agent] Completed analysis. Total findings: ${allFindings.length}`);

  // Aggregate and deduplicate findings
  const aggregatedFindings = aggregateFindings(allFindings);

  // Calculate summary
  const summary = {
    totalIssues: aggregatedFindings.length,
    errors: aggregatedFindings.filter((f) => f.severity === "error").length,
    warnings: aggregatedFindings.filter((f) => f.severity === "warning").length,
    suggestions: aggregatedFindings.filter((f) => f.severity === "suggestion").length,
    improvements: aggregatedFindings.filter((f) => f.severity === "improvement").length,
    filesReviewed: jstsFiles.length,
  };

  return {
    findings: aggregatedFindings,
    summary,
  };
}

/**
 * Aggregate findings from multiple tool runs
 * Deduplicates issues, picks highest severity if same line mentioned multiple times
 */
/**
 * Aggregate findings from multiple analyses
 * Deduplicates issues, picks highest severity/confidence if same line mentioned multiple times
 */
function aggregateFindings(findings: ReviewComment[]): ReviewComment[] {
  const aggregated: Record<string, ReviewComment> = {};

  findings.forEach((finding) => {
    const key = `${finding.file}:${finding.line}`;

    if (aggregated[key]) {
      // Same line already has finding - keep highest severity, then confidence
      const severityRank = { error: 3, warning: 2, suggestion: 1, improvement: 0 };
      const currentRank = severityRank[finding.severity as keyof typeof severityRank] ?? -1;
      const existingRank = severityRank[aggregated[key].severity as keyof typeof severityRank] ?? -1;

      // Keep the one with higher severity, or if equal, higher confidence
      if (
        currentRank > existingRank ||
        (currentRank === existingRank &&
          (finding.confidence ?? 0) > (aggregated[key].confidence ?? 0))
      ) {
        aggregated[key] = finding;
      }
    } else {
      aggregated[key] = finding;
    }
  });

  // Convert to array and sort by severity + line number
  return Object.values(aggregated)
    .sort((a, b) => {
      const severityRank = { error: 3, warning: 2, suggestion: 1, improvement: 0 };
      const aDiff =
        severityRank[a.severity as keyof typeof severityRank] -
        severityRank[b.severity as keyof typeof severityRank];
      if (aDiff !== 0) return -aDiff; // Higher severity first
      return a.line - b.line; // Same severity, sort by line
    });
}
