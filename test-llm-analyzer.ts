#!/usr/bin/env node
/**
 * Test script for Phase 2 LLM Semantic Analyzer
 * Tests the LLM-based analysis on sample code
 */

import OpenAI from "openai";
import {
  analyzeBugsSemanticLLM,
  analyzePerformanceSemanticLLM,
  analyzeSecuritySemanticLLM,
  analyzeDesignSemanticLLM,
  analyzeSemanticallyLLM,
} from "./lib/llmAnalyzerTool.js";

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error("Error: OPENAI_API_KEY environment variable not set");
  process.exit(1);
}

const client = new OpenAI({ apiKey });

// Sample bug-prone code
const sampleBuggyCode = `
export function calculateDiscount(items: any[]) {
  let total = 0;
  for (let i = 0; i < items.length; i++) {
    total += items[i].price;
  }
  
  // Discount percentage
  const discount = 0.1;
  const finalPrice = total - discount; // BUG: Should multiply by discount rate
  
  // Race condition: this could be called while processing
  localStorage.setItem('lastPrice', finalPrice);
  
  return finalPrice;
}

function fetchData() {
  fetch('/api/data')
    .then(res => res.json())
    .then(data => {
      // BUG: Missing error handling
      processData(data);
    });
}
`;

// Sample performance-prone code
const samplePerformanceCode = `
export function renderUserList({ users }: { users: any[] }) {
  return (
    <div>
      {users.map((user) => (
        <UserCard key={user.id}>
          <DataFetcher userId={user.id} />
        </UserCard>
      ))}
    </div>
  );
}

function UserCard({ children }: { children: React.ReactNode }) {
  const [data, setData] = React.useState(null);
  
  // BUG: No dependency array - runs on every render
  React.useEffect(() => {
    fetch('/api/expensive-operation').then(res => setData(res));
  });
  
  return <div>{children}{data}</div>;
}

function DataComponent() {
  const list = [1, 2, 3, 4, 5];
  
  // BUG: DOM queries in map
  return list.map(item => {
    const elem = document.getElementById(\`item-\${item}\`);
    return <div>{elem?.innerHTML}</div>;
  });
}
`;

async function runTests() {
  console.log("🧪 Phase 2 LLM Semantic Analyzer Tests\n");

  try {
    console.log("📋 Test 1: Bug Analysis");
    console.log("- Analyzing sample buggy code...");
    const bugs = await analyzeBugsSemanticLLM(
      client,
      "test-bugs.ts",
      sampleBuggyCode,
      "typescript"
    );
    console.log(`- Found ${bugs.length} bugs`);
    bugs.forEach((bug) => {
      console.log(
        `  Line ${bug.line}: [${bug.severity}] ${bug.issue} (${Math.round(bug.confidence * 100)}% confidence)`
      );
    });

    console.log("\n📋 Test 2: Performance Analysis");
    console.log("- Analyzing sample performance code...");
    const perf = await analyzePerformanceSemanticLLM(
      client,
      "test-perf.tsx",
      samplePerformanceCode,
      "tsx"
    );
    console.log(`- Found ${perf.length} performance issues`);
    perf.forEach((issue) => {
      console.log(
        `  Line ${issue.line}: [${issue.severity}] ${issue.issue} (${Math.round(issue.confidence * 100)}% confidence)`
      );
    });

    console.log("\n📋 Test 3: Full Semantic Analysis");
    console.log("- Running all 4 analysis types in parallel...");
    const allFindings = await analyzeSemanticallyLLM(
      client,
      "test-full.ts",
      sampleBuggyCode,
      "typescript"
    );
    console.log(`- Found ${allFindings.length} total findings`);
    allFindings.forEach((finding) => {
      console.log(`  Line ${finding.line}: [${finding.severity}] ${finding.issue}`);
    });

    console.log("\n✅ All tests completed successfully!");
  } catch (error) {
    console.error("❌ Test failed:", error);
    process.exit(1);
  }
}

runTests();
