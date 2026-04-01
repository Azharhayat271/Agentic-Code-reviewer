/**
 * Tool Implementations
 * Local implementations of the four code review tools used by the agent
 */

import { ToolFinding } from "@/lib/agentTools";

type Language = "typescript" | "javascript" | "jsx" | "tsx";

/**
 * Analyze full file for code quality, logic errors, best practices
 */
export async function analyzeFile(
  file: string,
  code: string,
  language: Language
): Promise<ToolFinding[]> {
  const findings: ToolFinding[] = [];
  const lines = code.split("\n");

  // 1. Check for console.log in production code
  lines.forEach((line, idx) => {
    const lineNum = idx + 1;
    if (
      /console\.(log|warn|error|debug|info)\s*\(/.test(line) &&
      !line.trimStart().startsWith("//")
    ) {
      findings.push({
        line: lineNum,
        severity: "suggestion",
        issue: "Remove console.log statement before deploying to production.",
      });
    }
  });

  // 2. Check for debugger statements
  lines.forEach((line, idx) => {
    const lineNum = idx + 1;
    if (/^\s*debugger\s*;/.test(line)) {
      findings.push({
        line: lineNum,
        severity: "error",
        issue: "Debugger statement left in code - remove before committing.",
      });
    }
  });

  // 3. Check for empty catch blocks
  lines.forEach((line, idx) => {
    const lineNum = idx + 1;
    if (/catch\s*\(\w+\)\s*\{\s*\}/.test(line)) {
      findings.push({
        line: lineNum,
        severity: "warning",
        issue: "Empty catch block ignores errors silently. Log or handle the error.",
      });
    }
  });

  // 4. Check for TODO/FIXME comments
  lines.forEach((line, idx) => {
    const lineNum = idx + 1;
    if (/(TODO|FIXME|HACK|BUG):\s*/.test(line)) {
      findings.push({
        line: lineNum,
        severity: "suggestion",
        issue:
          "TODO/FIXME comment found - ensure it's tracked as an issue before merging.",
      });
    }
  });

  // 5. Check for nested ternaries (hard to read)
  lines.forEach((line, idx) => {
    const lineNum = idx + 1;
    // Count ternary operators
    const ternaryCount = (line.match(/\?/g) || []).length;
    if (ternaryCount > 1) {
      findings.push({
        line: lineNum,
        severity: "suggestion",
        issue: "Nested ternary operators reduce readability. Consider if-else or refactor.",
      });
    }
  });

  // 6. Check for unreachable code patterns
  lines.forEach((line, idx) => {
    const lineNum = idx + 1;
    if (/return\s+.*;/.test(line)) {
      // Check if there's code after return on same line
      const afterReturn = line.split("return")[1];
      if (afterReturn && afterReturn.includes(";") && afterReturn.split(";").length > 1) {
        const after = afterReturn.split(";")[1]?.trim();
        if (after && !after.startsWith("//")) {
          findings.push({
            line: lineNum,
            severity: "warning",
            issue: "Code after return statement is unreachable.",
          });
        }
      }
    }
  });

  // 7. TypeScript-specific: any type usage (not good but not error)
  if (language === "typescript" || language === "tsx") {
    lines.forEach((line, idx) => {
      const lineNum = idx + 1;
      if (/:\s*any\b/.test(line) && !line.trimStart().startsWith("//")) {
        findings.push({
          line: lineNum,
          severity: "suggestion",
          issue: "Use of 'any' type disables type checking. Define specific type instead.",
        });
      }
    });
  }

  // 8. Check for magic numbers (hardcoded numbers that should be constants)
  lines.forEach((line, idx) => {
    const lineNum = idx + 1;
    // Detect patterns like = 100, > 50, === 3, etc.
    if (/[=<>!]=?\s*-?\d{2,}|[^a-zA-Z0-9_]-\d{2,}[^a-zA-Z0-9_]/.test(line) && !line.includes("//")) {
      // Avoid common cases like line numbers in logs or version
      if (!line.includes("version") && !line.includes("port") && !line.includes("timeout")) {
        findings.push({
          line: lineNum,
          severity: "improvement",
          issue:
            "Magic number detected. Extract to named constant for clarity and maintainability.",
        });
      }
    }
  });

  // 9. Check for deeply nested conditionals (3+ levels)
  const nestedConditionalLines: Set<number> = new Set();
  lines.forEach((line, idx) => {
    const depth = (line.match(/(\{|\()/g) || []).length - (line.match(/(\}|\))/g) || []).length;
    if (depth > 3) {
      nestedConditionalLines.add(idx + 1);
    }
  });
  nestedConditionalLines.forEach((lineNum) => {
    findings.push({
      line: lineNum,
      severity: "improvement",
      issue: "Deeply nested code (3+ levels). Consider extracting to separate functions for readability.",
    });
  });

  // 10. Check for long functions (50+ lines in a single function)
  let currentFunctionStart = -1;
  let currentFunctionLines = 0;
  let braceDepth = 0;
  lines.forEach((line, idx) => {
    const lineNum = idx + 1;
    braceDepth += (line.match(/\{/g) || []).length;
    braceDepth -= (line.match(/\}/g) || []).length;

    if (
      /function\s+\w+\s*\(|const\s+\w+\s*=\s*\(|=>\s*\{/.test(line) &&
      line.includes("{")
    ) {
      currentFunctionStart = lineNum;
      currentFunctionLines = 0;
    }

    if (currentFunctionStart > 0) {
      currentFunctionLines++;
      if (currentFunctionLines > 50 && braceDepth === 0) {
        findings.push({
          line: currentFunctionStart,
          severity: "improvement",
          issue:
            "Function is quite long (50+ lines). Consider breaking it into smaller, focused functions.",
        });
        currentFunctionStart = -1;
      }
    }
  });

  // 11. Check for duplicate similar code patterns
  const codeSignatures = new Map<string, number[]>();
  lines.forEach((line, idx) => {
    const sig = line.trim().slice(0, 30); // Use first 30 chars as signature
    if (sig.length > 15 && !line.trim().startsWith("//")) {
      if (!codeSignatures.has(sig)) {
        codeSignatures.set(sig, []);
      }
      codeSignatures.get(sig)!.push(idx + 1);
    }
  });
  codeSignatures.forEach((lineNumbers) => {
    if (lineNumbers.length > 2) {
      findings.push({
        line: lineNumbers[0],
        severity: "improvement",
        issue: `Similar code pattern repeated ${lineNumbers.length} times. Consider extracting to a shared function.`,
      });
    }
  });

  return findings;
}

/**
 * Check for security vulnerabilities
 */
export async function checkSecurity(
  file: string,
  code: string,
  language: Language
): Promise<ToolFinding[]> {
  const findings: ToolFinding[] = [];
  const lines = code.split("\n");

  // 1. Check for dangerouslySetInnerHTML (React)
  lines.forEach((line, idx) => {
    const lineNum = idx + 1;
    if (/dangerouslySetInnerHTML/.test(line)) {
      findings.push({
        line: lineNum,
        severity: "error",
        issue:
          "dangerouslySetInnerHTML can lead to XSS attacks. Sanitize user input with DOMPurify or similar.",
      });
    }
  });

  // 2. Check for eval usage
  lines.forEach((line, idx) => {
    const lineNum = idx + 1;
    if (/\beval\s*\(/.test(line)) {
      findings.push({
        line: lineNum,
        severity: "error",
        issue: "eval() is a security hazard and performance killer. Use JSON.parse() or alternatives.",
      });
    }
  });

  // 3. Check for hardcoded credentials/secrets
  lines.forEach((line, idx) => {
    const lineNum = idx + 1;
    if (
      /(api[_-]?key|password|secret|token)\s*[=:]\s*["'][^"']*["']/i.test(line) &&
      !line.includes("PLACEHOLDER") &&
      !line.includes("example")
    ) {
      findings.push({
        line: lineNum,
        severity: "error",
        issue:
          "Potential hardcoded secret/credential detected. Move to environment variables.",
      });
    }
  });

  // 4. Check for innerHTML assignment (XSS)
  lines.forEach((line, idx) => {
    const lineNum = idx + 1;
    if (/\.innerHTML\s*=/.test(line)) {
      findings.push({
        line: lineNum,
        severity: "warning",
        issue:
          "Setting innerHTML can lead to XSS vulnerabilities. Use textContent or sanitized data.",
      });
    }
  });

  // 5. Check for SQL injection patterns (string concatenation in queries)
  lines.forEach((line, idx) => {
    const lineNum = idx + 1;
    if (/query\s*=\s*["'`].*\+/.test(line) || /sql\s*=\s*["'`].*\+/.test(line)) {
      findings.push({
        line: lineNum,
        severity: "error",
        issue: "Potential SQL injection: use parameterized queries instead of string concatenation.",
      });
    }
  });

  // 6. Check for missing input validation
  lines.forEach((line, idx) => {
    const lineNum = idx + 1;
    if (
      /fetch\s*\(|axios\s*\(|request\s*\(/.test(line) &&
      !code.slice(Math.max(0, idx * 80 - 500), idx * 80).includes("validate|schema|joi|zod")
    ) {
      // This is a heuristic - just warn about external calls
      if (
        code
          .slice(Math.max(0, idx * 80 - 500), idx * 80)
          .includes("user") ||
        code.slice(Math.max(0, idx * 80 - 500), idx * 80).includes("body")
      ) {
        findings.push({
          line: lineNum,
          severity: "warning",
          issue: "Ensure user input is validated before processing API requests.",
        });
      }
    }
  });

  // 7. Check for insecure randomness
  lines.forEach((line, idx) => {
    const lineNum = idx + 1;
    if (/Math\.random\(\)/.test(line)) {
      findings.push({
        line: lineNum,
        severity: "warning",
        issue: "Math.random() is not cryptographically secure. Use crypto.getRandomValues().",
      });
    }
  });

  return findings;
}

/**
 * Check for performance issues
 */
export async function checkPerformance(
  file: string,
  code: string,
  language: Language
): Promise<ToolFinding[]> {
  const findings: ToolFinding[] = [];
  const lines = code.split("\n");

  // 1. Check for missing React.memo or useMemo
  if ((language === "jsx" || language === "tsx") && /function\s+\w+\(.*\)\s*\{/.test(code)) {
    lines.forEach((line, idx) => {
      const lineNum = idx + 1;
      if (
        /return\s+<.*map\(.*=>.*<.*\/>/.test(line) &&
        !code.includes("useMemo") &&
        !code.includes("memo")
      ) {
        findings.push({
          line: lineNum,
          severity: "suggestion",
          issue:
            "Rendering list without memoization may cause unnecessary re-renders. Use useMemo or React.memo.",
        });
      }
    });
  }

  // 2. Check for missing useEffect dependencies
  lines.forEach((line, idx) => {
    const lineNum = idx + 1;
    if (/useEffect\(\s*\(\)\s*=>|useEffect\(\s*function/.test(line)) {
      const nextLine = lines[idx + 1] || "";
      if (!nextLine.includes("[]") && !nextLine.includes("[")) {
        findings.push({
          line: lineNum,
          severity: "warning",
          issue:
            "useEffect missing or has incorrect dependency array. Add dependencies as second argument.",
        });
      }
    }
  });

  // 3. Check for N+1 query patterns
  lines.forEach((line, idx) => {
    const lineNum = idx + 1;
    if (/\.map\(\s*.*=>.*query|\.forEach\(\s*.*=>.*query|for\s*\(.*query/.test(line)) {
      findings.push({
        line: lineNum,
        severity: "warning",
        issue:
          "Possible N+1 query pattern detected. Use batch queries or joins instead of looping queries.",
      });
    }
  });

  // 4. Check for synchronous operations in main thread
  lines.forEach((line, idx) => {
    const lineNum = idx + 1;
    if (
      /JSON\.stringify|JSON\.parse/.test(line) &&
      code.includes("large|huge|massive|bigdata") === false
    ) {
      // Only flag if it looks like it might be large
      if (/stringify\(.*for|parse\(.*\.split/.test(code.slice(idx * 80, (idx + 1) * 80))) {
        findings.push({
          line: lineNum,
          severity: "suggestion",
          issue:
            "Large synchronous JSON operations can block the event loop. Consider streaming or web workers.",
        });
      }
    }
  });

  // 5. Check for inefficient selectors (React, Vue, etc.)
  lines.forEach((line, idx) => {
    const lineNum = idx + 1;
    if (
      /document\.querySelectorAll\(|document\.getElementsBy|jQuery\(/.test(
        line
      )
    ) {
      findings.push({
        line: lineNum,
        severity: "suggestion",
        issue:
          "DOM queries in loops or repeatedly called functions hurt performance. Cache selectors.",
      });
    }
  });

  // 6. Check for memory leaks: event listeners without cleanup
  if (code.includes("addEventListener")) {
    lines.forEach((line, idx) => {
      const lineNum = idx + 1;
      if (/addEventListener\(/.test(line)) {
        // Check if there's a corresponding removeEventListener
        const hasRemoval = code.includes("removeEventListener");
        if (!hasRemoval) {
          findings.push({
            line: lineNum,
            severity: "warning",
            issue:
              "Event listener registered without removal. Add cleanup in useEffect/componentWillUnmount to prevent memory leaks.",
          });
        }
      }
    });
  }

  return findings;
}

/**
 * Check TypeScript/type safety issues
 */
export async function checkTypes(
  file: string,
  code: string,
  language: Language
): Promise<ToolFinding[]> {
  const findings: ToolFinding[] = [];

  // Only analyze if TypeScript file
  if (language !== "typescript" && language !== "tsx") {
    return findings;
  }

  const lines = code.split("\n");

  // 1. Check for non-null assertions (!)
  lines.forEach((line, idx) => {
    const lineNum = idx + 1;
    if (/\w+![\s\.\[\(]/.test(line)) {
      findings.push({
        line: lineNum,
        severity: "warning",
        issue:
          "Non-null assertion used. Avoid ! operator - handle potential null/undefined properly.",
      });
    }
  });

  // 2. Check for implicit any
  lines.forEach((line, idx) => {
    const lineNum = idx + 1;
    if (
      /function\s+\w+\([^)]*\w+(?:\s|,|\))/.test(line) &&
      !line.includes(":") &&
      !line.includes("=>")
    ) {
      findings.push({
        line: lineNum,
        severity: "suggestion",
        issue: "Function parameter missing type annotation. Add explicit type.",
      });
    }
  });

  // 3. Check for type assertions that might hide issues
  lines.forEach((line, idx) => {
    const lineNum = idx + 1;
    if (/as\s+(any|unknown|string|number|boolean)[\s\);,]/.test(line)) {
      findings.push({
        line: lineNum,
        severity: "warning",
        issue: "Type assertion 'as' used. Prefer proper type checking over assertions.",
      });
    }
  });

  // 4. Check for loose equality in typed code
  lines.forEach((line, idx) => {
    const lineNum = idx + 1;
    if (/[^=!<>]==[^=]|[^=!]==[^=]/.test(line)) {
      findings.push({
        line: lineNum,
        severity: "warning",
        issue: "Use strict equality (===) instead of loose equality (==) in TypeScript.",
      });
    }
  });

  // 5. Check for missing return type on functions
  lines.forEach((line, idx) => {
    const lineNum = idx + 1;
    if (
      /function\s+\w+\s*\([^)]*\)\s*\{|=>\s*\{/.test(line) &&
      !line.includes(":") &&
      !code.slice(Math.max(0, idx * 80 - 50), idx * 80).includes("//")
    ) {
      findings.push({
        line: lineNum,
        severity: "suggestion",
        issue: "Function missing return type annotation. Add explicit return type for clarity.",
      });
    }
  });

  // 6. Check for optional chaining on optional properties
  lines.forEach((line, idx) => {
    const lineNum = idx + 1;
    if (/\?\.\w+\?\./.test(line)) {
      findings.push({
        line: lineNum,
        severity: "suggestion",
        issue:
          "Chained optional access - ensure you're actually handling all possible undefined paths.",
      });
    }
  });

  // 7. Check for index access on arrays/objects without type guard
  lines.forEach((line, idx) => {
    const lineNum = idx + 1;
    if (/\[\s*["'`]*\w+["'`]*\s*\][\.\[]/.test(line) && !line.includes("?")) {
      findings.push({
        line: lineNum,
        severity: "suggestion",
        issue:
          "Index access to object/array without optional chaining check. Consider using ?. or type guard.",
      });
    }
  });

  return findings;
}
