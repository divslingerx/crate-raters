# CrateRaters Modernization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rewrite CrateRaters from JS/Mongoose/Passport to TS/Drizzle/Better Auth/Tailwind/HTMX while keeping Express + EJS.

**Architecture:** Express 5 with TypeScript (tsx for dev). Drizzle ORM with Postgres. Better Auth for authentication with drizzle adapter. Vite as CSS build tool for Tailwind. HTMX via CDN for dynamic interactions. EJS with express-ejs-layouts for layouts.

**Tech Stack:** Express 5, TypeScript, Drizzle ORM, PostgreSQL, Better Auth, EJS + express-ejs-layouts, Tailwind CSS (via Vite), HTMX

**Important:** Better Auth and Drizzle generate their own schema — use `pnpm dlx @better-auth/cli generate` and `pnpm drizzle-kit push`/`generate`/`migrate` rather than writing SQL by hand. Consult docs via context7 when unsure about API details.

**Commits:** No attribution lines. Do not commit `.claude/` or `CLAUDE.md`.

---

### Task 1: Clean up old dependencies and configure TypeScript

**Files:**
- Modify: `package.json`
- Modify: `tsconfig.json`
- Modify: `docker-compose.yml`
- Modify: `.env` and `.env.example`

**Step 1: Remove old dependencies**

```bash
pnpm remove mongoose passport passport-local passport-local-mongoose connect-flash
```

**Step 2: Install new dependencies**

```bash
pnpm add express-ejs-layouts
pnpm add -D concurrently
```

**Step 3: Update tsconfig.json**

Set `rootDir` to `./src`, `outDir` to `./dist`, add `"node"` to types, remove `jsx` (no React), and ensure `module`/`moduleResolution` work for Node with ESM. Keep strict mode.

```jsonc
{
  "compilerOptions": {
    "rootDir": "./src",
    "outDir": "./dist",
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "target": "esnext",
    "types": ["node"],
    "sourceMap": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noUncheckedSideEffectImports": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "public"]
}
```

**Step 4: Switch docker-compose from Mongo to Postgres**

```yaml
services:
  postgres:
    image: postgres:17
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: crate_raters
      POSTGRES_PASSWORD: crate_raters
      POSTGRES_DB: crate_raters
    volumes:
      - pg-data:/var/lib/postgresql/data

volumes:
  pg-data:
```

**Step 5: Update .env and .env.example**

```
DATABASE_URL=postgresql://crate_raters:crate_raters@localhost:5432/crate_raters
BETTER_AUTH_SECRET=change-me-to-a-random-secret
BETTER_AUTH_URL=http://localhost:3000
PORT=3000
```

**Step 6: Update package.json scripts**

```json
{
  "scripts": {
    "start": "node dist/app.js",
    "dev": "docker compose up -d && concurrently \"pnpm run dev:css\" \"pnpm run dev:server\"",
    "dev:server": "tsx watch src/app.ts",
    "dev:css": "vite build --watch",
    "build": "vite build && tsc",
    "db:push": "drizzle-kit push",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:seed": "tsx src/db/seed.ts",
    "db:up": "docker compose up -d",
    "db:down": "docker compose down",
    "test": "node --test --import tsx src/**/*.test.ts"
  }
}
```

Also update `"main"` to `"src/app.ts"`.

**Step 7: Delete old JS source files**

Remove: `app.js`, `seeds.js`, `models/record.js`, `models/comment.js`, `models/user.js`, `middleware/index.js`, `routes/index.js`, `routes/records.js`, `routes/comments.js`, `routes/auth.js`, `routes/profile.js`

**Step 8: Commit**

```bash
git add -A -- ':!.claude' ':!CLAUDE.md'
git commit -m "Remove old JS source and MongoDB deps, configure TypeScript and Postgres"
```

---

### Task 2: Set up Drizzle ORM and database connection

**Files:**
- Create: `src/db/index.ts`
- Create: `src/db/schema.ts`
- Create: `drizzle.config.ts`

**Step 1: Create drizzle config**

Consult context7 drizzle docs for `defineConfig`. Point schema at `./src/db/schema.ts`, dialect `postgresql`, credentials from `DATABASE_URL` env var.

**Step 2: Create database connection (`src/db/index.ts`)**

Use `drizzle()` from `drizzle-orm/node-postgres` with the `DATABASE_URL` env var. Export `db`.

**Step 3: Create app schema (`src/db/schema.ts`)**

Define `records` and `comments` tables using `pgTable` from `drizzle-orm/pg-core`. Use `text`, `timestamp`, `uuid` or `serial` for IDs. Add `userId` FK columns that will reference the better-auth `user` table (just use `text("userId")` to match better-auth's user id type). Define drizzle `relations` for records->comments, etc.

**Do NOT define auth tables** — better-auth generates those.

**Step 4: Verify by running `pnpm db:push`**

Start postgres first with `pnpm db:up`, then push schema. This creates the records/comments tables.

**Step 5: Commit**

```bash
git add -A -- ':!.claude' ':!CLAUDE.md'
git commit -m "Add Drizzle ORM setup with records and comments schema"
```

---

### Task 3: Set up Better Auth

**Files:**
- Create: `src/auth.ts`

**Step 1: Create auth instance (`src/auth.ts`)**

Consult context7 better-auth docs. Use `betterAuth()` with `drizzleAdapter(db, { provider: "pg" })`. Enable `emailAndPassword`. Configure `username` plugin if desired. Export `auth`.

```typescript
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db/index.js";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  emailAndPassword: {
    enabled: true,
  },
});
```

**Step 2: Generate auth schema**

```bash
pnpm dlx @better-auth/cli generate
```

This creates the auth tables (user, session, account, verification) in your Drizzle schema or as SQL. Then push:

```bash
pnpm db:push
```

**Step 3: Commit**

```bash
git add -A -- ':!.claude' ':!CLAUDE.md'
git commit -m "Add Better Auth with Drizzle adapter"
```

---

### Task 4: Set up Vite + Tailwind CSS

**Files:**
- Create: `vite.config.ts`
- Create: `src/client/main.css`
- Create: `tailwind.config.ts` (if needed, or use `@tailwind` directives with v4 auto-detection)

**Step 1: Install Tailwind and Vite**

```bash
pnpm add -D vite tailwindcss @tailwindcss/vite
```

**Step 2: Create vite.config.ts**

Configure Vite as a CSS build tool only. Input: `src/client/main.css`. Output: `public/dist/`.

```typescript
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [tailwindcss()],
  build: {
    outDir: "public/dist",
    rollupOptions: {
      input: "src/client/main.css",
    },
  },
});
```

**Step 3: Create `src/client/main.css`**

```css
@import "tailwindcss";
```

**Step 4: Build CSS to verify**

```bash
pnpm run dev:css
```

Check that `public/dist/` gets generated with CSS output.

**Step 5: Commit**

```bash
git add -A -- ':!.claude' ':!CLAUDE.md'
git commit -m "Add Vite + Tailwind CSS build pipeline"
```

---

### Task 5: Create Express app with express-ejs-layouts layout and landing page

**Files:**
- Create: `src/app.ts`
- Create: `src/routes/index.ts`
- Create: `views/layouts/main.ejs`
- Modify: `views/landing.ejs`

**Step 1: Create `src/app.ts`**

Set up Express 5 app:
- Load dotenv
- Use `express-ejs-layouts` as the EJS engine
- Set view engine to EJS, views directory
- Serve `public/` statically
- Mount better-auth handler on `/api/auth/{*any}` using `toNodeHandler(auth)` — this must be BEFORE `express.json()` middleware
- Mount `express.json()` and `express.urlencoded()`
- Mount method-override
- Mount routes
- Listen on `process.env.PORT`

**Step 2: Create `src/routes/index.ts`**

Landing page route: `GET /` renders `landing.ejs`.

**Step 3: Create `views/layouts/main.ejs`**

Base layout using express-ejs-layouts's `layout()` convention. Include Tailwind CSS from `/dist/main.css`, HTMX from CDN, and a `<%- body %>` block.

**Step 4: Update `views/landing.ejs`**

Use the layout with `<% layout('layouts/main') %>`. Replace Bootstrap classes with Tailwind.

**Step 5: Test manually — `pnpm run dev`, visit `http://localhost:3000`**

**Step 6: Commit**

```bash
git add -A -- ':!.claude' ':!CLAUDE.md'
git commit -m "Add Express app with express-ejs-layouts layout and landing page"
```

---

### Task 6: Auth routes and views (register, login, logout)

**Files:**
- Create: `src/routes/auth.ts`
- Create: `src/middleware/index.ts`
- Modify: `views/register.ejs`
- Modify: `views/login.ejs`
- Modify: `views/layouts/main.ejs` (nav bar with login/logout state)

**Step 1: Create auth middleware (`src/middleware/index.ts`)**

Create `getSession` middleware that calls `auth.api.getSession({ headers: fromNodeHeaders(req.headers) })` and attaches the result to `res.locals.session` and `res.locals.user`. Apply this globally in app.ts.

Create `isLoggedIn` middleware that checks `res.locals.session` and redirects to `/login` if not authenticated.

**Step 2: Create auth routes (`src/routes/auth.ts`)**

Better Auth handles the actual auth API at `/api/auth/*`. These routes serve the EJS forms and handle form submissions by calling the Better Auth API server-side:

- `GET /register` — render register form
- `POST /register` — call `auth.api.signUpEmail()` server-side, set session cookie, redirect
- `GET /login` — render login form
- `POST /login` — call `auth.api.signInEmail()` server-side, set session cookie, redirect
- `GET /logout` — call sign-out, clear session, redirect

Consult better-auth docs for the exact server-side API calls.

**Step 3: Update views with Tailwind and layout**

Update `register.ejs` and `login.ejs` to use `layout('layouts/main')` and Tailwind classes.

**Step 4: Update layout nav** to show login/register or username/logout based on `user` local.

**Step 5: Write tests**

Using Node's built-in test runner, test that:
- `GET /register` returns 200
- `GET /login` returns 200
- Unauthenticated access to protected routes redirects

**Step 6: Commit**

```bash
git add -A -- ':!.claude' ':!CLAUDE.md'
git commit -m "Add auth routes, middleware, and login/register views"
```

---

### Task 7: Records CRUD routes and views

**Files:**
- Create: `src/routes/records.ts`
- Modify: `views/records/index.ejs`
- Modify: `views/records/show.ejs`
- Modify: `views/records/new.ejs`
- Modify: `views/records/edit.ejs`

**Step 1: Create records routes (`src/routes/records.ts`)**

All routes use Drizzle queries instead of Mongoose:

- `GET /records` — `db.select()` from records, render index
- `POST /records` — `isLoggedIn`, `db.insert()` into records, redirect
- `GET /records/new` — `isLoggedIn`, render form
- `GET /records/:id` — `db.query.records.findFirst()` with comments relation, render show
- `GET /records/:id/edit` — ownership check, render form
- `PUT /records/:id` — ownership check, `db.update()`, redirect
- `DELETE /records/:id` — ownership check, `db.delete()`, redirect

**Step 2: Create ownership middleware**

`checkRecordOwnership` — fetches record, compares `userId` to `res.locals.user.id`.

**Step 3: Update all record views** with `layout('layouts/main')` and Tailwind classes.

**Step 4: Write tests**

- `GET /records` returns 200
- `GET /records/new` redirects when not logged in
- Record CRUD operations work with test data

**Step 5: Commit**

```bash
git add -A -- ':!.claude' ':!CLAUDE.md'
git commit -m "Add records CRUD with Drizzle queries and Tailwind views"
```

---

### Task 8: Comments CRUD routes and views

**Files:**
- Create: `src/routes/comments.ts`
- Modify: `views/comments/new.ejs`
- Modify: `views/comments/edit.ejs`
- Modify: `views/records/show.ejs` (display comments)

**Step 1: Create comments routes (`src/routes/comments.ts`)**

Nested under records:

- `GET /records/:id/comments/new` — `isLoggedIn`, render form
- `POST /records/:id/comments` — `isLoggedIn`, `db.insert()` into comments, redirect to record show
- `GET /records/:id/comments/:commentId/edit` — ownership check, render form
- `PUT /records/:id/comments/:commentId` — ownership check, `db.update()`, redirect
- `DELETE /records/:id/comments/:commentId` — ownership check, `db.delete()`, redirect

**Step 2: Create `checkCommentOwnership` middleware.**

**Step 3: Update comment views** with layout and Tailwind.

**Step 4: Update `records/show.ejs`** to list comments and link to add/edit/delete.

**Step 5: Write tests**

- Comment creation requires auth
- Comment ownership checks work

**Step 6: Commit**

```bash
git add -A -- ':!.claude' ':!CLAUDE.md'
git commit -m "Add comments CRUD with Drizzle queries and Tailwind views"
```

---

### Task 9: Add HTMX interactions

**Files:**
- Modify: various views

**Step 1: Add HTMX to key interactions**

Identify good candidates:
- Delete record/comment — `hx-delete` with `hx-confirm` and `hx-target` to remove the element
- Add comment — `hx-post` to submit without full page reload, swap in the new comment
- Record search/filter on index page — `hx-get` with `hx-trigger="input changed delay:300ms"`

**Step 2: Create partial views** for HTMX responses (e.g., a single comment partial, a record card partial).

**Step 3: Update routes** to detect HTMX requests (`hx-request` header) and return partials instead of full pages.

**Step 4: Write tests** for HTMX endpoints returning partial HTML.

**Step 5: Commit**

```bash
git add -A -- ':!.claude' ':!CLAUDE.md'
git commit -m "Add HTMX interactions for delete, comments, and search"
```

---

### Task 10: Database seeding

**Files:**
- Create: `src/db/seed.ts`

**Step 1: Create seed script**

Use Drizzle to insert sample records and comments. Consult drizzle docs for seeding patterns.

**Step 2: Test with `pnpm db:seed`**

**Step 3: Commit**

```bash
git add -A -- ':!.claude' ':!CLAUDE.md'
git commit -m "Add database seed script"
```

---

### Task 11: Clean up and final polish

**Step 1: Remove any remaining unused files** (old `models/` dir, `routes/auth.js`, `routes/profile.js` if not already deleted).

**Step 2: Update `CLAUDE.md`** with new architecture, commands, and structure.

**Step 3: Run full test suite** — `pnpm test`

**Step 4: Verify `pnpm run dev`** starts cleanly end-to-end.

**Step 5: Final commit**

```bash
git add -A -- ':!.claude' ':!CLAUDE.md'
git commit -m "Clean up remaining old files and finalize modernization"
```
