# CrateRaters

A social network for vinyl record collectors. Curate your collection, discover what others are digging, and talk about records — no buying or selling, just the music.

## Tech Stack

- **Runtime:** Node.js + TypeScript (tsx)
- **Framework:** Express 5 with EJS templates
- **Database:** PostgreSQL via Docker + Drizzle ORM
- **Auth:** Better Auth (email/password)
- **Styles:** Tailwind CSS v4 (built via Vite)
- **Interactivity:** HTMX

## Getting Started

### Prerequisites

- Node.js 20+
- [pnpm](https://pnpm.io/)
- Docker & Docker Compose

### Setup

```bash
# Install dependencies
pnpm install

# Copy env file and adjust as needed
cp .env.example .env

# Start Postgres, push schema, and seed data
pnpm db:up
pnpm db:push
pnpm db:seed

# Start dev server (Express + Tailwind + livereload)
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). The seed creates a test account: `test@crateraters.com` / `password123`.

## Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Start Postgres, Express (watch), Tailwind (watch), livereload |
| `pnpm build` | Build CSS + compile TypeScript |
| `pnpm start` | Run compiled app (production) |
| `pnpm db:up` | Start Postgres container |
| `pnpm db:down` | Stop Postgres container |
| `pnpm db:reset` | Stop Postgres and delete data volume |
| `pnpm db:push` | Push Drizzle schema to database |
| `pnpm db:seed` | Seed sample records, comments, and test user |
| `pnpm test` | Run tests |

## Project Structure

```
src/
  app.ts            # Express app entry point
  auth.ts           # Better Auth config
  db/
    index.ts        # Drizzle client
    schema.ts       # Database schema + relations
    seed.ts         # Seed script
  middleware/        # Auth checks, session handling
  routes/           # Route handlers (records, comments, auth)
  client/
    main.css        # Tailwind entry point
views/
  layouts/main.ejs  # Base layout
  partials/         # Reusable EJS partials (HTMX targets)
  records/          # Record CRUD views
  comments/         # Comment form views
```
