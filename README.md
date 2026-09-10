# AutoNoder

AI-powered workflow automation platform based on the Nodebase architecture described in the supplied two-part course documentation.

## Current build

AutoNoder contains an end-to-end application core:

- Next.js + TypeScript App Router
- Responsive dashboard and workflow catalog
- React Flow visual workflow editor
- Node inspector for webhook, schedule, AI, HTTP, database, and email nodes
- Persistent workflow create/read/update/delete API
- One-click workflow duplication
- Better Auth email/password sign-up and sign-in UI
- Prisma/PostgreSQL data model for users, auth sessions, workflows, credentials, and executions
- AES-256-GCM credential encryption utility
- Graph validation and topological workflow execution engine
- HTTP Request execution with configurable headers, credentials, timeouts, and outbound-target protection
- OpenAI, Anthropic, and Google Gemini AI executor adapters
- Prompt interpolation for `{{input}}` and `{{results}}`
- Database action adapter boundary ready for provider-specific operations
- Resend-compatible email delivery action
- Persisted execution records with success/failure states
- Live-refreshing execution history and per-execution detail pages
- Inngest durable/background workflow execution boundary
- Scheduled workflow dispatcher
- Optional webhook authentication and payload-size protection
- GitHub Actions production build check
- Docker and Docker Compose production packaging
- Environment-variable contract for database, auth, AI, payments, Inngest, email, and observability services

## Architecture

The implementation follows the supplied Part 1 and Part 2 specification: workflows are represented as nodes and connections, execution is ordered through the graph, and node behavior is delegated to registered executors. Inngest is the durable/background execution boundary, Prisma is the persistence layer, and provider credentials are isolated from workflow definitions.

## Local setup

1. Install dependencies with `npm install`.
2. Create `.env.local` from `.env.example`.
3. Configure `DATABASE_URL`, `BETTER_AUTH_SECRET`, and `BETTER_AUTH_URL`.
4. Run `npm run db:generate`.
5. Run `npm run db:push`.
6. Start the app with `npm run dev`.
7. Open `/sign-in`, create an account, then create a workflow from the dashboard.

AI nodes can use stored encrypted credentials or the server environment variables `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, and `GOOGLE_GENERATIVE_AI_API_KEY`.

Email delivery uses a stored credential with `apiKey` and `from`, or `RESEND_API_KEY` plus `EMAIL_FROM`.

For durable/background and scheduled execution, configure the Inngest event/signing keys. Polar and Sentry remain environment-driven production integrations and should be enabled only after their provider accounts are configured.

## Docker

The repository includes a standalone Next.js Docker image and a PostgreSQL-backed `docker-compose.yml` for a self-hosted starting point. Replace the placeholder database password and auth secret before exposing the stack publicly.

## Production deployment

AutoNoder is a standard Next.js application and can be deployed to a Next.js-compatible host such as Vercel, with PostgreSQL and Inngest configured as external services. The Docker image can also be used on a VPS or container platform.

Required production variables:

- `DATABASE_URL`
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`
- `INNGEST_EVENT_KEY`
- `INNGEST_SIGNING_KEY`

Optional integration variables:

- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `GOOGLE_GENERATIVE_AI_API_KEY`
- `RESEND_API_KEY`
- `EMAIL_FROM`
- `POLAR_ACCESS_TOKEN`
- `POLAR_WEBHOOK_SECRET`
- `NEXT_PUBLIC_SENTRY_DSN`
- `SENTRY_AUTH_TOKEN`

Never commit real secrets, database URLs, API keys, or provider tokens to GitHub.

## Source specification

The two supplied course transcripts remain the project source specification. Implementation decisions are being kept aligned with their terminology and architecture rather than treating AutoNoder as an unrelated starter project.
