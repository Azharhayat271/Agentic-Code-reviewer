/**
 * Unified Diff Parser
 * Parses GitHub PR patch format to extract changed lines and their content
 */

export interface DiffSection {
  startLine: number;      // Starting line number in the new file
  endLine: number;        // Ending line number in the new file
  content: string;        // The actual code content (without +/- prefixes)
  lineNumbers: number[]; // Array of line numbers that were changed
}

/**
 * Parses a unified diff patch and extracts changed code sections
 * Returns array of DiffSection objects, each representing a continuous changed area
 * 
 * Example unified diff:
 * @@ -10,5 +11,8 @@
 *  context line
 * +new line 1
 * +new line 2
 *  context line
 * 
 * This would extract lines 11-18 (in new file) which contain the changes
 */
export function parseDiffPatch(patch: string): DiffSection[] {
  if (!patch || patch.trim() === "") {
    return [];
  }

  const sections: DiffSection[] = [];
  const lines = patch.split("\n");
  
  let currentNewLineNum = 0;
  let inHunk = false;
  let hunkStartLine = 0;
  let hunkContent: string[] = [];
  let hunkLineNumbers: number[] = [];
  const CONTEXT_LINES = 3; // Include 3 lines of context before/after changes

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check for hunk header: @@ -oldStart,oldCount +newStart,newCount @@
    const hunkMatch = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
    
    if (hunkMatch) {
      // Save previous hunk if it exists
      if (inHunk && hunkLineNumbers.length > 0) {
        const expandedStart = Math.max(hunkStartLine - CONTEXT_LINES, hunkStartLine);
        const expandedEnd = Math.max(...hunkLineNumbers) + CONTEXT_LINES;
        
        sections.push({
          startLine: expandedStart,
          endLine: expandedEnd,
          content: hunkContent.join("\n"),
          lineNumbers: hunkLineNumbers,
        });
      }

      // Start new hunk
      currentNewLineNum = parseInt(hunkMatch[1], 10);
      hunkStartLine = currentNewLineNum;
      inHunk = true;
      hunkContent = [];
      hunkLineNumbers = [];
      continue;
    }

    if (!inHunk) continue;

    // Process diff lines
    if (line.startsWith("+") && !line.startsWith("+++")) {
      // Added line (new content)
      const content = line.slice(1); // Remove the + prefix
      hunkContent.push(content);
      hunkLineNumbers.push(currentNewLineNum);
      currentNewLineNum++;
    } else if (line.startsWith("-") && !line.startsWith("---")) {
      // Removed line (old content) - don't include in new file count
      // but we don't add to current hunk since it's not in the new file
    } else if (line.startsWith(" ") || line === "") {
      // Context line (unchanged) - include for context
      const content = line.startsWith(" ") ? line.slice(1) : "";
      hunkContent.push(content);
      currentNewLineNum++;
    }
    // Ignore other lines (file headers, etc.)
  }

  // Don't forget the last hunk
  if (inHunk && hunkLineNumbers.length > 0) {
    const expandedStart = Math.max(hunkStartLine - CONTEXT_LINES, hunkStartLine);
    const expandedEnd = Math.max(...hunkLineNumbers) + CONTEXT_LINES;
    
    sections.push({
      startLine: expandedStart,
      endLine: expandedEnd,
      content: hunkContent.join("\n"),
      lineNumbers: hunkLineNumbers,
    });
  }

  return sections;
}

/**
 * Extracts the actual changed line numbers from diff sections
 * Useful for filtering findings to only those on changed lines
 */
export function getChangedLineNumbers(diffSections: DiffSection[]): Set<number> {
  const changedLines = new Set<number>();
  diffSections.forEach((section) => {
    section.lineNumbers.forEach((lineNum) => {
      changedLines.add(lineNum);
    });
  });
  return changedLines;
}

/**
 * Filters findings to only those on changed lines
 * Used as a safety net to ensure no out-of-diff findings slip through
 */
export function filterFindingsToChangedLines<T extends { line: number }>(
  findings: T[],
  diffSections: DiffSection[]
): T[] {
  const changedLines = getChangedLineNumbers(diffSections);
  return findings.filter((finding) => changedLines.has(finding.line));
}
