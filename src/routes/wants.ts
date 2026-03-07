import { Router } from "express";
import { and, eq } from "drizzle-orm";
import path from "path";
import ejs from "ejs";
import { db } from "../db/index.js";
import { wants, releases } from "../db/schema.js";
import { isLoggedIn } from "../middleware/index.js";

const router = Router();

// POST /releases/:id/want — toggle want
router.post("/:id/want", isLoggedIn, async (req, res) => {
  const releaseId = req.params.id as string;
  const userId = res.locals.user.id;

  const existing = await db
    .select()
    .from(wants)
    .where(and(eq(wants.userId, userId), eq(wants.releaseId, releaseId)));

  if (existing.length > 0) {
    await db.delete(wants).where(and(eq(wants.userId, userId), eq(wants.releaseId, releaseId)));
  } else {
    await db.insert(wants).values({ userId, releaseId });
  }

  const allWants = await db.select().from(wants).where(eq(wants.releaseId, releaseId));
  const userWanted = !existing.length;
  const wantCount = allWants.length;

  if (req.headers["hx-request"]) {
    const release = await db.select().from(releases).where(eq(releases.id, releaseId));
    const viewsDir = req.app.get("views");
    const html = await ejs.renderFile(
      path.join(viewsDir, "partials/want-button.ejs"),
      { release: release[0], user: res.locals.user, userWanted, wantCount }
    );
    res.send(html);
    return;
  }

  res.redirect(`/releases/${releaseId}`);
});

// GET /wants — user's wishlist
router.get("/", isLoggedIn, async (_req, res) => {
  const userId = res.locals.user.id;

  const userWants = await db.query.wants.findMany({
    where: eq(wants.userId, userId),
    with: { release: true },
  });

  const wantedReleases = userWants.map((w) => w.release);
  res.render("wants/index", { releases: wantedReleases });
});

export default router;
