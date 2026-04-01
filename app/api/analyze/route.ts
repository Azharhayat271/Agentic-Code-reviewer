import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { fetchPRFiles, fetchPRTitle, parsePRUrl } from "@/lib/github";
import { ReviewComment } from "@/types";

const REVIEW_PROMPT = `You are an expert code reviewer. Analyze the following GitHub PR diff and return a JSON array of review comments.

COMMENT FORMAT
Every comment must be an object within the JSON array, strictly following this schema:
{ "file": "<filename>", "line": <line_number>, "severity": "error" | "warning" | "suggestion", "comment": "<Specific actionable feedback in 1-2 sentences>" }

SEVERITY LEVELS & CRITERIA

1. ERROR (Critical Issues) — Flag these immediately. Code-breaking or highly dangerous issues.
- Runtime errors (e.g., null/undefined property access without optional chaining or checks)
- Type mismatches that break execution
- Security vulnerabilities (e.g., XSS, SQLi, exposing secrets)
- Logic errors resulting in data loss, unreachable code, or infinite loops
- Unhandled exceptions or async/await errors
- Missing required error handling

2. WARNING (Code Quality & Potential Bugs) — Flag potential problems under specific conditions.
- Unhandled promise rejections (missing .catch())
- Performance bottlenecks (e.g., N+1 queries, heavy synchronous operations)
- Deprecated API usage
- Race conditions or timing issues
- Missing React useEffect dependencies
- Type confusion (e.g., accidental string concatenation instead of addition)

3. SUGGESTION (Improvements) — Flag objective, high-value improvements only.
- React performance optimization (e.g., missing useMemo or React.memo where highly applicable)
- Refactoring to eliminate significant code duplication
- Simplifying overly complex logic

WHAT NOT TO FLAG (STRICTLY IGNORE)
- Formatting, spacing, or indentation
- Personal stylistic preferences (e.g., const vs let if not breaking)
- Framework stylistic choices (e.g., standard React className usage)
- Variable/Function naming conventions

COMMENT GUIDELINES
- DO be specific: reference the exact variable/function causing the issue
- DO explain the impact: "will throw TypeError", "causes re-render on every keystroke"
- DO suggest a fix: "use optional chaining: user?.email"
- DO keep it concise: 1-2 sentences maximum
- DON'T use personal pronouns or opinions
- DON'T write vague comments like "Something looks wrong here"
- DON'T flag style issues

Only comment on changed lines (lines starting with +). Use the + line numbers for the "line" field.

RESPONSE FORMAT
Output ONLY a valid JSON array. Do not wrap in markdown code blocks.

PR Diffs:
`;

export async function POST(req: NextRequest) {
  try {
    const openaiKey = process.env.OPENAI_API_KEY;
    const githubToken = process.env.GH_PAT_TOKEN;

    console.log("[analyze] Env check:", {
      hasOpenAI: !!openaiKey,
      hasGithub: !!githubToken,
      githubTokenPrefix: githubToken?.substring(0, 7),
    });

    if (!openaiKey || !githubToken) {
      return NextResponse.json(
        { error: "Server misconfiguration: missing API keys in environment." },
        { status: 500 }
      );
    }

    const { prUrl } = await req.json();

    if (!prUrl) {
      return NextResponse.json({ error: "PR URL is required" }, { status: 400 });
    }

    const prInfo = parsePRUrl(prUrl);
    if (!prInfo) {
      return NextResponse.json({ error: "Invalid GitHub PR URL" }, { status: 400 });
    }

    const [files, prTitle] = await Promise.all([
      fetchPRFiles(githubToken, prInfo),
      fetchPRTitle(githubToken, prInfo),
    ]);

    const relevantFiles = files.filter(
      (f) => f.patch && /\.(js|jsx|ts|tsx|mjs|cjs)$/.test(f.filename)
    );

    if (relevantFiles.length === 0) {
      return NextResponse.json({
        comments: [],
        prTitle,
        prUrl,
        message: "No JavaScript/TypeScript files with changes found.",
      });
    }

    const diffContent = relevantFiles
      .map((f) => `### File: ${f.filename}\n\`\`\`diff\n${f.patch}\n\`\`\``)
      .join("\n\n");

    const openai = new OpenAI({ apiKey: openaiKey });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are an expert code reviewer. Return only valid JSON arrays with no markdown formatting.",
        },
        {
          role: "user",
          content: REVIEW_PROMPT + diffContent,
        },
      ],
      temperature: 0.3,
    });

    const text = (completion.choices[0]?.message?.content ?? "").trim();

    let comments: ReviewComment[] = [];
    try {
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        comments = JSON.parse(jsonMatch[0]);
      }
    } catch {
      return NextResponse.json({ error: "Failed to parse Gemini response" }, { status: 500 });
    }

    return NextResponse.json({ comments, prTitle, prUrl });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[analyze] Error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
