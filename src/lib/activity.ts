import { db } from "../db/index.js";
import { activities } from "../db/schema.js";

type ActivityType = "added_release" | "commented" | "liked" | "followed" | "posted";

interface ActivityOpts {
  releaseId?: string;
  targetUserId?: string;
  text?: string;
  imageUrl?: string;
}

export async function createActivity(
  type: ActivityType,
  userId: string,
  opts: ActivityOpts = {},
) {
  await db.insert(activities).values({
    type,
    userId,
    releaseId: opts.releaseId || null,
    targetUserId: opts.targetUserId || null,
    text: opts.text || null,
    imageUrl: opts.imageUrl || null,
  });
}
