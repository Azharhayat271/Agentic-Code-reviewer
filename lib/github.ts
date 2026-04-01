import { PRInfo } from "@/types";

export function parsePRUrl(url: string): PRInfo | null {
  // Supports: https://github.com/owner/repo/pull/123
  const match = url.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/);
  if (!match) return null;
  return { owner: match[1], repo: match[2], number: parseInt(match[3], 10) };
}

export async function fetchPRFiles(
  token: string,
  { owner, repo, number }: PRInfo
): Promise<{ filename: string; patch?: string }[]> {
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/pulls/${number}/files`,
    {
      headers: {
        Authorization: `token ${token}`,
        Accept: "application/vnd.github+json",
      },
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { message?: string }).message || `GitHub API error: ${res.status}`
    );
  }
  return res.json();
}

export async function fetchPRTitle(
  token: string,
  { owner, repo, number }: PRInfo
): Promise<string> {
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/pulls/${number}`,
    {
      headers: {
        Authorization: `token ${token}`,
        Accept: "application/vnd.github+json",
      },
    }
  );
  if (!res.ok) return `PR #${number}`;
  const data = await res.json();
  return (data as { title: string }).title;
}
