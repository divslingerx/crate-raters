import "dotenv/config";
import { db } from "./index.js";
import { records, comments } from "./schema.js";
import { auth } from "../auth.js";

async function seed() {
  console.log("Seeding database...");

  // 1. Clear existing data (order matters for FK constraints)
  console.log("Clearing existing data...");
  await db.delete(comments);
  await db.delete(records);
  console.log("Cleared comments and records.");

  // 2. Create a test user via Better Auth
  console.log("Creating test user...");
  const testUser = await auth.api.signUpEmail({
    body: {
      email: "test@crateraters.com",
      password: "password123",
      name: "Test User",
    },
  });
  const userId = testUser.user.id;
  console.log(`Created test user: ${testUser.user.name} (${userId})`);

  // 3. Insert sample vinyl records
  console.log("Inserting sample records...");
  const sampleRecords = [
    {
      artist: "James Brown",
      album: "Live at the Apollo",
      image: "https://placehold.co/600x600/1a1a2e/eee?text=Live+at+the+Apollo",
      year: "1963",
      found: "Drums, Strings, Vocals",
      userId,
    },
    {
      artist: "Skull Snaps",
      album: "It's a New Day",
      image: "https://placehold.co/600x600/16213e/eee?text=It's+a+New+Day",
      year: "1973",
      found: "Drums, Strings, Vocals",
      userId,
    },
    {
      artist: "The Honey Drippers",
      album: "Impeach the President",
      image: "https://placehold.co/600x600/0f3460/eee?text=Impeach+the+President",
      year: "1973",
      found: "Drums, Vocals",
      userId,
    },
    {
      artist: "MF DOOM",
      album: "MM..FOOD",
      image: "https://placehold.co/600x600/533483/eee?text=MM..FOOD",
      year: "2004",
      found: "Hip Hop, Beats",
      userId,
    },
    {
      artist: "Madlib",
      album: "Shades of Blue",
      image: "https://placehold.co/600x600/1b1464/eee?text=Shades+of+Blue",
      year: "2003",
      found: "Jazz, Hip Hop, Beats",
      userId,
    },
  ];

  const insertedRecords = await db
    .insert(records)
    .values(sampleRecords)
    .returning();
  console.log(`Inserted ${insertedRecords.length} records.`);

  // 4. Insert sample comments on a couple records
  console.log("Inserting sample comments...");
  const sampleComments = [
    {
      text: "An absolutely legendary live album. The energy is unreal!",
      userId,
      recordId: insertedRecords[0].id,
    },
    {
      text: "One of the most sampled records in hip hop history.",
      userId,
      recordId: insertedRecords[1].id,
    },
    {
      text: "That break on 'It's a New Day' is iconic.",
      userId,
      recordId: insertedRecords[1].id,
    },
    {
      text: "ALL CAPS when you spell the man name. Classic album.",
      userId,
      recordId: insertedRecords[3].id,
    },
  ];

  const insertedComments = await db
    .insert(comments)
    .values(sampleComments)
    .returning();
  console.log(`Inserted ${insertedComments.length} comments.`);

  // 5. Summary
  console.log("\nSeed complete!");
  console.log(`  - 1 test user (${testUser.user.email})`);
  console.log(`  - ${insertedRecords.length} records`);
  console.log(`  - ${insertedComments.length} comments`);

  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
