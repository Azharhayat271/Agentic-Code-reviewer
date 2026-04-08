import { NextRequest, NextResponse } from "next/server";
import { fetchPRFiles, fetchPRTitle, fetchPRDetails, parsePRUrl } from "@/lib/github";
import { orchestrateCodeReview, FileToAnalyze } from "@/lib/agentOrchestrator";
import { parseDiffPatch } from "@/lib/diffParser";

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

    // Parse diffs to extract only changed code (Phase 3: Restrict to changed lines)
    // Instead of analyzing the entire file, we only analyze the actual changes
    console.log("[analyze] Parsing diffs to identify changed lines...");
    
    const filesToAnalyze: FileToAnalyze[] = [];
    
    for (const file of relevantFiles) {
      if (!file.patch) continue;
      
      let language: "typescript" | "javascript" | "jsx" | "tsx" = "javascript";
      if (file.filename.endsWith(".tsx")) language = "tsx";
      else if (file.filename.endsWith(".ts")) language = "typescript";
      else if (file.filename.endsWith(".jsx")) language = "jsx";

      // Parse the unified diff to extract changed sections
      const diffSections = parseDiffPatch(file.patch);

      if (diffSections.length === 0) {
        console.warn(`[analyze] ${file.filename}: No changed code sections found in patch`);
        continue;
      }

      filesToAnalyze.push({
        filename: file.filename,
        patch: file.patch,
        diffSections, // Only analyze the changed sections
        language,
      });
    }

    console.log("[analyze] Prepared", filesToAnalyze.length, "files for analysis with diff parsing");
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
