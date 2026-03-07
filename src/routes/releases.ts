import { Router } from "express";
import { eq, or, ilike, and } from "drizzle-orm";
import path from "path";
import ejs from "ejs";
import { db } from "../db/index.js";
import { releases, tags, releaseTags, likes, wants } from "../db/schema.js";
import { isLoggedIn, checkReleaseOwnership } from "../middleware/index.js";
import { createActivity } from "../lib/activity.js";

const router = Router();

// GET /releases — list all releases
router.get("/", async (req, res) => {
  const q = (req.query.q as string | undefined)?.trim();

  let allReleases;
  if (q) {
    allReleases = await db.query.releases.findMany({
      where: or(ilike(releases.artist, `%${q}%`), ilike(releases.album, `%${q}%`)),
      with: { releaseTags: { with: { tag: true } } },
    });
  } else {
    allReleases = await db.query.releases.findMany({
      with: { releaseTags: { with: { tag: true } } },
    });
  }

  if (req.headers["hx-request"]) {
    const viewsDir = req.app.get("views");
    const html = await ejs.renderFile(
      path.join(viewsDir, "partials/releases-grid.ejs"),
      { releases: allReleases, resolveImage: res.locals.resolveImage }
    );
    res.send(html);
    return;
  }

  res.render("releases/index", { releases: allReleases });
});

// GET /releases/new — new release form
router.get("/new", isLoggedIn, async (_req, res) => {
  const allTags = await db.select().from(tags);
  res.render("releases/new", { allTags, selectedTagIds: [] });
});

// POST /releases — create release
router.post("/", isLoggedIn, async (req, res) => {
  const { artist, album, image, year, found, format, vinylSize, color, label, catalogNumber, country, barcode, matrix, edition, tapeType } = req.body;
  const tagIds: string[] = req.body["tagIds[]"]
    ? (Array.isArray(req.body["tagIds[]"]) ? req.body["tagIds[]"] : [req.body["tagIds[]"]])
    : [];

  const [newRelease] = await db.insert(releases).values({
    artist,
    album,
    image: image || null,
    year: year || null,
    found: found || null,
    format: format || "vinyl",
    vinylSize: vinylSize || null,
    color: color || null,
    label: label || null,
    catalogNumber: catalogNumber || null,
    country: country || null,
    barcode: barcode || null,
    matrix: matrix || null,
    edition: edition || null,
    tapeType: tapeType || null,
    userId: res.locals.user.id,
  }).returning();

  if (tagIds.length > 0) {
    await db.insert(releaseTags).values(
      tagIds.map((tagId) => ({ releaseId: newRelease.id, tagId }))
    );
  }

  await createActivity("added_release", res.locals.user.id, { releaseId: newRelease.id });

  res.redirect("/releases");
});

// GET /releases/:id — show release
router.get("/:id", async (req, res) => {
  const id = req.params.id as string;
  const result = await db.query.releases.findFirst({
    where: (releases, { eq }) => eq(releases.id, id),
    with: {
      comments: {
        with: {
          author: { columns: { id: true, name: true } },
        },
        orderBy: (comments, { desc }) => [desc(comments.createdAt)],
      },
      releaseTags: { with: { tag: true } },
      likes: true,
      wants: true,
    },
  });

  if (!result) {
    res.redirect("/releases");
    return;
  }

  const userLiked = res.locals.user
    ? result.likes.some((l: { userId: string }) => l.userId === res.locals.user.id)
    : false;
  const userWanted = res.locals.user
    ? result.wants.some((w: { userId: string }) => w.userId === res.locals.user.id)
    : false;

  res.render("releases/show", {
    release: result,
    userLiked,
    userWanted,
    likeCount: result.likes.length,
    wantCount: result.wants.length,
  });
});

// GET /releases/:id/edit — edit form
router.get("/:id/edit", isLoggedIn, checkReleaseOwnership, async (req, res) => {
  const id = req.params.id as string;
  const allTags = await db.select().from(tags);
  const currentTags = await db.select().from(releaseTags).where(eq(releaseTags.releaseId, id));
  const selectedTagIds = currentTags.map((rt) => rt.tagId);
  res.render("releases/edit", { release: res.locals.release, allTags, selectedTagIds });
});

// PUT /releases/:id — update release
router.put("/:id", isLoggedIn, checkReleaseOwnership, async (req, res) => {
  const id = req.params.id as string;
  const { artist, album, image, year, found, format, vinylSize, color, label, catalogNumber, country, barcode, matrix, edition, tapeType } = req.body;
  const tagIds: string[] = req.body["tagIds[]"]
    ? (Array.isArray(req.body["tagIds[]"]) ? req.body["tagIds[]"] : [req.body["tagIds[]"]])
    : [];

  await db
    .update(releases)
    .set({
      artist,
      album,
      image: image || null,
      year: year || null,
      found: found || null,
      format: format || "vinyl",
      vinylSize: vinylSize || null,
      color: color || null,
      label: label || null,
      catalogNumber: catalogNumber || null,
      country: country || null,
      barcode: barcode || null,
      matrix: matrix || null,
      edition: edition || null,
      tapeType: tapeType || null,
    })
    .where(eq(releases.id, id));

  // Sync tags
  await db.delete(releaseTags).where(eq(releaseTags.releaseId, id));
  if (tagIds.length > 0) {
    await db.insert(releaseTags).values(
      tagIds.map((tagId) => ({ releaseId: id, tagId }))
    );
  }

  res.redirect(`/releases/${id}`);
});

// DELETE /releases/:id — delete release
router.delete("/:id", isLoggedIn, checkReleaseOwnership, async (req, res) => {
  const id = req.params.id as string;
  await db.delete(releases).where(eq(releases.id, id));

  if (req.headers["hx-request"]) {
    res.set("HX-Redirect", "/releases");
    res.sendStatus(200);
    return;
  }

  res.redirect("/releases");
});

export default router;
