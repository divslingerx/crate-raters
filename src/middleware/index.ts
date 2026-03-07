import type { Request, Response, NextFunction } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { eq } from "drizzle-orm";
import { auth } from "../auth.js";
import { db } from "../db/index.js";
import { releases, comments } from "../db/schema.js";

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

export function isLoggedIn(req: Request, res: Response, next: NextFunction) {
  if (!res.locals.user) {
    return res.redirect("/login");
  }
  next();
}

export async function checkReleaseOwnership(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const id = req.params.id as string;
  const result = await db
    .select()
    .from(releases)
    .where(eq(releases.id, id));

  const release = result[0];

  if (!release || release.userId !== res.locals.user?.id) {
    res.redirect("back");
    return;
  }

  res.locals.release = release;
  next();
}

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

export async function checkProfileOwnership(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (req.params.id !== res.locals.user?.id) {
    res.redirect("back");
    return;
  }
  next();
}
