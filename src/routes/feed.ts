import { Router } from "express";
import { eq, desc, inArray, or } from "drizzle-orm";
import { db } from "../db/index.js";
import { activities, follows } from "../db/schema.js";
import { isLoggedIn } from "../middleware/index.js";
import { createActivity } from "../lib/activity.js";
import { uploadSingle } from "../middleware/upload.js";
import { uploadFile } from "../lib/minio.js";

const router = Router();

// GET /feed — activity feed
router.get("/", isLoggedIn, async (_req, res) => {
  const userId = res.locals.user.id;

  // Get followed user IDs
  const followedResult = await db
    .select({ followingId: follows.followingId })
    .from(follows)
    .where(eq(follows.followerId, userId));
  const followedIds = followedResult.map((f) => f.followingId);
  const feedUserIds = [userId, ...followedIds];

  const feedActivities = await db.query.activities.findMany({
    where: inArray(activities.userId, feedUserIds),
    with: {
      user: { columns: { id: true, name: true } },
      release: { columns: { id: true, artist: true, album: true } },
      targetUser: { columns: { id: true, name: true } },
    },
    orderBy: [desc(activities.createdAt)],
    limit: 50,
  });

  res.render("feed/index", { activities: feedActivities });
});

// POST /feed — create manual post
router.post("/", isLoggedIn, (req, res, next) => {
  uploadSingle(req, res, (async (err: unknown) => {
    if (err) {
      res.redirect("/feed");
      return;
    }

    const { text } = req.body;
    let imageUrl: string | undefined;

    if (req.file) {
      const key = `posts/${res.locals.user.id}/${Date.now()}-${req.file.originalname}`;
      await uploadFile(key, req.file.buffer, req.file.mimetype);
      imageUrl = key;
    }

    await createActivity("posted", res.locals.user.id, {
      text: text || undefined,
      imageUrl,
    });

    res.redirect("/feed");
  }) as any);
});

export default router;
