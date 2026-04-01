# PR Reviewer

AI-powered GitHub PR analysis with agentic code review system using GPT-4o.

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Setup

1. Copy `.env.local.example` to `.env.local`
2. Add your OpenAI API key:

```env
OPENAI_API_KEY=sk-...
```

3. Add your GitHub token in the browser UI (encrypted locally, never sent to server)

## Features

- 🤖 Agentic code review with specialized analysis agents
- 🔍 Multi-agent system: Coordinator, Security, Performance, Best Practices
- 🎯 Intelligent issue categorization (error, warning, suggestion)
- 🔒 Client-side encrypted token storage (browser only)
- 📊 Real-time analysis with filterable results
- 📋 One-click copy for PR comments

## Usage

1. Add your GitHub token using the Token Manager (stored encrypted in browser)
2. Enter a GitHub PR URL
3. Click "Analyze Pull Request"
4. Review AI-generated feedback from multiple specialized agents
5. Filter by severity and copy comments to post

## Contributing

We welcome contributions!

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open a Pull Request

### Guidelines

- Keep code clean and minimal
- Follow the Midnight Editorial design system
- Test your changes locally
- Update docs if needed

## Tech Stack

Next.js 16 • TypeScript • Tailwind CSS • OpenAI API • GitHub API

## License

MIT
