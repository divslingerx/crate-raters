import { Router } from "express";
import { and, eq, ne, notInArray, sql, ilike, or } from "drizzle-orm";
import path from "path";
import ejs from "ejs";
import { db } from "../db/index.js";
import { user, profiles, follows, releases, likes, wants, releaseTags, tags } from "../db/schema.js";
import { isLoggedIn, checkProfileOwnership } from "../middleware/index.js";
import { uploadSingle } from "../middleware/upload.js";
import { uploadFile } from "../lib/minio.js";
import { createActivity } from "../lib/activity.js";

const router = Router();

// POST /users/:id/follow — toggle follow
router.post("/:id/follow", isLoggedIn, async (req, res) => {
  const followingId = req.params.id as string;
  const followerId = res.locals.user.id;

  if (followerId === followingId) {
    res.redirect("back");
    return;
  }

  const existing = await db
    .select()
    .from(follows)
    .where(and(eq(follows.followerId, followerId), eq(follows.followingId, followingId)));

  if (existing.length > 0) {
    await db.delete(follows).where(
      and(eq(follows.followerId, followerId), eq(follows.followingId, followingId))
    );
  } else {
    await db.insert(follows).values({ followerId, followingId });
    await createActivity("followed", followerId, { targetUserId: followingId });
  }

  const isFollowing = !existing.length;

  if (req.headers["hx-request"]) {
    const targetUser = await db.select().from(user).where(eq(user.id, followingId));
    const viewsDir = req.app.get("views");
    const html = await ejs.renderFile(
      path.join(viewsDir, "partials/follow-button.ejs"),
      { targetUser: targetUser[0], isFollowing }
    );
    res.send(html);
    return;
  }

  res.redirect(`/users/${followingId}`);
});

// GET /users — browse users
router.get("/", async (req, res) => {
  const q = (req.query.q as string | undefined)?.trim();

  let users;
  if (q) {
    users = await db
      .select()
      .from(user)
      .where(or(ilike(user.name, `%${q}%`), ilike(user.email, `%${q}%`)));
  } else {
    users = await db.select().from(user);
  }

  // Get profiles for all users
  const allProfiles = await db.select().from(profiles);
  const profileMap = new Map(allProfiles.map((p) => [p.userId, p]));
  const usersWithProfiles = users.map((u) => ({
    ...u,
    profile: profileMap.get(u.id) || null,
  }));

  // Suggested users (users with most shared genre tags)
  let suggestedUsers: typeof usersWithProfiles = [];
  if (res.locals.user) {
    const currentUserId = res.locals.user.id;
    const followedResult = await db
      .select({ followingId: follows.followingId })
      .from(follows)
      .where(eq(follows.followerId, currentUserId));
    const followedIds = followedResult.map((f) => f.followingId);
    const excludeIds = [currentUserId, ...followedIds];

    suggestedUsers = usersWithProfiles.filter((u) => !excludeIds.includes(u.id)).slice(0, 5);
  }

  if (req.headers["hx-request"] && q !== undefined) {
    const viewsDir = req.app.get("views");
    const html = await ejs.renderFile(
      path.join(viewsDir, "partials/user-card.ejs"),
      { users: usersWithProfiles, resolveImage: res.locals.resolveImage }
    );
    res.send(html);
    return;
  }

  res.render("users/index", { users: usersWithProfiles, suggestedUsers });
});

// GET /users/:id — user profile
router.get("/:id", async (req, res) => {
  const id = req.params.id as string;

  const targetUser = await db.select().from(user).where(eq(user.id, id));
  if (!targetUser.length) {
    res.redirect("/users");
    return;
  }

  const profile = await db.select().from(profiles).where(eq(profiles.userId, id));
  const userReleases = await db.query.releases.findMany({
    where: eq(releases.userId, id),
    with: { releaseTags: { with: { tag: true } } },
  });

  const followerCount = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(follows)
    .where(eq(follows.followingId, id));
  const followingCount = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(follows)
    .where(eq(follows.followerId, id));
  const releaseCount = userReleases.length;

  let isFollowing = false;
  if (res.locals.user && res.locals.user.id !== id) {
    const followCheck = await db
      .select()
      .from(follows)
      .where(and(eq(follows.followerId, res.locals.user.id), eq(follows.followingId, id)));
    isFollowing = followCheck.length > 0;
  }

  res.render("users/show", {
    targetUser: targetUser[0],
    profile: profile[0] || null,
    releases: userReleases,
    followerCount: followerCount[0].count,
    followingCount: followingCount[0].count,
    releaseCount,
    isFollowing,
  });
});

// GET /users/:id/edit — edit profile form
router.get("/:id/edit", isLoggedIn, checkProfileOwnership, async (req, res) => {
  const id = req.params.id as string;
  const profile = await db.select().from(profiles).where(eq(profiles.userId, id));
  res.render("users/edit", { profile: profile[0] || null });
});

// PUT /users/:id — update profile
router.put("/:id", isLoggedIn, checkProfileOwnership, (req, res, next) => {
  uploadSingle(req, res, (async (err: unknown) => {
    if (err) {
      res.redirect("back");
      return;
    }

    const id = req.params.id as string;
    const { bio } = req.body;
    let avatarUrl: string | undefined;

    if (req.file) {
      const key = `avatars/${id}/${Date.now()}-${req.file.originalname}`;
      await uploadFile(key, req.file.buffer, req.file.mimetype);
      avatarUrl = key;
    }

    const existing = await db.select().from(profiles).where(eq(profiles.userId, id));

    if (existing.length > 0) {
      const updateData: { bio?: string; avatarUrl?: string } = { bio: bio || null };
      if (avatarUrl) updateData.avatarUrl = avatarUrl;
      await db.update(profiles).set(updateData).where(eq(profiles.userId, id));
    } else {
      await db.insert(profiles).values({
        userId: id,
        bio: bio || null,
        avatarUrl: avatarUrl || null,
      });
    }

    res.redirect(`/users/${id}`);
  }) as any);
});

export default router;
