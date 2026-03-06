import type { Request, Response, NextFunction } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { eq } from "drizzle-orm";
import { auth } from "../auth.js";
import { db } from "../db/index.js";
import { records, comments } from "../db/schema.js";

/**
 * Global middleware: attaches session and user to res.locals
 * so views can check authentication state.
 */
export async function getSession(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });
    res.locals.session = session?.session ?? null;
    res.locals.user = session?.user ?? null;
  } catch {
    res.locals.session = null;
    res.locals.user = null;
  }
  next();
}

/**
 * Route middleware: redirects unauthenticated users to /login.
 */
export function isLoggedIn(req: Request, res: Response, next: NextFunction) {
  if (!res.locals.user) {
    return res.redirect("/login");
  }
  next();
}

/**
 * Route middleware: checks that the current user owns the record.
 * Attaches the record to res.locals.record if authorized.
 */
export async function checkRecordOwnership(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const id = req.params.id as string;
  const result = await db
    .select()
    .from(records)
    .where(eq(records.id, id));

  const record = result[0];

  if (!record || record.userId !== res.locals.user?.id) {
    res.redirect("back");
    return;
  }

  res.locals.record = record;
  next();
}

/**
 * Route middleware: checks that the current user owns the comment.
 * Attaches the comment to res.locals.comment if authorized.
 */
export async function checkCommentOwnership(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const commentId = req.params.commentId as string;
  const result = await db
    .select()
    .from(comments)
    .where(eq(comments.id, commentId));

  const comment = result[0];

  if (!comment || comment.userId !== res.locals.user?.id) {
    res.redirect("back");
    return;
  }

  res.locals.comment = comment;
  next();
}
