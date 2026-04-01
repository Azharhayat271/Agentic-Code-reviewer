"use client";

import { useState } from "react";
import { ReviewComment, ReviewResult, Severity } from "@/types";

const SEVERITY_STYLES: Record<Severity, { badge: string; border: string; label: string }> = {
  error: { badge: "bg-red-100 text-red-700 border border-red-200", border: "border-l-red-500", label: "Error" },
  warning: { badge: "bg-yellow-100 text-yellow-700 border border-yellow-200", border: "border-l-yellow-500", label: "Warning" },
  suggestion: { badge: "bg-blue-100 text-blue-700 border border-blue-200", border: "border-l-blue-500", label: "Suggestion" },
};

function SummaryCard({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className={`rounded-xl border ${color} p-4 flex flex-col items-center gap-1 min-w-[100px]`}>
      <span className="text-2xl font-bold">{count}</span>
      <span className="text-sm text-gray-500">{label}</span>
    </div>
  );
}

function CommentCard({ comment }: { comment: ReviewComment }) {
  const [copied, setCopied] = useState(false);
  const style = SEVERITY_STYLES[comment.severity];

  const handleCopy = () => {
    const text = `**${comment.file}:${comment.line}** [${comment.severity}]\n${comment.comment}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className={`bg-white rounded-xl border border-gray-200 border-l-4 ${style.border} p-4 flex flex-col gap-2 shadow-sm`}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm text-gray-700 font-medium">{comment.file}</span>
          <span className="text-gray-400 text-sm">:{comment.line}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${style.badge}`}>
            {style.label}
          </span>
          <button
            onClick={handleCopy}
            className="text-xs text-gray-400 hover:text-gray-700 border border-gray-200 rounded px-2 py-0.5 transition-colors"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      </div>
      <p className="text-sm text-gray-700 leading-relaxed">{comment.comment}</p>
    </div>
  );
}

export default function PRReviewer() {
  const [prUrl, setPrUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ReviewResult | null>(null);
  const [filter, setFilter] = useState<"all" | Severity>("all");

  const handleAnalyze = async () => {
    setError("");
    setResult(null);
    setLoading(true);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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

  const filtered = result?.comments.filter(
    (c) => filter === "all" || c.severity === filter
  ) ?? [];

  const counts = result
    ? {
        total: result.comments.length,
        error: result.comments.filter((c) => c.severity === "error").length,
        warning: result.comments.filter((c) => c.severity === "warning").length,
        suggestion: result.comments.filter((c) => c.severity === "suggestion").length,
      }
    : null;

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">PR Code Reviewer</h1>
          <p className="text-gray-500 text-sm mt-1">
            Analyze GitHub pull requests with Gemini AI. Review comments are for manual use only.
          </p>
        </div>

        {/* Input Form */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4 shadow-sm">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Pull Request URL
            </label>
            <input
              type="url"
              value={prUrl}
              onChange={(e) => setPrUrl(e.target.value)}
              placeholder="https://github.com/owner/repo/pull/123"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={handleAnalyze}
            disabled={loading || !prUrl}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium py-2 rounded-lg text-sm transition-colors"
          >
            {loading ? "Analyzing..." : "Analyze PR"}
          </button>
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </div>

        {/* Results */}
        {result && (
          <div className="space-y-4">
            <div>
              <h2 className="font-semibold text-gray-800 text-sm">{result.prTitle}</h2>
              <a href={result.prUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline">
                {result.prUrl}
              </a>
            </div>

            {/* Summary Cards */}
            {counts && (
              <div className="flex gap-3 flex-wrap">
                <SummaryCard label="Total" count={counts.total} color="border-gray-200" />
                <SummaryCard label="Errors" count={counts.error} color="border-red-200 bg-red-50" />
                <SummaryCard label="Warnings" count={counts.warning} color="border-yellow-200 bg-yellow-50" />
                <SummaryCard label="Suggestions" count={counts.suggestion} color="border-blue-200 bg-blue-50" />
              </div>
            )}

            {/* Filter */}
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Filter:</label>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as "all" | Severity)}
                className="border border-gray-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All</option>
                <option value="error">Errors only</option>
                <option value="warning">Warnings only</option>
                <option value="suggestion">Suggestions only</option>
              </select>
            </div>

            {/* Comment Cards */}
            {filtered.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">No comments for this filter.</p>
            ) : (
              <div className="space-y-3">
                {filtered.map((c, i) => (
                  <CommentCard key={i} comment={c} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
