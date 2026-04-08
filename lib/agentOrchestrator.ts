/**
 * Agent Orchestrator
 * Main orchestration logic for the agentic code review system
 * Implements the agent loop: GPT-4o → tool calls → local execution → loop
 */

import OpenAI from "openai";
import { ReviewComment, AgentReviewResult, DiffSection } from "@/types";
import { analyzeSemanticallyLLM } from "@/lib/llmAnalyzerTool";
import { filterFindingsToChangedLines } from "@/lib/diffParser";

export interface FileToAnalyze {
  filename: string;
  patch?: string;
  diffSections: DiffSection[]; // Changed code sections from the diff
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
 * Analyze a single file using LLM semantic analysis (Phase 3: Diff-based analysis)
 * Only analyzes the changed code sections from the diff, not the entire file
 */
async function analyzeFileSemanticLLM(
  file: FileToAnalyze,
  client: OpenAI
): Promise<ReviewComment[]> {
  if (!file.diffSections || file.diffSections.length === 0) {
    console.log(`[llm-analyzer] Skipping ${file.filename} - no diff sections`);
    return [];
  }

  const language = file.language || getLanguageFromFilename(file.filename);
  
  try {
    // Build code content with line numbers marked for clarity
    // Format: [CHANGED] N: code line
    const codeContentWithLineNumbers = file.diffSections
      .map((section) => {
        const lines = section.content.split("\n");
        return lines
          .map((line, idx) => {
            const lineNum = section.startLine + idx;
            const isChanged = section.lineNumbers.includes(lineNum);
            const marker = isChanged ? "[CHANGED]" : "[context]";
            return `${marker} ${lineNum}: ${line}`;
          })
          .join("\n");
      })
      .join("\n\n");

    const findings = await analyzeSemanticallyLLM(
      client,
      file.filename,
      codeContentWithLineNumbers,
      language,
      file.diffSections
    );
    
    // Defensive filtering: ensure findings are only on changed lines
    const filteredFindings = filterFindingsToChangedLines(findings, file.diffSections);
    
    if (filteredFindings.length < findings.length) {
      console.warn(
        `[llm-analyzer] ${file.filename}: Filtered ${findings.length - filteredFindings.length} findings outside changed lines`
      );
    }

    // Convert semantic findings to ReviewComment format
    const comments: ReviewComment[] = filteredFindings.map((finding) => ({
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
