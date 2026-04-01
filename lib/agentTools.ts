/**
 * Agent Tool Definitions
 * Defines the structure and types for tools that the agentic code reviewer uses
 */

import { Severity } from "@/types";

/**
 * Input structure for analyze_file tool
 * Analyzes a single file for overall code quality and issues
 */
export interface AnalyzeFileInput {
  file: string;
  code: string;
  language: "typescript" | "javascript" | "jsx" | "tsx";
}

/**
 * Input structure for check_security tool
 * Detects security vulnerabilities in code
 */
export interface CheckSecurityInput {
  file: string;
  code: string;
  language: "typescript" | "javascript" | "jsx" | "tsx";
}

/**
 * Input structure for check_performance tool
 * Identifies performance issues and optimization opportunities
 */
export interface CheckPerformanceInput {
  file: string;
  code: string;
  language: "typescript" | "javascript" | "jsx" | "tsx";
}

/**
 * Input structure for check_types tool
 * Validates TypeScript type safety and type-related issues
 */
export interface CheckTypesInput {
  file: string;
  code: string;
  language: "typescript" | "javascript" | "jsx" | "tsx";
}

/**
 * Finding from tool execution
 * Represents a single issue found by a tool
 */
export interface ToolFinding {
  line: number;
  severity: Severity;
  issue: string;
}

/**
 * Output structure for any tool execution
 * Contains line-by-line findings
 */
export interface ToolOutput {
  file: string;
  findings: ToolFinding[];
}

/**
 * OpenAI Tool Definition for function calling
 * Matches OpenAI's tool definition schema
 */
export interface OpenAIToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: {
      type: "object";
      properties: Record<string, object>;
      required: string[];
    };
  };
}

/**
 * Tool definitions for OpenAI function calling
 * Used in gpt-4o system prompt
 */
export const AGENT_TOOLS: OpenAIToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "analyze_file",
      description:
        "Deep analysis of a single file for code quality issues, logic errors, and general code review comments",
      parameters: {
        type: "object",
        properties: {
          file: {
            type: "string",
            description: "The filename being analyzed (e.g., src/components/Button.tsx)",
          },
          code: {
            type: "string",
            description: "The complete source code of the changed file (with line numbers context)",
          },
          language: {
            type: "string",
            enum: ["typescript", "javascript", "jsx", "tsx"],
            description: "Programming language of the file",
          },
        },
        required: ["file", "code", "language"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "check_security",
      description:
        "Security vulnerability detection: XSS, injection, exposed secrets, unsafe API usage, authentication/authorization issues",
      parameters: {
        type: "object",
        properties: {
          file: {
            type: "string",
            description: "The filename being analyzed",
          },
          code: {
            type: "string",
            description: "The complete source code of the changed file",
          },
          language: {
            type: "string",
            enum: ["typescript", "javascript", "jsx", "tsx"],
            description: "Programming language of the file",
          },
        },
        required: ["file", "code", "language"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "check_performance",
      description:
        "Performance issue detection: inefficient algorithms, N+1 queries, renders, memory leaks, unnecessary re-renders",
      parameters: {
        type: "object",
        properties: {
          file: {
            type: "string",
            description: "The filename being analyzed",
          },
          code: {
            type: "string",
            description: "The complete source code of the changed file",
          },
          language: {
            type: "string",
            enum: ["typescript", "javascript", "jsx", "tsx"],
            description: "Programming language of the file",
          },
        },
        required: ["file", "code", "language"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "check_types",
      description:
        "TypeScript type safety validation: type mismatches, missing type annotations, unsafe any usage, type confusion",
      parameters: {
        type: "object",
        properties: {
          file: {
            type: "string",
            description: "The filename being analyzed",
          },
          code: {
            type: "string",
            description: "The complete source code of the changed file",
          },
          language: {
            type: "string",
            enum: ["typescript", "javascript", "jsx", "tsx"],
            description: "Programming language of the file",
          },
        },
        required: ["file", "code", "language"],
      },
    },
  },
];

/**
 * Severity weight for prioritization
 * Used to sort findings by severity
 */
export const severityWeight: Record<Severity, number> = {
  error: 3,
  warning: 2,
  suggestion: 1,
};
