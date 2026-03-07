import { Router } from "express";
import { and, eq } from "drizzle-orm";
import path from "path";
import ejs from "ejs";
import { db } from "../db/index.js";
import { likes, releases } from "../db/schema.js";
import { isLoggedIn } from "../middleware/index.js";
import { createActivity } from "../lib/activity.js";

const router = Router();

// POST /releases/:id/like — toggle like
router.post("/:id/like", isLoggedIn, async (req, res) => {
  const releaseId = req.params.id as string;
  const userId = res.locals.user.id;

  const existing = await db
    .select()
    .from(likes)
    .where(and(eq(likes.userId, userId), eq(likes.releaseId, releaseId)));

  if (existing.length > 0) {
    await db.delete(likes).where(and(eq(likes.userId, userId), eq(likes.releaseId, releaseId)));
  } else {
    await db.insert(likes).values({ userId, releaseId });
    await createActivity("liked", userId, { releaseId });
  }

  const allLikes = await db.select().from(likes).where(eq(likes.releaseId, releaseId));
  const userLiked = !existing.length;
  const likeCount = allLikes.length;

  if (req.headers["hx-request"]) {
    const release = await db.select().from(releases).where(eq(releases.id, releaseId));
    const viewsDir = req.app.get("views");
    const html = await ejs.renderFile(
      path.join(viewsDir, "partials/like-button.ejs"),
      { release: release[0], user: res.locals.user, userLiked, likeCount }
    );
    res.send(html);
    return;
  }

  res.redirect(`/releases/${releaseId}`);
});

export default router;
