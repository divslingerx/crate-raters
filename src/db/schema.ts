import {
  pgTable,
  text,
  timestamp,
  boolean,
  index,
  primaryKey,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ── Better Auth tables ─────────────────────────────────────────────

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_userId_idx").on(table.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("account_userId_idx").on(table.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

// ── App tables ─────────────────────────────────────────────────────

export const releases = pgTable("releases", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  artist: text("artist").notNull(),
  album: text("album").notNull(),
  image: text("image"),
  year: text("year"),
  found: text("found"),
  userId: text("userId").notNull(),
  format: text("format").notNull().default("vinyl"),
  vinylSize: text("vinylSize"),
  color: text("color"),
  label: text("label"),
  catalogNumber: text("catalogNumber"),
  country: text("country"),
  barcode: text("barcode"),
  matrix: text("matrix"),
  edition: text("edition"),
  tapeType: text("tapeType"),
  createdAt: timestamp("createdAt").defaultNow(),
});

export const comments = pgTable("comments", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  text: text("text").notNull(),
  userId: text("userId").notNull(),
  releaseId: text("releaseId")
    .notNull()
    .references(() => releases.id, { onDelete: "cascade" }),
  createdAt: timestamp("createdAt").defaultNow(),
});

export const profiles = pgTable("profiles", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("userId")
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: "cascade" }),
  bio: text("bio"),
  avatarUrl: text("avatarUrl"),
  createdAt: timestamp("createdAt").defaultNow(),
});

export const follows = pgTable(
  "follows",
  {
    followerId: text("followerId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    followingId: text("followingId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("createdAt").defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.followerId, table.followingId] }),
    index("follows_followerId_idx").on(table.followerId),
    index("follows_followingId_idx").on(table.followingId),
  ],
);

export const likes = pgTable(
  "likes",
  {
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    releaseId: text("releaseId")
      .notNull()
      .references(() => releases.id, { onDelete: "cascade" }),
    createdAt: timestamp("createdAt").defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.releaseId] })],
);

export const wants = pgTable(
  "wants",
  {
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    releaseId: text("releaseId")
      .notNull()
      .references(() => releases.id, { onDelete: "cascade" }),
    createdAt: timestamp("createdAt").defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.releaseId] })],
);

export const tags = pgTable("tags", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
});

export const releaseTags = pgTable(
  "releaseTags",
  {
    releaseId: text("releaseId")
      .notNull()
      .references(() => releases.id, { onDelete: "cascade" }),
    tagId: text("tagId")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.releaseId, table.tagId] })],
);

export const activities = pgTable(
  "activities",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    type: text("type").notNull(),
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    releaseId: text("releaseId").references(() => releases.id, {
      onDelete: "cascade",
    }),
    targetUserId: text("targetUserId").references(() => user.id, {
      onDelete: "cascade",
    }),
    text: text("text"),
    imageUrl: text("imageUrl"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [
    index("activities_userId_createdAt_idx").on(
      table.userId,
      table.createdAt,
    ),
    index("activities_createdAt_idx").on(table.createdAt),
  ],
);

// ── Relations ──────────────────────────────────────────────────────

export const userRelations = relations(user, ({ many, one }) => ({
  sessions: many(session),
  accounts: many(account),
  releases: many(releases),
  comments: many(comments),
  likes: many(likes),
  wants: many(wants),
  activities: many(activities),
  profile: one(profiles, {
    fields: [user.id],
    references: [profiles.userId],
  }),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

export const releasesRelations = relations(releases, ({ many, one }) => ({
  comments: many(comments),
  likes: many(likes),
  wants: many(wants),
  releaseTags: many(releaseTags),
  author: one(user, {
    fields: [releases.userId],
    references: [user.id],
  }),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  release: one(releases, {
    fields: [comments.releaseId],
    references: [releases.id],
  }),
  author: one(user, {
    fields: [comments.userId],
    references: [user.id],
  }),
}));

export const profilesRelations = relations(profiles, ({ one }) => ({
  user: one(user, {
    fields: [profiles.userId],
    references: [user.id],
  }),
}));

export const followsRelations = relations(follows, ({ one }) => ({
  follower: one(user, {
    fields: [follows.followerId],
    references: [user.id],
    relationName: "follower",
  }),
  following: one(user, {
    fields: [follows.followingId],
    references: [user.id],
    relationName: "following",
  }),
}));

export const likesRelations = relations(likes, ({ one }) => ({
  user: one(user, {
    fields: [likes.userId],
    references: [user.id],
  }),
  release: one(releases, {
    fields: [likes.releaseId],
    references: [releases.id],
  }),
}));

export const wantsRelations = relations(wants, ({ one }) => ({
  user: one(user, {
    fields: [wants.userId],
    references: [user.id],
  }),
  release: one(releases, {
    fields: [wants.releaseId],
    references: [releases.id],
  }),
}));

export const tagsRelations = relations(tags, ({ many }) => ({
  releaseTags: many(releaseTags),
}));

export const releaseTagsRelations = relations(releaseTags, ({ one }) => ({
  release: one(releases, {
    fields: [releaseTags.releaseId],
    references: [releases.id],
  }),
  tag: one(tags, {
    fields: [releaseTags.tagId],
    references: [tags.id],
  }),
}));

export const activitiesRelations = relations(activities, ({ one }) => ({
  user: one(user, {
    fields: [activities.userId],
    references: [user.id],
    relationName: "activityUser",
  }),
  release: one(releases, {
    fields: [activities.releaseId],
    references: [releases.id],
  }),
  targetUser: one(user, {
    fields: [activities.targetUserId],
    references: [user.id],
    relationName: "activityTarget",
  }),
}));
