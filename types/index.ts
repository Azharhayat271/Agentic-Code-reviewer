export type Severity = "error" | "warning" | "suggestion";

export interface ReviewComment {
  file: string;
  line: number;
  severity: Severity;
  comment: string;
}

export interface ReviewResult {
  comments: ReviewComment[];
  prTitle: string;
  prUrl: string;
}

export interface PRInfo {
  owner: string;
  repo: string;
  number: number;
}
