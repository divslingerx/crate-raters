import "dotenv/config";
import express from "express";
import expressLayouts from "express-ejs-layouts";
import methodOverride from "method-override";
import path from "path";
import { fileURLToPath } from "url";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./auth.js";
import { getSession } from "./middleware/index.js";
import indexRoutes from "./routes/index.js";
import authRoutes from "./routes/auth.js";
import recordRoutes from "./routes/records.js";
import commentRoutes from "./routes/comments.js";

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

// Routes
app.use("/", authRoutes);
app.use("/records", recordRoutes);
app.use("/records/:id/comments", commentRoutes);
app.use("/", indexRoutes);

export { app };

app.listen(port, () => {
  console.log(`CrateRaters running on port ${port}`);
});
