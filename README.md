# Agentic Code Reviewer

AI-powered GitHub PR code review analyzer using OpenAI GPT-4o-mini.

## Features

- 🔍 Analyzes JavaScript/TypeScript code changes in GitHub PRs
- 🤖 Uses OpenAI GPT-4o-mini for intelligent code review
- 🎯 Categorizes issues by severity (error, warning, suggestion)
- 📊 Real-time summary cards with filterable results
- 📋 One-click copy for manual PR comments
- 🔒 Secure server-side API key management

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Create `.env.local` with your API keys:
   ```
   OPENAI_API_KEY=sk-...
   GH_PAT_TOKEN=ghp_...
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000)

## Usage

1. Enter a GitHub PR URL (e.g., `https://github.com/owner/repo/pull/123`)
2. Click "Analyze PR"
3. Review the generated comments
4. Copy and manually post comments you want to use

## Tech Stack

- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS
- OpenAI API (GPT-4o-mini)
- GitHub REST API

## Environment Variables

- `OPENAI_API_KEY` - Your OpenAI API key
- `GH_PAT_TOKEN` - GitHub Personal Access Token with `repo` scope

## License

MIT
