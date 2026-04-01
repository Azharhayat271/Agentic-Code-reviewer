/**
 * LLM Semantic Analyzer Tool for Phase 2
 * Replaces regex-based tools with real AI semantic analysis
 * Uses GPT-4 directly to understand code intent and find deep issues
 */

import OpenAI from "openai";

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
 */
export async function analyzeBugsSemanticLLM(
  client: OpenAI,
  file: string,
  code: string,
  language: "typescript" | "javascript" | "jsx" | "tsx"
): Promise<SemanticFinding[]> {
  const prompt = `You are an expert code reviewer analyzing this ${language} file for BUGS and LOGIC ERRORS.

FILE: ${file}
CODE:
\`\`\`${language}
${code}
\`\`\`

TASK: Find real bugs, logic errors, and runtime issues. Look for:
1. Race conditions or async/await issues
2. Null/undefined handling problems
3. Logic errors in conditionals or loops
4. Off-by-one errors
5. Incorrect API usage
6. State management bugs (React hooks, etc.)
7. Missing error handling
8. Infinite loops or deadlocks
9. Type mismatches
10. Incorrect regular expressions

For each issue found, respond with ONLY a JSON array in this format (no other text):
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

If no bugs found, return empty array: []
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
 */
export async function analyzePerformanceSemanticLLM(
  client: OpenAI,
  file: string,
  code: string,
  language: "typescript" | "javascript" | "jsx" | "tsx"
): Promise<SemanticFinding[]> {
  const prompt = `You are an expert performance analyst reviewing this ${language} code.

FILE: ${file}
CODE:
\`\`\`${language}
${code}
\`\`\`

TASK: Find performance issues and optimization opportunities. Look for:
1. N+1 query patterns (loops making queries)
2. Unnecessary re-renders in React
3. Missing memoization (useMemo, React.memo)
4. Inefficient algorithms (quadratic time complexity)
5. Memory leaks (event listeners, subscriptions not cleaned up)
6. Large synchronous operations blocking the event loop
7. DOM queries in loops
8. Inefficient data structures
9. Missing dependency arrays in hooks
10. Debouncing/throttling opportunities

For each issue found, respond with ONLY a JSON array:
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

If no performance issues found, return: []
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
 */
export async function analyzeSecuritySemanticLLM(
  client: OpenAI,
  file: string,
  code: string,
  language: "typescript" | "javascript" | "jsx" | "tsx"
): Promise<SemanticFinding[]> {
  const prompt = `You are a security expert reviewing this ${language} code for vulnerabilities.

FILE: ${file}
CODE:
\`\`\`${language}
${code}
\`\`\`

TASK: Find security vulnerabilities and risks. Look for:
1. XSS vulnerabilities (dangerouslySetInnerHTML, innerHTML, eval)
2. SQL injection patterns
3. Command injection risks
4. Hardcoded credentials/secrets
5. Insecure randomness
6. Missing input validation
7. CSRF vulnerabilities
8. Authentication/authorization flaws
9. Sensitive data exposure
10. Insecure deserialization

For each vulnerability found, respond with ONLY a JSON array:
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

If no vulnerabilities found, return: []
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
 */
export async function analyzeDesignSemanticLLM(
  client: OpenAI,
  file: string,
  code: string,
  language: "typescript" | "javascript" | "jsx" | "tsx"
): Promise<SemanticFinding[]> {
  const prompt = `You are a software architect reviewing this ${language} code for design quality.

FILE: ${file}
CODE:
\`\`\`${language}
${code}
\`\`\`

TASK: Find design, architectural, and maintainability issues. Look for:
1. Code duplication (repeated patterns)
2. Long functions/methods (>30 lines should be split)
3. Deeply nested logic (>3 levels)
4. Poor separation of concerns
5. Unclear variable/function names
6. Missing abstractions
7. Tight coupling
8. God objects
9. Magic numbers/strings
10. Dead code or unused variables

For each issue found, respond with ONLY a JSON array:
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

If no design issues found, return: []
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
 */
export async function analyzeSemanticallyLLM(
  client: OpenAI,
  file: string,
  code: string,
  language: "typescript" | "javascript" | "jsx" | "tsx"
): Promise<SemanticFinding[]> {
  console.log(`[llm-analyzer] Starting semantic analysis for ${file}...`);

  try {
    // Run all 4 analyses in parallel
    const [bugs, performance, security, design] = await Promise.all([
      analyzeBugsSemanticLLM(client, file, code, language),
      analyzePerformanceSemanticLLM(client, file, code, language),
      analyzeSecuritySemanticLLM(client, file, code, language),
      analyzeDesignSemanticLLM(client, file, code, language),
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
      `[llm-analyzer] ${file}: Found ${dedupedFindings.length} unique semantic issues`
    );
    return dedupedFindings;
  } catch (error) {
    console.error(`[llm-analyzer] Error analyzing ${file}:`, error);
    return [];
  }
}
