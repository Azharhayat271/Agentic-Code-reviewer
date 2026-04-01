import { NextRequest, NextResponse } from "next/server";
import { fetchPRFiles, fetchPRTitle, fetchPRDetails, fetchFileContent, parsePRUrl } from "@/lib/github";
import { orchestrateCodeReview, FileToAnalyze } from "@/lib/agentOrchestrator";

export async function POST(req: NextRequest) {
  try {
    const openaiKey = process.env.OPENAI_API_KEY;
    
    // Get GitHub token from request header (from user) or fallback to env var (for backward compatibility)
    const headerToken = req.headers.get("X-GitHub-Token");
    const githubToken = headerToken || process.env.GH_PAT_TOKEN;

    console.log("[analyze] Env check:", {
      hasOpenAI: !!openaiKey,
      hasGithub: !!githubToken,
      tokenSource: headerToken ? "header" : "environment",
      githubTokenPrefix: githubToken?.substring(0, 7),
    });

    if (!openaiKey) {
      return NextResponse.json(
        { error: "Server misconfiguration: missing OpenAI API key." },
        { status: 500 }
      );
    }

    if (!githubToken) {
      return NextResponse.json(
        { error: "GitHub token is required. Please provide your GitHub token in the UI." },
        { status: 400 }
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

    const [files, prDetails] = await Promise.all([
      fetchPRFiles(githubToken, prInfo),
      fetchPRDetails(githubToken, prInfo),
    ]);
    const { title: prTitle, headSha } = prDetails;

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

    console.log("[analyze] Found", relevantFiles.length, "relevant files");

    // Fetch full file content for better LLM context (Phase 2)
    // For each changed file, we fetch the HEAD version for context
    console.log("[analyze] Fetching full file content for LLM analysis...");
    
    const filesToAnalyze: FileToAnalyze[] = [];
    
    for (const file of relevantFiles) {
      if (!file.patch) continue;
      
      let language: "typescript" | "javascript" | "jsx" | "tsx" = "javascript";
      if (file.filename.endsWith(".tsx")) language = "tsx";
      else if (file.filename.endsWith(".ts")) language = "typescript";
      else if (file.filename.endsWith(".jsx")) language = "jsx";

      let fullContent = file.patch; // Fallback to patch if full fetch fails
      
      try {
        // Try to fetch full file content from the PR's HEAD
        fullContent = await fetchFileContent(
          githubToken,
          prInfo.owner,
          prInfo.repo,
          file.filename,
          headSha
        );
      } catch (error) {
        // If fetch fails, fall back to patch
        console.warn(`[analyze] Could not fetch full content for ${file.filename}, using patch`);
      }

      filesToAnalyze.push({
        filename: file.filename,
        patch: file.patch,
        content: fullContent, // Full file content for richer LLM analysis
        language,
      });
    }

    console.log("[analyze] Prepared", filesToAnalyze.length, "files for analysis");
    console.log("[analyze] Starting agent orchestration...");

    // Run the agentic code review
    const agentResult = await orchestrateCodeReview(filesToAnalyze, openaiKey);

    console.log("[analyze] Agent completed. Found", agentResult.findings.length, "issues");

    return NextResponse.json({
      comments: agentResult.findings,
      prTitle,
      prUrl,
      summary: agentResult.summary,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[analyze] Error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
