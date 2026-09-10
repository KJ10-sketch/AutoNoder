# AutoNoder

AI-powered workflow automation platform based on the Nodebase architecture described in the supplied two-part course documentation.

## Current build

The repository now contains the first working application foundation:

- Next.js + TypeScript App Router
- Responsive AutoNoder dashboard
- Workflow catalog
- React Flow visual workflow editor with starter nodes and connections
- Prisma/PostgreSQL data model for users, workflows, credentials, and executions
- Better Auth email/password server integration
- Encrypted credential utility using AES-256-GCM
- Workflow validation and topological execution engine
- Authenticated workflow API boundary
- Inngest durable workflow execution endpoint
- Environment-variable contract for database, auth, AI, payments, Inngest, and observability services

## Architecture direction

The implementation follows the supplied Part 1 and Part 2 specification: workflows are represented as nodes and connections, execution is ordered through the graph, and node behavior is delegated to registered executors. Inngest is the durable/background execution boundary, Prisma is the persistence layer, and provider credentials are isolated from workflow definitions.

## Setup

1. Install dependencies with `npm install`.
2. Create `.env.local` from `.env.example`.
3. Configure `DATABASE_URL` and `BETTER_AUTH_SECRET`.
4. Run `npm run db:push` and `npm run dev`.

External AI, payment, observability, and hosted Inngest functionality become active when their corresponding credentials are configured.

## Source specification

The two supplied course transcripts remain the project source specification. Implementation decisions are being kept aligned with their terminology and architecture rather than treating AutoNoder as an unrelated starter project.
