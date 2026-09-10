# AutoNoder

AI-powered workflow automation platform based on the Nodebase architecture described in the supplied two-part course documentation.

## Current build

AutoNoder now contains an end-to-end application core:

- Next.js + TypeScript App Router
- Responsive dashboard and workflow catalog
- React Flow visual workflow editor
- Persistent workflow create/read/update/delete API
- Better Auth email/password sign-up and sign-in UI
- Prisma/PostgreSQL data model for users, auth sessions, workflows, credentials, and executions
- AES-256-GCM credential encryption utility
- Graph validation and topological workflow execution engine
- Real HTTP Request executor
- OpenAI and Anthropic AI executor adapters
- Persisted execution records with success/failure states
- Execution history UI
- Inngest durable/background workflow execution boundary
- Automated GitHub Actions build check
- Environment-variable contract for database, auth, AI, payments, Inngest, and observability services

## Architecture direction

The implementation follows the supplied Part 1 and Part 2 specification: workflows are represented as nodes and connections, execution is ordered through the graph, and node behavior is delegated to registered executors. Inngest is the durable/background execution boundary, Prisma is the persistence layer, and provider credentials are isolated from workflow definitions.

## Local setup

1. Install dependencies with `npm install`.
2. Create `.env.local` from `.env.example`.
3. Configure `DATABASE_URL`, `BETTER_AUTH_SECRET`, and `BETTER_AUTH_URL`.
4. Run `npm run db:generate`.
5. Run `npm run db:push`.
6. Start the app with `npm run dev`.
7. Open `/sign-in`, create an account, then create a workflow from the dashboard.

For AI execution, configure `OPENAI_API_KEY` or `ANTHROPIC_API_KEY`. Hosted Inngest, Polar, Sentry, and additional production integrations activate when their corresponding credentials are configured.

## Source specification

The two supplied course transcripts remain the project source specification. Implementation decisions are being kept aligned with their terminology and architecture rather than treating AutoNoder as an unrelated starter project.
