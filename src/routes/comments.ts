import { Router } from "express";
import { eq } from "drizzle-orm";
import path from "path";
import ejs from "ejs";
import { db } from "../db/index.js";
import { comments, records, user } from "../db/schema.js";
import { isLoggedIn, checkCommentOwnership } from "../middleware/index.js";

const router = Router({ mergeParams: true });

// GET /records/:id/comments/new — new comment form
router.get("/new", isLoggedIn, async (req, res) => {
  const id = req.params.id as string;
  const result = await db.select().from(records).where(eq(records.id, id));
  const record = result[0];

  if (!record) {
    res.redirect("/records");
    return;
  }

  res.render("comments/new", { record });
});

// POST /records/:id/comments — create comment
router.post("/", isLoggedIn, async (req, res) => {
  const id = req.params.id as string;
  const { text } = req.body;

  const [newComment] = await db
    .insert(comments)
    .values({
      text,
      userId: res.locals.user.id,
      recordId: id,
    })
    .returning();

  if (req.headers["hx-request"]) {
    // Fetch the author info for the partial
    const authorResult = await db
      .select({ id: user.id, name: user.name })
      .from(user)
      .where(eq(user.id, res.locals.user.id));
    const author = authorResult[0] || null;

    const commentWithAuthor = { ...newComment, author };

    const viewsDir = req.app.get("views");
    const html = await ejs.renderFile(
      path.join(viewsDir, "partials/comment.ejs"),
      { comment: commentWithAuthor, recordId: id, user: res.locals.user }
    );
    res.send(html);
    return;
  }

  res.redirect(`/records/${id}`);
});

// GET /records/:id/comments/:commentId/edit — edit comment form
router.get(
  "/:commentId/edit",
  isLoggedIn,
  checkCommentOwnership,
  async (req, res) => {
    const id = req.params.id as string;
    res.render("comments/edit", {
      comment: res.locals.comment,
      recordId: id,
    });
  },
);

// PUT /records/:id/comments/:commentId — update comment
router.put(
  "/:commentId",
  isLoggedIn,
  checkCommentOwnership,
  async (req, res) => {
    const id = req.params.id as string;
    const commentId = req.params.commentId as string;
    const { text } = req.body;

    await db
      .update(comments)
      .set({ text })
      .where(eq(comments.id, commentId));

    res.redirect(`/records/${id}`);
  },
);

// DELETE /records/:id/comments/:commentId — delete comment
router.delete(
  "/:commentId",
  isLoggedIn,
  checkCommentOwnership,
  async (req, res) => {
    const id = req.params.id as string;
    const commentId = req.params.commentId as string;

    await db.delete(comments).where(eq(comments.id, commentId));

    if (req.headers["hx-request"]) {
      res.sendStatus(200);
      return;
    }

    res.redirect(`/records/${id}`);
  },
);

export default router;
