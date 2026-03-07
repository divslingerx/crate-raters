import { Router } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../auth.js";
import { db } from "../db/index.js";
import { profiles } from "../db/schema.js";

const router = Router();

// ── Register ─────────────────────────────────────────────────────────

router.get("/register", (_req, res) => {
  res.render("register");
});

router.post("/register", async (req, res) => {
  const { name, email, password } = req.body;

  try {
    // Sign up the user, get response with Set-Cookie headers
    const signUpResponse = await auth.api.signUpEmail({
      body: { name, email, password },
      asResponse: true,
    });

    // Forward Set-Cookie headers from Better Auth to the browser
    const setCookies = signUpResponse.headers.getSetCookie();
    for (const cookie of setCookies) {
      res.append("set-cookie", cookie);
    }

    // Auto-create profile for the new user
    const signUpData = await signUpResponse.json();
    if (signUpData?.user?.id) {
      await db.insert(profiles).values({ userId: signUpData.user.id }).onConflictDoNothing();
    }

    res.redirect("/releases");
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Registration failed";
    res.status(400).render("register", { error: message });
  }
});

// ── Login ────────────────────────────────────────────────────────────

router.get("/login", (_req, res) => {
  res.render("login");
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const signInResponse = await auth.api.signInEmail({
      body: { email, password },
      asResponse: true,
    });

    if (!signInResponse.ok) {
      res.status(401).render("login", { error: "Invalid email or password" });
      return;
    }

    // Forward Set-Cookie headers from Better Auth to the browser
    const setCookies = signInResponse.headers.getSetCookie();
    for (const cookie of setCookies) {
      res.append("set-cookie", cookie);
    }

    res.redirect("/releases");
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Login failed";
    res.status(401).render("login", { error: message });
  }
});

// ── Logout ───────────────────────────────────────────────────────────

router.get("/logout", async (req, res) => {
  try {
    await auth.api.signOut({
      headers: fromNodeHeaders(req.headers),
    });
  } catch {
    // Ignore errors — redirect anyway
  }
  res.redirect("/");
});

export default router;
