import { Router } from "express";
import { eq, or, ilike } from "drizzle-orm";
import path from "path";
import ejs from "ejs";
import { db } from "../db/index.js";
import { records } from "../db/schema.js";
import { isLoggedIn, checkRecordOwnership } from "../middleware/index.js";

const router = Router();

// GET /records — list all records
router.get("/", async (req, res) => {
  const q = (req.query.q as string | undefined)?.trim();

  let allRecords;
  if (q) {
    allRecords = await db
      .select()
      .from(records)
      .where(or(ilike(records.artist, `%${q}%`), ilike(records.album, `%${q}%`)));
  } else {
    allRecords = await db.select().from(records);
  }

  if (req.headers["hx-request"]) {
    const viewsDir = req.app.get("views");
    const html = await ejs.renderFile(
      path.join(viewsDir, "partials/records-grid.ejs"),
      { records: allRecords }
    );
    res.send(html);
    return;
  }

  res.render("records/index", { records: allRecords });
});

// GET /records/new — new record form
router.get("/new", isLoggedIn, (_req, res) => {
  res.render("records/new");
});

// POST /records — create record
router.post("/", isLoggedIn, async (req, res) => {
  const { artist, album, image, year, found } = req.body;
  await db.insert(records).values({
    artist,
    album,
    image: image || null,
    year: year || null,
    found: found || null,
    userId: res.locals.user.id,
  });
  res.redirect("/records");
});

// GET /records/:id — show record
router.get("/:id", async (req, res) => {
  const id = req.params.id as string;
  const result = await db.query.records.findFirst({
    where: (records, { eq }) => eq(records.id, id),
    with: {
      comments: {
        with: {
          author: { columns: { id: true, name: true } },
        },
        orderBy: (comments, { desc }) => [desc(comments.createdAt)],
      },
    },
  });

  if (!result) {
    res.redirect("/records");
    return;
  }

  res.render("records/show", { record: result });
});

// GET /records/:id/edit — edit form
router.get("/:id/edit", isLoggedIn, checkRecordOwnership, (_req, res) => {
  res.render("records/edit", { record: res.locals.record });
});

// PUT /records/:id — update record
router.put("/:id", isLoggedIn, checkRecordOwnership, async (req, res) => {
  const id = req.params.id as string;
  const { artist, album, image, year, found } = req.body;
  await db
    .update(records)
    .set({
      artist,
      album,
      image: image || null,
      year: year || null,
      found: found || null,
    })
    .where(eq(records.id, id));
  res.redirect(`/records/${id}`);
});

// DELETE /records/:id — delete record
router.delete("/:id", isLoggedIn, checkRecordOwnership, async (req, res) => {
  const id = req.params.id as string;
  await db.delete(records).where(eq(records.id, id));

  if (req.headers["hx-request"]) {
    res.set("HX-Redirect", "/records");
    res.sendStatus(200);
    return;
  }

  res.redirect("/records");
});

export default router;
