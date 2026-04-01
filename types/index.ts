export type Severity = "error" | "warning" | "suggestion";

export interface ReviewComment {
  file: string;
  line: number;
  severity: Severity;
  comment: string;
}

export interface ReviewResult {
  comments: ReviewComment[];
  prTitle: string;
  prUrl: string;
  summary?: {
    totalIssues: number;
    errors: number;
    warnings: number;
    suggestions: number;
    filesReviewed: number;
  };
  message?: string;
}

export interface PRInfo {
  owner: string;
  repo: string;
  number: number;
}

/**
 * Agent-specific types for agentic code review system
 */

/**
 * Represents analysis results for a single file
 */
export interface FileAnalysis {
  file: string;
  language: "typescript" | "javascript" | "jsx" | "tsx";
  issues: ReviewComment[];
}

/**
 * Tool call made by the agent
 * Follows OpenAI function calling format
 */
export interface AgentToolCall {
  id: string;
  type: "function";
  function: {
    name: "analyze_file" | "check_security" | "check_performance" | "check_types";
    arguments: string; // JSON string of tool input
  };
}

/**
 * Tool result returned by agent execution
 */
export interface AgentToolResult {
  toolCallId: string;
  toolName: string;
  result: {
    file: string;
    findings: Array<{
      line: number;
      severity: Severity;
      issue: string;
    }>;
  };
}

/**
 * Complete agent response with all findings
 */
export interface AgentReviewResult {
  findings: ReviewComment[];
  summary?: {
    totalIssues: number;
    errors: number;
    warnings: number;
    suggestions: number;
    filesReviewed: number;
  };
}
