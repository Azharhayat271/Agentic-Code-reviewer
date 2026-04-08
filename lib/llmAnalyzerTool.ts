import OpenAI from "openai";
import { DiffSection } from "@/types";

export interface SemanticFinding {
  line: number;
  severity: "error" | "warning" | "suggestion" | "improvement";
  issue: string;
  reasoning: string; // Why this is an issue
  suggestedFix?: string; // How to fix it
  confidence: number; // 0-1 confidence score
}

/**
 * Helper: Extract and parse JSON that may be wrapped in markdown code blocks
 * Handles both raw JSON and markdown-wrapped JSON from GPT-4o
 */
function parseJsonResponse(content: string): unknown {
  let jsonStr = content.trim();

  // Remove markdown code block wrapper if present
  if (jsonStr.startsWith("```json")) {
    jsonStr = jsonStr.replace(/^```json\n?/, "").replace(/\n?```$/, "");
  } else if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.replace(/^```\n?/, "").replace(/\n?```$/, "");
  }

  return JSON.parse(jsonStr.trim());
}

/**
 * Analyzes code for bugs and logic errors using semantic understanding
 * ONLY analyzes lines marked with [CHANGED] - ignore context lines
 */
export async function analyzeBugsSemanticLLM(
  client: OpenAI,
  file: string,
  code: string,
  language: "typescript" | "javascript" | "jsx" | "tsx",
  diffSections: DiffSection[]
): Promise<SemanticFinding[]> {
  const prompt = `You are an expert code reviewer analyzing this ${language} file for BUGS and LOGIC ERRORS.

FILE: ${file}
IMPORTANT: This code shows changed lines marked with [CHANGED] and context lines marked with [context].
>>>>> YOU MUST ONLY REPORT FINDINGS ON LINES MARKED [CHANGED] <<<<<
Do NOT report issues on [context] lines - only on the actual changes.

CODE:
\`\`\`${language}
${code}
\`\`\`

TASK: Find ONLY bugs and logic errors IN THE CHANGED CODE. Look for:
1. Race conditions or async/await issues in changed code
2. Null/undefined handling problems in changed code
3. Logic errors in conditionals or loops (changed lines only)
4. Off-by-one errors in changed code
5. Incorrect API usage in changed code
6. State management bugs (React hooks, etc.) - only in changes
7. Missing error handling in changed code
8. Infinite loops or deadlocks in changed code
9. Type mismatches in changed code
10. Incorrect regular expressions in changed code

CRITICAL: Only report findings where the issue is ON a [CHANGED] line. 
Ignore any issues on [context] lines.

For each bug found ONLY in changed code, respond with ONLY a JSON array in this format (no other text):
[
  {
    "line": 42,
    "severity": "error",
    "issue": "Short description of the bug",
    "reasoning": "Detailed explanation of why this is a bug and what could go wrong",
    "suggestedFix": "How to fix this bug with code example",
    "confidence": 0.95
  }
]

If no bugs found in changed code, return empty array: []
`;

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      max_tokens: 2000,
    });

    const content = response.choices[0]?.message?.content || "[]";
    const findings = parseJsonResponse(content);
    return Array.isArray(findings) ? findings : [];
  } catch (error) {
    console.error(`[llm-analyzer] Bug analysis error for ${file}:`, error);
    return [];
  }
}

/**
 * Analyzes code for performance issues using semantic understanding
 * ONLY analyzes lines marked with [CHANGED] - ignore context lines
 */
export async function analyzePerformanceSemanticLLM(
  client: OpenAI,
  file: string,
  code: string,
  language: "typescript" | "javascript" | "jsx" | "tsx",
  diffSections: DiffSection[]
): Promise<SemanticFinding[]> {
  const prompt = `You are an expert performance analyst reviewing this ${language} code.

FILE: ${file}
IMPORTANT: This code shows changed lines marked with [CHANGED] and context lines marked with [context].
>>>>> YOU MUST ONLY REPORT FINDINGS ON LINES MARKED [CHANGED] <<<<<
Do NOT report issues on [context] lines - only on the actual changes.

CODE:
\`\`\`${language}
${code}
\`\`\`

TASK: Find ONLY performance issues and optimization opportunities IN THE CHANGED CODE. Look for:
1. N+1 query patterns (loops making queries) - only in changed code
2. Unnecessary re-renders in React - only in changed code
3. Missing memoization (useMemo, React.memo) - only in changed code
4. Inefficient algorithms (quadratic time complexity) - only in changed code
5. Memory leaks (event listeners, subscriptions not cleaned up) - only in changed code
6. Large synchronous operations blocking the event loop - only in changed code
7. DOM queries in loops - only in changed code
8. Inefficient data structures - only in changed code
9. Missing dependency arrays in hooks - only in changed code
10. Debouncing/throttling opportunities - only in changed code

CRITICAL: Only report findings where the performance issue is ON a [CHANGED] line.
Ignore any performance issues on [context] lines.

For each issue found ONLY in changed code, respond with ONLY a JSON array:
[
  {
    "line": 12,
    "severity": "warning",
    "issue": "Short description of the performance issue",
    "reasoning": "Detailed explanation of the performance problem and impact",
    "suggestedFix": "Optimization approach or code pattern to use",
    "confidence": 0.88
  }
]

If no performance issues found in changed code, return: []
`;

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      max_tokens: 2000,
    });

    const content = response.choices[0]?.message?.content || "[]";
    const findings = parseJsonResponse(content);
    return Array.isArray(findings) ? findings : [];
  } catch (error) {
    console.error(`[llm-analyzer] Performance analysis error for ${file}:`, error);
    return [];
  }
}

/**
 * Analyzes code for security vulnerabilities using semantic understanding
 * ONLY analyzes lines marked with [CHANGED] - ignore context lines
 */
export async function analyzeSecuritySemanticLLM(
  client: OpenAI,
  file: string,
  code: string,
  language: "typescript" | "javascript" | "jsx" | "tsx",
  diffSections: DiffSection[]
): Promise<SemanticFinding[]> {
  const prompt = `You are a security expert reviewing this ${language} code for vulnerabilities.

FILE: ${file}
IMPORTANT: This code shows changed lines marked with [CHANGED] and context lines marked with [context].
>>>>> YOU MUST ONLY REPORT FINDINGS ON LINES MARKED [CHANGED] <<<<<
Do NOT report issues on [context] lines - only on the actual changes.

CODE:
\`\`\`${language}
${code}
\`\`\`

TASK: Find ONLY security vulnerabilities IN THE CHANGED CODE. Look for:
1. XSS vulnerabilities (dangerouslySetInnerHTML, innerHTML, eval) - only in changed code
2. SQL injection patterns - only in changed code
3. Command injection risks - only in changed code
4. Hardcoded credentials/secrets - only in changed code
5. Insecure randomness - only in changed code
6. Missing input validation - only in changed code
7. CSRF vulnerabilities - only in changed code
8. Authentication/authorization flaws - only in changed code
9. Sensitive data exposure - only in changed code
10. Insecure deserialization - only in changed code

CRITICAL: Only report findings where the security issue is ON a [CHANGED] line.
Ignore any security issues on [context] lines.

For each vulnerability found ONLY in changed code, respond with ONLY a JSON array:
[
  {
    "line": 28,
    "severity": "error",
    "issue": "Potential XSS vulnerability",
    "reasoning": "User input is directly rendered without sanitization. Attackers could inject malicious scripts.",
    "suggestedFix": "Use DOMPurify or a trusted library to sanitize before rendering. Or use textContent instead of innerHTML.",
    "confidence": 0.92
  }
]

If no vulnerabilities found in changed code, return: []
`;

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      max_tokens: 2000,
    });

    const content = response.choices[0]?.message?.content || "[]";
    const findings = parseJsonResponse(content);
    return Array.isArray(findings) ? findings : [];
  } catch (error) {
    console.error(`[llm-analyzer] Security analysis error for ${file}:`, error);
    return [];
  }
}

/**
 * Analyzes code for design and architectural issues
 * ONLY analyzes lines marked with [CHANGED] - ignore context lines
 */
export async function analyzeDesignSemanticLLM(
  client: OpenAI,
  file: string,
  code: string,
  language: "typescript" | "javascript" | "jsx" | "tsx",
  diffSections: DiffSection[]
): Promise<SemanticFinding[]> {
  const prompt = `You are a software architect reviewing this ${language} code for design quality.

FILE: ${file}
IMPORTANT: This code shows changed lines marked with [CHANGED] and context lines marked with [context].
>>>>> YOU MUST ONLY REPORT FINDINGS ON LINES MARKED [CHANGED] <<<<<
Do NOT report issues on [context] lines - only on the actual changes.

CODE:
\`\`\`${language}
${code}
\`\`\`

TASK: Find ONLY design, architectural, and maintainability issues IN THE CHANGED CODE. Look for:
1. Code duplication (repeated patterns) - only in changed code
2. Long functions/methods (>30 lines should be split) - only in changed code
3. Deeply nested logic (>3 levels) - only in changed code
4. Poor separation of concerns - only in changed code
5. Unclear variable/function names - only in changed code
6. Missing abstractions - only in changed code
7. Tight coupling - only in changed code
8. God objects - only in changed code
9. Magic numbers/strings - only in changed code
10. Dead code or unused variables - only in changed code

CRITICAL: Only report findings where the design issue is ON a [CHANGED] line.
Ignore any design issues on [context] lines.

For each issue found ONLY in changed code, respond with ONLY a JSON array:
[
  {
    "line": 15,
    "severity": "improvement",
    "issue": "Function exceeds 50 lines - should be broken into smaller functions",
    "reasoning": "Large functions are harder to test, maintain, and understand. Single responsibility principle suggests breaking this into focused functions.",
    "suggestedFix": "Extract the nested logic for handling X into a separate function called handleX(). Extract validation logic into validateInput().",
    "confidence": 0.85
  }
]

If no design issues found in changed code, return: []
`;

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      max_tokens: 2000,
    });

    const content = response.choices[0]?.message?.content || "[]";
    const findings = parseJsonResponse(content);
    return Array.isArray(findings) ? findings : [];
  } catch (error) {
    console.error(`[llm-analyzer] Design analysis error for ${file}:`, error);
    return [];
  }
}

/**
 * Run all semantic analyses in parallel for a single file
 * Passes diff sections to all analyzers for focused review
 */
export async function analyzeSemanticallyLLM(
  client: OpenAI,
  file: string,
  code: string,
  language: "typescript" | "javascript" | "jsx" | "tsx",
  diffSections: DiffSection[]
): Promise<SemanticFinding[]> {
  console.log(`[llm-analyzer] Starting semantic analysis for ${file}...`);

  try {
    // Run all 4 analyses in parallel, passing diffSections to each
    const [bugs, performance, security, design] = await Promise.all([
      analyzeBugsSemanticLLM(client, file, code, language, diffSections),
      analyzePerformanceSemanticLLM(client, file, code, language, diffSections),
      analyzeSecuritySemanticLLM(client, file, code, language, diffSections),
      analyzeDesignSemanticLLM(client, file, code, language, diffSections),
    ]);

    const allFindings = [...bugs, ...performance, ...security, ...design];

    // Deduplicate by line number, keeping highest severity/confidence
    const deduped = new Map<number, SemanticFinding>();
    allFindings.forEach((finding) => {
      const key = finding.line;
      const existing = deduped.get(key);

      if (existing) {
        // Keep finding with highest severity then confidence
        const severityRank = { error: 3, warning: 2, suggestion: 1, improvement: 0 };
        const newRank = severityRank[finding.severity];
        const existingRank = severityRank[existing.severity];

        if (
          newRank > existingRank ||
          (newRank === existingRank && finding.confidence > existing.confidence)
        ) {
          deduped.set(key, finding);
        }
      } else {
        deduped.set(key, finding);
      }
    });

    const dedupedFindings = Array.from(deduped.values()).sort((a, b) => a.line - b.line);

    console.log(
      `[llm-analyzer] ${file}: Found ${dedupedFindings.length} unique semantic issues in changed code`
    );
    return dedupedFindings;
  } catch (error) {
    console.error(`[llm-analyzer] Error analyzing ${file}:`, error);
    return [];
  }
}
