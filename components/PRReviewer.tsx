"use client";

import { useState, useEffect } from "react";
import { ReviewComment, ReviewResult, Severity } from "@/types";
import { getStoredToken } from "@/lib/encryption";
import TokenManager from "@/components/TokenManager";

const SEVERITY_COLORS: Record<
  Severity,
  { badge: string; icon: string; label: string }
> = {
  error: {
    badge: "bg-red-500/10 text-red-300 border-red-500/20",
    icon: "⚠️",
    label: "Error",
  },
  warning: {
    badge: "bg-yellow-500/10 text-yellow-300 border-yellow-500/20",
    icon: "⚡",
    label: "Warning",
  },
  suggestion: {
    badge: "bg-blue-500/10 text-blue-300 border-blue-500/20",
    icon: "💡",
    label: "Suggestion",
  },
  improvement: {
    badge: "bg-green-500/10 text-green-300 border-green-500/20",
    icon: "✨",
    label: "Improvement",
  },
};

function SummaryCard({
  label,
  count,
  icon,
}: {
  label: string;
  count: number;
  icon: string;
}) {
  return (
    <div className="card-glass rounded-2xl p-8 flex flex-col items-center gap-3 hover:bg-[#161616] transition-all duration-300">
      <span className="text-4xl opacity-80">{icon}</span>
      <span className="text-5xl font-bold font-satoshi tracking-tight">{count}</span>
      <span className="text-[10px] text-[#666666] font-inter uppercase tracking-[0.2em] font-bold">
        {label}
      </span>
    </div>
  );
}

function CommentCard({ comment }: { comment: ReviewComment }) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const style = SEVERITY_COLORS[comment.severity];

  const handleCopy = () => {
    const text = `**${comment.file}:${comment.line}** [${comment.severity}]\n${comment.comment}${
      comment.reasoning ? `\n\nReasoning: ${comment.reasoning}` : ""
    }${comment.suggestedFix ? `\n\nSuggested Fix: ${comment.suggestedFix}` : ""}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const hasDetails = comment.reasoning || comment.suggestedFix;

  return (
    <div className="card-glass rounded-2xl p-6 flex flex-col gap-4 hover:bg-[#161616] transition-all duration-300 group">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <span className="font-mono text-sm font-semibold text-white">
              {comment.file}
            </span>
            <span className="text-[#666666] text-xs font-inter">
              :{comment.line}
            </span>
            {comment.confidence !== undefined && (
              <span className="text-[#888888] text-xs font-inter">
                ({Math.round(comment.confidence * 100)}% confidence)
              </span>
            )}
          </div>
          <p className="text-sm text-[#888888] leading-relaxed font-inter">
            {comment.comment}
          </p>

          {/* Expandable details section */}
          {hasDetails && expanded && (
            <div className="mt-4 pt-4 border-t border-[#333333] space-y-3">
              {comment.reasoning && (
                <div>
                  <p className="text-xs font-bold text-[#FF6B50] uppercase tracking-wider mb-2">
                    Why This Matters
                  </p>
                  <p className="text-sm text-[#999999] leading-relaxed font-inter">
                    {comment.reasoning}
                  </p>
                </div>
              )}
              {comment.suggestedFix && (
                <div>
                  <p className="text-xs font-bold text-[#4FC3F7] uppercase tracking-wider mb-2">
                    Suggested Fix
                  </p>
                  <p className="text-sm text-[#999999] leading-relaxed font-inter whitespace-pre-wrap">
                    {comment.suggestedFix}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span
            className={`text-[10px] font-bold px-3 py-1.5 rounded-full border ${style.badge} font-inter uppercase tracking-wider`}
          >
            {style.icon} {style.label}
          </span>
          {hasDetails && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-2.5 rounded-lg bg-[#1a1a1a] hover:bg-white hover:text-black border border-[#333333] transition-all duration-300"
              title={expanded ? "Hide details" : "Show details"}
            >
              <span className="text-base">{expanded ? "△" : "▽"}</span>
            </button>
          )}
          <button
            onClick={handleCopy}
            className="p-2.5 rounded-lg bg-[#1a1a1a] hover:bg-white hover:text-black border border-[#333333] transition-all duration-300"
            title="Copy comment"
          >
            <span className="text-base">{copied ? "✓" : "📋"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PRReviewer() {
  const [prUrl, setPrUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ReviewResult | null>(null);
  const [filter, setFilter] = useState<"all" | Severity>("all");
  const [currentToken, setCurrentToken] = useState<string | null>(null);

  useEffect(() => {
    const token = getStoredToken();
    setCurrentToken(token);
  }, []);

  const handleTokenChange = (token: string | null) => {
    setCurrentToken(token);
  };

  const handleAnalyze = async () => {
    setError("");
    setResult(null);

    if (!currentToken) {
      setError(
        "GitHub token is required. Please add your token using the Token Manager above."
      );
      return;
    }

    if (!prUrl.trim()) {
      setError("Please enter a valid GitHub PR URL");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-GitHub-Token": currentToken,
        },
        body: JSON.stringify({ prUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysis failed");
      setResult(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const filtered =
    result?.comments.filter(
      (c) => filter === "all" || c.severity === filter
    ) ?? [];

  const counts = result
    ? {
        total: result.comments.length,
        error: result.comments.filter((c) => c.severity === "error").length,
        warning: result.comments.filter((c) => c.severity === "warning").length,
        suggestion: result.comments.filter((c) => c.severity === "suggestion")
          .length,
        improvement: result.comments.filter((c) => c.severity === "improvement")
          .length,
      }
    : null;

  return (
    <div className="min-h-screen bg-[#050505] font-satoshi relative overflow-hidden selection-coral">
      {/* Background Effects */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#1a1a1a_0%,_#050505_70%)] opacity-60"></div>
      </div>

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Top Navigation */}
        <nav className="fixed top-0 left-0 right-0 z-[100] px-6 py-6 flex items-center justify-between text-sm font-medium tracking-tight">
          <div className="flex items-center gap-10">
            <a href="/" className="flex items-center group">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-black font-extrabold text-xl transition-transform group-hover:rotate-12">
                PR
              </div>
            </a>
            <div className="hidden lg:flex items-center gap-8 text-[#888888]">
              <span className="text-white font-semibold">Code Reviewer</span>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <header className="relative pt-32 pb-20 px-6 md:px-12">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-2 h-2 rounded-full bg-[#FF6B50] animate-pulse"></div>
              <span className="text-[10px] font-bold tracking-[0.3em] text-[#666666] uppercase">
                AI-Powered Code Analysis
              </span>
            </div>
            <h1 className="text-6xl md:text-8xl font-bold leading-[0.95] tracking-tighter text-white mb-6">
              Review PRs<br />
              <span className="text-[#666666]">with AI</span>
            </h1>
            <p className="text-lg text-[#888888] max-w-2xl font-inter">
              Automated code review powered by GPT-4o. Get instant feedback on pull requests with intelligent analysis.
            </p>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-6xl mx-auto w-full px-6 md:px-12 pb-20">
          {/* Token Manager */}
          <div className="mb-12">
            <TokenManager onTokenChange={handleTokenChange} />
          </div>

          {/* Input Form */}
          <div className="card-glass rounded-[2.5rem] p-10 mb-12 animate-fade-up">
            <div className="mb-8">
              <label className="block text-xs font-bold tracking-[0.2em] uppercase text-[#666666] mb-4 font-inter">
                Pull Request URL
              </label>
              <div className="relative">
                <input
                  type="url"
                  value={prUrl}
                  onChange={(e) => setPrUrl(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleAnalyze()}
                  placeholder="https://github.com/owner/repo/pull/123"
                  className="w-full bg-[#0a0a0a] border border-[#333333] rounded-xl px-6 py-4 text-white text-base focus:outline-none focus:border-[#FF6B50] transition-colors font-inter placeholder:text-[#444444]"
                />
              </div>
            </div>

            {error && (
              <div className="mb-8 p-5 bg-red-500/5 border border-red-500/20 rounded-xl text-sm text-red-300 font-inter">
                <span className="font-semibold">⚠️ Error:</span> {error}
              </div>
            )}

            <button
              onClick={handleAnalyze}
              disabled={loading || !prUrl}
              className="btn-accent w-full disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            >
              {loading ? (
                <>
                  <span className="inline-block animate-spin">⚙️</span>
                  Analyzing PR...
                </>
              ) : (
                <>
                  Analyze Pull Request
                  <span className="text-xl">→</span>
                </>
              )}
            </button>
          </div>

          {/* Results */}
          {result && (
            <div className="space-y-12 animate-fade-up">
              {/* PR Info */}
              <div className="card-glass rounded-2xl p-8">
                <h2 className="text-2xl font-semibold text-white mb-3 font-satoshi tracking-tight">
                  {result.prTitle}
                </h2>
                <a
                  href={result.prUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-[#FF6B50] hover:text-white transition-colors font-inter inline-flex items-center gap-2"
                >
                  View on GitHub
                  <span className="text-base">↗</span>
                </a>
              </div>

              {/* Summary Stats */}
              {counts && (
                <div>
                  <div className="flex justify-between items-end mb-8 border-b border-[#222222] pb-6">
                    <h2 className="text-xs font-bold tracking-[0.4em] uppercase text-[#FF6B50]">
                      Analysis Summary
                    </h2>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                    <SummaryCard label="Total Issues" count={counts.total} icon="📊" />
                    <SummaryCard label="Errors" count={counts.error} icon="🔴" />
                    <SummaryCard label="Warnings" count={counts.warning} icon="🟡" />
                    <SummaryCard label="Suggestions" count={counts.suggestion} icon="🔵" />
                    <SummaryCard label="Improvements" count={counts.improvement} icon="✨" />
                  </div>
                </div>
              )}

              {/* Filter Buttons */}
              <div className="flex flex-wrap gap-3">
                <span className="text-[10px] font-bold text-[#666666] uppercase tracking-[0.2em] font-inter self-center">
                  Filter:
                </span>
                {[
                  { key: "all", label: "All", count: result.comments.length },
                  { key: "error", label: "Errors", count: result.comments.filter((c) => c.severity === "error").length },
                  { key: "warning", label: "Warnings", count: result.comments.filter((c) => c.severity === "warning").length },
                  { key: "suggestion", label: "Suggestions", count: result.comments.filter((c) => c.severity === "suggestion").length },
                  { key: "improvement", label: "Improvements", count: result.comments.filter((c) => c.severity === "improvement").length },
                ].map(({ key, label, count }) => (
                  <button
                    key={key}
                    onClick={() => setFilter(key as typeof filter)}
                    className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 font-inter uppercase tracking-wider ${
                      filter === key
                        ? "bg-[#FF6B50] text-black"
                        : "bg-[#1a1a1a] text-[#888888] hover:bg-[#222222] hover:text-white border border-[#333333]"
                    }`}
                  >
                    {label} ({count})
                  </button>
                ))}
              </div>

              {/* Comments */}
              <div className="space-y-4">
                {filtered.length === 0 ? (
                  <div className="card-glass rounded-2xl p-16 text-center">
                    <span className="text-6xl mb-6 block opacity-50">🎉</span>
                    <p className="text-[#666666] font-inter text-lg">
                      No issues found for this filter.
                    </p>
                  </div>
                ) : (
                  filtered.map((c, i) => <CommentCard key={i} comment={c} />)
                )}
              </div>
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="relative pt-20 pb-12 px-6 md:px-12 border-t border-[#1a1a1a] mt-auto">
          <div className="max-w-6xl mx-auto text-center text-[10px] text-[#333333] font-inter font-bold uppercase tracking-widest">
            <p>&copy; 2024 PR Reviewer. Powered by GPT-4o • Token encrypted & stored locally</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
