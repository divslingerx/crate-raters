import "dotenv/config";
import { db } from "./index.js";
import {
  releases,
  comments,
  profiles,
  follows,
  likes,
  wants,
  tags,
  releaseTags,
  activities,
} from "./schema.js";
import { auth } from "../auth.js";

async function seed() {
  console.log("Seeding database...");

  // 1. Clear existing data (FK-safe order)
  console.log("Clearing existing data...");
  await db.delete(activities);
  await db.delete(follows);
  await db.delete(likes);
  await db.delete(wants);
  await db.delete(releaseTags);
  await db.delete(comments);
  await db.delete(releases);
  await db.delete(profiles);
  await db.delete(tags);
  console.log("Cleared all app data.");

  // 2. Create users via Better Auth
  console.log("Creating users...");
  const shadow = await auth.api.signUpEmail({
    body: { email: "shadow@crateraters.com", password: "password123", name: "DJ Shadow" },
  });
  const vee = await auth.api.signUpEmail({
    body: { email: "vee@crateraters.com", password: "password123", name: "Vinyl Vee" },
  });
  const king = await auth.api.signUpEmail({
    body: { email: "king@crateraters.com", password: "password123", name: "Crate King" },
  });

  const shadowId = shadow.user.id;
  const veeId = vee.user.id;
  const kingId = king.user.id;
  console.log(`Created users: DJ Shadow (${shadowId}), Vinyl Vee (${veeId}), Crate King (${kingId})`);

  // 3. Create profiles
  console.log("Creating profiles...");
  await db.insert(profiles).values([
    { userId: shadowId, bio: "Beat digger. Sampling is an art form. Always looking for that perfect break." },
    { userId: veeId, bio: "Soul and funk collector. If it grooves, it's going in the crate." },
    { userId: kingId, bio: "Hip-hop head since day one. Boom bap forever." },
  ]);

  // 4. Seed genre tags
  console.log("Seeding tags...");
  const tagData = [
    "Hip Hop", "Soul", "Funk", "Jazz", "R&B", "Blues", "Reggae", "Disco",
    "Electronic", "House", "Afrobeat", "Latin", "Rock", "Psych Rock", "Dub",
    "Boom Bap", "Lo-Fi", "Gospel", "Breaks", "Downtempo", "World",
    "Spoken Word", "Experimental", "Soundtrack",
  ];
  const insertedTags = await db
    .insert(tags)
    .values(tagData.map((name) => ({ name, slug: name.toLowerCase().replace(/\s+/g, "-") })))
    .returning();
  const tagMap = new Map(insertedTags.map((t) => [t.name, t.id]));
  console.log(`Seeded ${insertedTags.length} tags.`);

  // 5. Insert releases (5 per user, mixed formats)
  console.log("Inserting releases...");
  const releaseData = [
    // DJ Shadow — beat digging, breaks, experimental
    { artist: "DJ Shadow", album: "Endtroducing.....", image: "https://placehold.co/600x600/1a1a2e/eee?text=Endtroducing", year: "1996", found: "Rare Records, Sacramento", format: "vinyl", vinylSize: "LP", color: "Black", label: "Mo' Wax", catalogNumber: "MW059LP", country: "UK", edition: "original", userId: shadowId, tags: ["Hip Hop", "Breaks", "Experimental"] },
    { artist: "Madlib", album: "Shades of Blue", image: "https://placehold.co/600x600/1b1464/eee?text=Shades+of+Blue", year: "2003", found: "Amoeba Music, LA", format: "vinyl", vinylSize: "LP", color: "Blue marble", label: "Blue Note", catalogNumber: "7243 5 90842 1 0", country: "US", edition: "original", userId: shadowId, tags: ["Jazz", "Hip Hop"] },
    { artist: "J Dilla", album: "Donuts", image: "https://placehold.co/600x600/8b4513/eee?text=Donuts", year: "2006", found: "Fat Beats, NYC", format: "vinyl", vinylSize: "LP", color: "Donut shop splatter", label: "Stones Throw", catalogNumber: "STH2126", country: "US", edition: "limited", userId: shadowId, tags: ["Hip Hop", "Breaks"] },
    { artist: "RJD2", album: "Deadringer", image: "https://placehold.co/600x600/2d1b69/eee?text=Deadringer", year: "2002", found: "Discogs", format: "cd", label: "Definitive Jux", catalogNumber: "DJX40", country: "US", edition: "original", userId: shadowId, tags: ["Hip Hop", "Breaks", "Downtempo"] },
    { artist: "Portishead", album: "Dummy", image: "https://placehold.co/600x600/333/eee?text=Dummy", year: "1994", found: "Thrift store find", format: "cassette", tapeType: "chrome", label: "Go! Beat", country: "UK", edition: "original", userId: shadowId, tags: ["Downtempo", "Experimental"] },

    // Vinyl Vee — soul, funk, disco
    { artist: "James Brown", album: "Live at the Apollo", image: "https://placehold.co/600x600/1a1a2e/eee?text=Live+at+the+Apollo", year: "1963", found: "Estate sale, Detroit", format: "vinyl", vinylSize: "LP", color: "Black", label: "King Records", catalogNumber: "826", country: "US", edition: "reissue", userId: veeId, tags: ["Soul", "Funk"] },
    { artist: "Stevie Wonder", album: "Songs in the Key of Life", image: "https://placehold.co/600x600/e6a817/333?text=Songs+Key+Life", year: "1976", found: "Goodwill, $2 bin", format: "vinyl", vinylSize: "LP", color: "Black", label: "Tamla", catalogNumber: "T13-340C2", country: "US", edition: "original", matrix: "T-13-340-S3 #4", userId: veeId, tags: ["Soul", "Funk", "R&B"] },
    { artist: "Chaka Khan", album: "Chaka", image: "https://placehold.co/600x600/c2185b/eee?text=Chaka", year: "1978", found: "Flea market, Chicago", format: "vinyl", vinylSize: "LP", color: "Black", label: "Warner Bros.", catalogNumber: "BSK 3245", country: "US", edition: "original", userId: veeId, tags: ["Funk", "Disco", "R&B"] },
    { artist: "D'Angelo", album: "Voodoo", image: "https://placehold.co/600x600/4a0e2f/eee?text=Voodoo", year: "2000", found: "Online, sealed copy", format: "cd", label: "Virgin", catalogNumber: "7243 8 48499 2 4", country: "US", edition: "original", userId: veeId, tags: ["Soul", "R&B"] },
    { artist: "Fela Kuti", album: "Zombie", image: "https://placehold.co/600x600/2e7d32/eee?text=Zombie", year: "1977", found: "Specialist shop, London", format: "vinyl", vinylSize: "LP", color: "Black", label: "Coconut", catalogNumber: "PMLP 1003", country: "Nigeria", edition: "original", userId: veeId, tags: ["Afrobeat", "Funk"] },

    // Crate King — hip hop, boom bap
    { artist: "Nas", album: "Illmatic", image: "https://placehold.co/600x600/1565c0/eee?text=Illmatic", year: "1994", found: "A1 Records, NYC", format: "vinyl", vinylSize: "LP", color: "Black", label: "Columbia", catalogNumber: "CK 57684", country: "US", edition: "original", matrix: "AL-57684-1A M1 S1", userId: kingId, tags: ["Hip Hop", "Boom Bap"] },
    { artist: "MF DOOM", album: "MM..FOOD", image: "https://placehold.co/600x600/533483/eee?text=MM..FOOD", year: "2004", found: "Stones Throw webstore", format: "vinyl", vinylSize: "LP", color: "Green & pink", label: "Rhymesayers", catalogNumber: "RSE0100LP", country: "US", edition: "reissue", userId: kingId, tags: ["Hip Hop", "Boom Bap", "Experimental"] },
    { artist: "A Tribe Called Quest", album: "The Low End Theory", image: "https://placehold.co/600x600/795548/eee?text=Low+End+Theory", year: "1991", found: "Record fair, Brooklyn", format: "vinyl", vinylSize: "LP", color: "Black", label: "Jive", catalogNumber: "01241-41418-1", country: "US", edition: "original", userId: kingId, tags: ["Hip Hop", "Jazz", "Boom Bap"] },
    { artist: "Gang Starr", album: "Moment of Truth", image: "https://placehold.co/600x600/263238/eee?text=Moment+of+Truth", year: "1998", found: "Half Price Books", format: "cassette", tapeType: "normal", label: "Noo Trybe", country: "US", edition: "original", userId: kingId, tags: ["Hip Hop", "Boom Bap"] },
    { artist: "Pete Rock & CL Smooth", album: "Mecca and the Soul Brother", image: "https://placehold.co/600x600/bf360c/eee?text=Mecca+Soul+Brother", year: "1992", found: "Dig session, Philly", format: "vinyl", vinylSize: "LP", color: "Black", label: "Elektra", catalogNumber: "61160-1", country: "US", edition: "original", userId: kingId, tags: ["Hip Hop", "Soul", "Boom Bap"] },
  ];

  const insertedReleases = [];
  for (const r of releaseData) {
    const { tags: relTags, ...releaseValues } = r;
    const [inserted] = await db.insert(releases).values(releaseValues).returning();
    insertedReleases.push({ ...inserted, tagNames: relTags });
  }
  console.log(`Inserted ${insertedReleases.length} releases.`);

  // 6. Link release tags
  console.log("Linking tags to releases...");
  for (const rel of insertedReleases) {
    const tagEntries = rel.tagNames
      .map((name: string) => ({ releaseId: rel.id, tagId: tagMap.get(name)! }))
      .filter((e: { tagId: string | undefined }) => e.tagId);
    if (tagEntries.length > 0) {
      await db.insert(releaseTags).values(tagEntries);
    }
  }

  // 7. Follow graph: Shadow↔Vee, Vee→King, King→Shadow
  console.log("Creating follow graph...");
  await db.insert(follows).values([
    { followerId: shadowId, followingId: veeId },
    { followerId: veeId, followingId: shadowId },
    { followerId: veeId, followingId: kingId },
    { followerId: kingId, followingId: shadowId },
  ]);

  // 8. Likes
  console.log("Creating likes...");
  const shadowReleases = insertedReleases.filter((r) => r.userId === shadowId);
  const veeReleases = insertedReleases.filter((r) => r.userId === veeId);
  const kingReleases = insertedReleases.filter((r) => r.userId === kingId);

  await db.insert(likes).values([
    { userId: shadowId, releaseId: veeReleases[0].id },
    { userId: shadowId, releaseId: veeReleases[4].id },
    { userId: shadowId, releaseId: kingReleases[2].id },
    { userId: veeId, releaseId: shadowReleases[0].id },
    { userId: veeId, releaseId: shadowReleases[2].id },
    { userId: veeId, releaseId: kingReleases[4].id },
    { userId: kingId, releaseId: shadowReleases[1].id },
    { userId: kingId, releaseId: shadowReleases[2].id },
    { userId: kingId, releaseId: veeReleases[1].id },
    { userId: kingId, releaseId: veeReleases[0].id },
  ]);

  // 9. Wants
  console.log("Creating wants...");
  await db.insert(wants).values([
    { userId: shadowId, releaseId: kingReleases[0].id },
    { userId: shadowId, releaseId: kingReleases[4].id },
    { userId: veeId, releaseId: kingReleases[1].id },
    { userId: veeId, releaseId: shadowReleases[1].id },
    { userId: kingId, releaseId: veeReleases[2].id },
    { userId: kingId, releaseId: shadowReleases[0].id },
  ]);

  // 10. Comments
  console.log("Inserting comments...");
  await db.insert(comments).values([
    { text: "An absolutely legendary live album. The energy is unreal!", userId: veeId, releaseId: veeReleases[0].id },
    { text: "The blueprint for instrumental hip hop. Changed everything.", userId: kingId, releaseId: shadowReleases[0].id },
    { text: "That blue marble pressing is gorgeous. Jealous!", userId: veeId, releaseId: shadowReleases[1].id },
    { text: "Donuts forever. RIP Dilla.", userId: kingId, releaseId: shadowReleases[2].id },
    { text: "Songs in the Key of Life is perfection. That pressing must sound incredible.", userId: shadowId, releaseId: veeReleases[1].id },
    { text: "Zombie is one of the greatest protest albums ever made.", userId: shadowId, releaseId: veeReleases[4].id },
    { text: "ALL CAPS when you spell the man name. That green & pink vinyl is fire.", userId: veeId, releaseId: kingReleases[1].id },
    { text: "Low End Theory on original pressing? That's a grail right there.", userId: shadowId, releaseId: kingReleases[2].id },
    { text: "Moment of Truth on cassette is so raw. Love that.", userId: veeId, releaseId: kingReleases[3].id },
    { text: "Pete Rock's production on this album is untouchable.", userId: shadowId, releaseId: kingReleases[4].id },
  ]);

  // 11. Activities
  console.log("Creating activities...");
  const activityEntries = [];

  // Auto-generated: added_release for each
  for (const rel of insertedReleases) {
    activityEntries.push({ type: "added_release", userId: rel.userId, releaseId: rel.id });
  }

  // Follow activities
  activityEntries.push(
    { type: "followed", userId: shadowId, targetUserId: veeId },
    { type: "followed", userId: veeId, targetUserId: shadowId },
    { type: "followed", userId: veeId, targetUserId: kingId },
    { type: "followed", userId: kingId, targetUserId: shadowId },
  );

  // Like activities
  activityEntries.push(
    { type: "liked", userId: shadowId, releaseId: veeReleases[0].id },
    { type: "liked", userId: veeId, releaseId: shadowReleases[0].id },
    { type: "liked", userId: kingId, releaseId: shadowReleases[2].id },
  );

  // Comment activities
  activityEntries.push(
    { type: "commented", userId: kingId, releaseId: shadowReleases[0].id },
    { type: "commented", userId: veeId, releaseId: shadowReleases[1].id },
  );

  // Manual posts
  activityEntries.push(
    { type: "posted", userId: shadowId, text: "Just got back from a dig session at the swap meet. Found some incredible breaks in a dollar bin. The hunt never stops." },
    { type: "posted", userId: veeId, text: "Cleaning my whole collection this weekend. Nothing beats the ritual of pulling records, brushing them down, and putting them back. Meditative." },
    { type: "posted", userId: kingId, text: "Listening to Illmatic on repeat today. 30+ years later and every bar still hits different." },
  );

  await db.insert(activities).values(activityEntries as any);

  // Summary
  console.log("\nSeed complete!");
  console.log(`  - 3 users (shadow@crateraters.com, vee@crateraters.com, king@crateraters.com)`);
  console.log(`  - 3 profiles`);
  console.log(`  - ${insertedTags.length} genre tags`);
  console.log(`  - ${insertedReleases.length} releases with tags`);
  console.log(`  - 4 follow relationships`);
  console.log(`  - 10 likes`);
  console.log(`  - 6 wants`);
  console.log(`  - 10 comments`);
  console.log(`  - ${activityEntries.length} activities`);
  console.log(`\n  All passwords: password123`);

  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
