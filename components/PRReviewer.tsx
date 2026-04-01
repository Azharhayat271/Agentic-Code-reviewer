"use client";

import { useState, useEffect } from "react";
import { ReviewComment, ReviewResult, Severity } from "@/types";
import { getStoredToken } from "@/lib/encryption";
import TokenManager from "@/components/TokenManager";

const SEVERITY_COLORS: Record<
  Severity,
  { badge: string; icon: string; label: string; bg: string }
> = {
  error: {
    badge: "bg-red-500/20 text-red-300 border-red-500/30",
    icon: "⚠️",
    label: "Error",
    bg: "bg-red-500/5",
  },
  warning: {
    badge: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
    icon: "⚡",
    label: "Warning",
    bg: "bg-yellow-500/5",
  },
  suggestion: {
    badge: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    icon: "💡",
    label: "Suggestion",
    bg: "bg-blue-500/5",
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
    <div className="card-glass rounded-xl p-6 flex flex-col items-center gap-3 min-w-[140px]">
      <span className="text-3xl">{icon}</span>
      <span className="text-4xl font-bold font-manrope">{count}</span>
      <span className="text-xs text-zinc-400 font-inter uppercase tracking-wide">
        {label}
      </span>
    </div>
  );
}

function CommentCard({ comment }: { comment: ReviewComment }) {
  const [copied, setCopied] = useState(false);
  const style = SEVERITY_COLORS[comment.severity];

  const handleCopy = () => {
    const text = `**${comment.file}:${comment.line}** [${comment.severity}]\n${comment.comment}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={`card-glass rounded-xl p-5 flex flex-col gap-3 border-l-4 transition-all ${style.bg} border-l-red-500/50 hover:border-l-red-500`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-mono text-sm font-semibold text-white">
              {comment.file}
            </span>
            <span className="text-zinc-500 text-sm font-inter">
              :{comment.line}
            </span>
          </div>
          <p className="text-sm text-zinc-300 leading-relaxed font-inter">
            {comment.comment}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span
            className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${style.badge} font-inter`}
          >
            {style.icon} {style.label}
          </span>
          <button
            onClick={handleCopy}
            className="text-xs px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-all font-inter font-medium whitespace-nowrap"
          >
            {copied ? "✓ Copied" : "Copy"}
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
      }
    : null;

  return (
    <div className="min-h-screen bg-black font-inter relative overflow-hidden selection-red">
      {/* Background Effects */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-[#1a0505] to-black"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-red-600/5 rounded-full blur-[120px]"></div>
        <div className="absolute inset-0 grid-bg [mask-image:radial-gradient(circle_at_center,black_40%,transparent_80%)]"></div>
      </div>

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="border-b border-white/5 bg-black/40 backdrop-blur-xl sticky top-0 z-40">
          <div className="max-w-4xl mx-auto px-4 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-red-600 to-red-400 rounded-lg transform -rotate-45 flex items-center justify-center">
                  <span className="text-white font-bold text-sm">◆</span>
                </div>
                <div>
                  <h1 className="text-2xl font-bold font-manrope text-white">
                    Agentic Code Reviewer
                  </h1>
                  <p className="text-xs text-zinc-500 font-inter">
                    AI-Powered PR Analysis
                  </p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-4xl mx-auto w-full px-4 py-12 flex-1">
          {/* Token Manager */}
          <TokenManager onTokenChange={handleTokenChange} />

          {/* Input Form */}
          <div className="card-glass rounded-xl p-8 mb-8 animate-fade-up">
            <div className="mb-6">
              <label className="block text-sm font-semibold text-white mb-3 font-inter">
                🔗 Pull Request URL
              </label>
              <div className="relative">
                <input
                  type="url"
                  value={prUrl}
                  onChange={(e) => setPrUrl(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleAnalyze()}
                  placeholder="https://github.com/owner/repo/pull/123"
                  className="w-full bg-zinc-900/50 border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-red-500 transition-colors font-inter placeholder:text-zinc-600"
                />
              </div>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-300 font-inter">
                <span className="font-semibold">⚠️ Error:</span> {error}
              </div>
            )}

            <button
              onClick={handleAnalyze}
              disabled={loading || !prUrl}
              className="shiny-cta w-full group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="relative z-10 flex items-center justify-center gap-2 text-white font-semibold font-inter">
                {loading ? (
                  <>
                    <span className="inline-block animate-spin">⚙️</span>
                    Analyzing PR...
                  </>
                ) : (
                  <>
                    Analyze Pull Request
                    <span className="transition-transform group-hover:translate-x-1">
                      →
                    </span>
                  </>
                )}
              </span>
            </button>
          </div>

          {/* Results */}
          {result && (
            <div className="space-y-8 animate-fade-up">
              {/* PR Info */}
              <div className="card-glass rounded-xl p-6">
                <h2 className="text-xl font-semibold text-white mb-2 font-manrope">
                  {result.prTitle}
                </h2>
                <a
                  href={result.prUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-red-400 hover:text-red-300 transition-colors font-inter"
                >
                  {result.prUrl} ↗️
                </a>
              </div>

              {/* Summary Stats */}
              {counts && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <SummaryCard label="Total Issues" count={counts.total} icon="📊" />
                  <SummaryCard label="Errors" count={counts.error} icon="🔴" />
                  <SummaryCard label="Warnings" count={counts.warning} icon="🟡" />
                  <SummaryCard label="Suggestions" count={counts.suggestion} icon="🔵" />
                </div>
              )}

              {/* Filter Buttons */}
              <div className="flex flex-wrap gap-2">
                <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wide font-inter self-center">
                  Filter:
                </span>
                <button
                  onClick={() => setFilter("all")}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all font-inter ${
                    filter === "all"
                      ? "bg-red-500/30 text-red-300 border border-red-500/50 card-glass-accent"
                      : "card-glass"
                  }`}
                >
                  All ({result.comments.length})
                </button>
                <button
                  onClick={() => setFilter("error")}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all font-inter ${
                    filter === "error"
                      ? "bg-red-500/30 text-red-300 border border-red-500/50 card-glass-accent"
                      : "card-glass"
                  }`}
                >
                  Errors (
                  {result.comments.filter((c) => c.severity === "error").length})
                </button>
                <button
                  onClick={() => setFilter("warning")}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all font-inter ${
                    filter === "warning"
                      ? "bg-yellow-500/30 text-yellow-300 border border-yellow-500/50"
                      : "card-glass"
                  }`}
                >
                  Warnings (
                  {result.comments.filter((c) => c.severity === "warning").length})
                </button>
                <button
                  onClick={() => setFilter("suggestion")}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all font-inter ${
                    filter === "suggestion"
                      ? "bg-blue-500/30 text-blue-300 border border-blue-500/50"
                      : "card-glass"
                  }`}
                >
                  Suggestions (
                  {
                    result.comments.filter((c) => c.severity === "suggestion")
                      .length
                  }
                  )
                </button>
              </div>

              {/* Comments */}
              <div className="space-y-4">
                {filtered.length === 0 ? (
                  <div className="card-glass rounded-xl p-12 text-center">
                    <span className="text-4xl mb-4 block">🎉</span>
                    <p className="text-zinc-400 font-inter">
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
        <footer className="border-t border-white/5 bg-black/40 backdrop-blur-xl mt-12">
          <div className="max-w-4xl mx-auto px-4 py-8 text-center text-xs text-zinc-500 font-inter">
            <p>
              Powered by GPT-4o with Advanced Code Analysis • Token encrypted &
              stored locally
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
