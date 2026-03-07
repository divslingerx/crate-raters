import "dotenv/config";
import express from "express";
import expressLayouts from "express-ejs-layouts";
import methodOverride from "method-override";
import path from "path";
import { fileURLToPath } from "url";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./auth.js";
import { getSession } from "./middleware/index.js";
import { getFileUrl, ensureBucket } from "./lib/minio.js";
import indexRoutes from "./routes/index.js";
import authRoutes from "./routes/auth.js";
import releaseRoutes from "./routes/releases.js";
import commentRoutes from "./routes/comments.js";
import likeRoutes from "./routes/likes.js";
import wantRoutes from "./routes/wants.js";
import userRoutes from "./routes/users.js";
import feedRoutes from "./routes/feed.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

// Dev livereload — auto-refreshes browser on template/CSS/server changes
if (process.env.NODE_ENV !== "production") {
  const livereload = await import("livereload");
  const lrServer = livereload.default.createServer();
  lrServer.watch([
    path.join(__dirname, "../views"),
    path.join(__dirname, "../public/dist"),
  ]);
  app.use((_req, res, next) => {
    res.locals.livereload = true;
    next();
  });
}

// View engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "../views"));

// express-ejs-layouts
app.use(expressLayouts);
app.set("layout", "layouts/main");

// Static files
app.use(express.static(path.join(__dirname, "../public")));

// Better Auth handler — MUST be before express.json()
app.all("/api/auth/{*any}", toNodeHandler(auth));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));

// Session middleware (populates res.locals.user for all views)
app.use(getSession);

// Image URL resolver — resolves MinIO keys to full URLs, passes through http URLs
app.use((_req, res, next) => {
  res.locals.resolveImage = (value: string | null | undefined): string | null => {
    if (!value) return null;
    if (value.startsWith("http")) return value;
    return getFileUrl(value);
  };
  next();
});

// Routes
app.use("/", authRoutes);
app.use("/releases", releaseRoutes);
app.use("/releases/:id/comments", commentRoutes);
app.use("/releases", likeRoutes);
app.use("/releases", wantRoutes);
app.use("/wants", wantRoutes);
app.use("/users", userRoutes);
app.use("/feed", feedRoutes);
app.use("/", indexRoutes);

export { app };

// Ensure MinIO bucket exists, then start server
ensureBucket()
  .then(() => {
    app.listen(port, () => {
      console.log(`CrateRaters running on port ${port}`);
    });
  })
  .catch((err) => {
    console.warn("MinIO not available, starting without file uploads:", err.message);
    app.listen(port, () => {
      console.log(`CrateRaters running on port ${port} (without MinIO)`);
    });
  });
