# Hinduism Module Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ship the Hindu spiritual companion at full feature parity with Islam, per the design at [`2026-05-10-hinduism-design.md`](./2026-05-10-hinduism-design.md).

**Architecture:** Mirror Islam structure — parallel `src/faiths/hindu/` tree with no shared abstractions yet (Rule of Three). Burgundy + warm gold theme on `/hindu/*` surface. Deity-aware (Ishta Devata) personalization stored in `UserPreference.contentPreferences`. English + Sanskrit + Hindi at launch, schema designed for more.

**Tech Stack:** NestJS 11 + Prisma 7 + PostgreSQL (backend); React Router v7 + Tailwind v4 (frontend). New deps: `swisseph` (commercial license, ~€600 one-time), `@fontsource/noto-sans-devanagari`, `@googlemaps/google-maps-services-js` (Phase 4 only).

---

## Plan structure

This plan covers **Phase 0 (Foundation, weeks 1-2)** in bite-sized task-by-task detail. Phases 1-4 are listed as milestone outlines at the bottom; each one gets its own writing-plans invocation when its phase begins. Reasons:

- The full 22-week effort would be 2,000+ atomic tasks, stale by week 5.
- Phase 0 unblocks all other work; mistakes here cascade. Worth the detailed treatment.
- Phases 1-4 contain content-sourcing decisions that change the engineering tasks; planning them now would be premature.

## Project conventions to respect

- **No test framework configured** (per `unified-faith-service/CLAUDE.md`: "No automated tests are currently configured"). Tasks below use **manual verification** (curl, dev server check, Prisma Studio). Adding Jest/Vitest is a separate decision; flagged at the end of this plan.
- **Two npm projects** — backend at `unified-faith-service/`, frontend at `faith-web-remix/`. Run commands in the right directory.
- **Frequent commits** — each task ends with a commit. No multi-task commits.
- **Branch off `main`** before starting — current branch is `main` with uncommitted work in `src/auth-service/` and `src/faiths/islam/dhikr/` from prior sessions. Either commit or stash those before branching.

---

## Pre-flight: branch off main

**Step 1: Confirm clean working tree, branch off**

```bash
cd /Users/imamarham10/Desktop/Arham/Faith/unified-faith-service
git status                                # confirm or stash unrelated changes
git checkout -b feat/hindu-foundation     # phase 0 branch
```

```bash
cd /Users/imamarham10/Desktop/Arham/Faith/faith-web-remix
git checkout -b feat/hindu-foundation
```

If the parallel-session approach is chosen at the end, do this in a fresh git worktree instead.

---

## Phase 0 — Foundation (Weeks 1-2, ~15 tasks)

After Phase 0, the platform has all Hindu structural pieces (theme, schema, module skeleton, navigation) but zero Hindu content. `/hindu/*` routes 404 except the home placeholder. Subsequent phases fill in actual modules + content.

### Task 1: Align stale planning artifacts to canonical 9-module list

**Files:**
- Modify: `unified-faith-service/src/common/constants/faiths.constant.ts:43-50` (replace placeholder Hindu features list)
- Modify: `faith-web-remix/app/utils/faithConfig.ts:73-81` (Hindu config tagline)
- Modify: `Faith/plan.md:579` (Phase 5 Hinduism bullet — expand from 3-line note)

**Step 1: Update `faiths.constant.ts` features list to canonical 9**

Edit `unified-faith-service/src/common/constants/faiths.constant.ts` lines 43-50:

```ts
  {
    id: 'hinduism',
    name: 'Hinduism',
    description: 'Sandhya, scriptures, Panchang, mantras, deity names, stotras, temples, Gita-based emotional remedies, and sacred stories.',
    status: 'planned',  // flips to 'active' at Phase 4 launch
    features: [
      'Sandhya & Puja Times',
      'Bhagavad Gita & Scriptures',
      'Mantras & Japa',
      'Panchang & Festivals',
      'Stotras & Aartis',
      '108 Names per Deity',
      'Temple Locator',
      'Mood-based Gita Verses',
      'Sacred Stories',
    ],
    icon: 'om',
  }
```

**Step 2: Update Hindu tagline in `faithConfig.ts`**

Edit `faith-web-remix/app/utils/faithConfig.ts:74`:

```ts
    tagline: "Sandhya, Gita, mantras, Panchang & festivals — built for daily practice",
```

**Step 3: Verify**

```bash
grep -n "Hindu" unified-faith-service/src/common/constants/faiths.constant.ts faith-web-remix/app/utils/faithConfig.ts
```

Expected: Both files show the new aligned wording.

**Step 4: Commit**

```bash
cd unified-faith-service && git add src/common/constants/faiths.constant.ts && git commit -m "chore: align Hindu feature list to canonical 9-module spec"
cd ../faith-web-remix && git add app/utils/faithConfig.ts && git commit -m "chore: align Hindu tagline to canonical feature spec"
```

---

### Task 2: Add Devanagari font + design tokens

**Files:**
- Modify: `faith-web-remix/package.json` (add `@fontsource/noto-sans-devanagari`)
- Modify: `faith-web-remix/app/app.css:1-60` (add font import + Hindu palette tokens)

**Step 1: Install font package**

```bash
cd faith-web-remix
npm install @fontsource/noto-sans-devanagari
```

Expected: `node_modules/@fontsource/noto-sans-devanagari/` exists; `package.json` shows new dep.

**Step 2: Add font import to `app.css`**

Add after line 10 (after the existing `@fontsource-variable/playfair-display` import):

```css
@import "@fontsource/noto-sans-devanagari/400.css";
@import "@fontsource/noto-sans-devanagari/600.css";
@import "@fontsource/noto-sans-devanagari/700.css";
```

**Step 3: Add Hindu palette + font token to `@theme` block**

Inside the `@theme { ... }` block in `app.css` (after the gold tokens around line 29), add:

```css
  /* Hindu palette */
  --color-hindu-primary:       #6B1F2A;
  --color-hindu-primary-dark:  #4A1119;
  --color-hindu-primary-light: #8B3344;
  --color-hindu-surface-warm:  #FBF6EC;

  /* Devanagari font for Sanskrit/Hindi text */
  --font-devanagari: "Noto Sans Devanagari", serif;
```

**Step 4: Verify visually**

```bash
cd faith-web-remix && npm run dev
```

Open `http://localhost:5173/hindu`. Open browser devtools → Elements → check that the body has the Devanagari font available. Type `getComputedStyle(document.body).getPropertyValue('--color-hindu-primary')` in console — expected: `#6B1F2A`.

**Step 5: Commit**

```bash
cd faith-web-remix
git add package.json package-lock.json app/app.css
git commit -m "feat(theme): add Hindu palette tokens and Devanagari font"
```

---

### Task 3: Add Hindu utility CSS classes (`bg-hero-hindu`, `pattern-kolam`, `btn-hindu-primary`)

**Files:**
- Modify: `faith-web-remix/app/app.css:208-280` (extend hero gradients + button utilities)

**Step 1: Add `bg-hero-hindu` after the existing hero gradients**

After the existing `.bg-hero-neutral { ... }` block, add:

```css
/* ============================================
   HINDU THEME — burgundy + gold
   ============================================ */

.bg-hero-hindu {
  background:
    radial-gradient(ellipse 70% 50% at 50% 0%, rgba(232, 180, 112, 0.15), transparent 60%),
    linear-gradient(135deg, #4A1119 0%, #6B1F2A 50%, #2A0A12 100%);
}

.pattern-kolam {
  position: relative;
  overflow: hidden;
}

.pattern-kolam::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 60 60'><g fill='none' stroke='%23E0B470' stroke-width='0.5' opacity='0.18'><circle cx='30' cy='30' r='4'/><circle cx='30' cy='30' r='10'/><path d='M30 0 L30 60 M0 30 L60 30 M0 0 L60 60 M60 0 L0 60'/></g></svg>");
  background-size: 60px 60px;
  opacity: 0.5;
}

.btn-hindu-primary {
  background: linear-gradient(135deg, #6B1F2A 0%, #8B3344 100%);
  color: white;
  border: none;
  border-radius: 12px;
  padding: 12px 24px;
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.btn-hindu-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 15px rgba(107, 31, 42, 0.35);
}

.btn-hindu-primary:active {
  transform: translateY(0);
}
```

**Step 2: Verify visually**

```bash
cd faith-web-remix && npm run dev
```

Create a temporary test page or open browser console and inject:

```js
document.body.innerHTML = '<div class="bg-hero-hindu pattern-kolam" style="height:300px;width:100%;"><button class="btn-hindu-primary">Test</button></div>';
```

Confirm: dark burgundy gradient with subtle kolam pattern overlay; button is burgundy gradient with white text.

**Step 3: Commit**

```bash
cd faith-web-remix
git add app/app.css
git commit -m "feat(theme): add Hindu hero gradient, kolam pattern, and primary button"
```

---

### Task 4: Update `FaithConfig` with real Hindu nav

**Files:**
- Modify: `faith-web-remix/app/utils/faithConfig.ts:68-81` (Hindu config: flip `comingSoon`, add 9 nav links)

**Step 1: Update the `hindu` entry in `FAITH_CONFIGS`**

Replace the current hindu config block (~lines 68-81) with:

```ts
  hindu: {
    key: "hindu",
    displayName: "Hinduism",
    adherentLabel: "Hindu",
    pathPrefix: "/hindu",
    comingSoon: false,
    tagline: "Sandhya, Gita, mantras, Panchang & festivals — built for daily practice",
    greetingEnglish: "Namaste",
    greetingNative: "नमस्ते",
    navLinks: [
      { to: "/hindu", label: "Home", icon: Heart },
      { to: "/hindu/puja-times", label: "Sandhya", icon: Clock },
      { to: "/hindu/scriptures", label: "Scriptures", icon: BookOpen },
      { to: "/hindu/stotras", label: "Stotras", icon: BookMarked },
      { to: "/hindu/stories", label: "Stories", icon: Library },
      { to: "/hindu/japa", label: "Japa", icon: Moon },
      { to: "/hindu/panchang", label: "Panchang", icon: Calendar },
      { to: "/hindu/temples", label: "Temples", icon: Compass },
      { to: "/hindu/feelings", label: "Feelings", icon: Smile },
    ],
  },
```

**Step 2: Verify**

```bash
cd faith-web-remix && npm run typecheck 2>&1 | grep -v 'dhikr.tsx' | head -10
```

Expected: no new TS errors. Pre-existing dhikr.tsx errors are unrelated.

```bash
npm run dev
```

Visit `http://localhost:5173/hindu`. Header should now show 9 nav items (Home, Sandhya, Scriptures, Stotras, Stories, Japa, Panchang, Temples, Feelings) instead of the previous "Coming Soon" stub.

Note: clicking any nav item except "Home" will 404 — that's expected; route files are added in Task 9.

**Step 3: Commit**

```bash
cd faith-web-remix
git add app/utils/faithConfig.ts
git commit -m "feat(faith-config): activate Hindu nav with 9 module entries"
```

---

### Task 5: Refactor Header for 3-way faith chrome (Islam-green / Hindu-burgundy / neutral)

**Files:**
- Modify: `faith-web-remix/app/components/Header.tsx:15-35` (URL-based faith detection + chrome)
- Modify: `faith-web-remix/app/components/Header.tsx:192-198` (Sign In button forks 3-ways)

**Step 1: Extend the URL-based faith detection**

Currently lines ~27-35 do a 2-way fork (Islam vs neutral). Replace with 3-way:

```tsx
  // On faith-specific pages (/islam/*, /hindu/*) the URL drives which nav we
  // render — independent of the user's saved preference.
  const onIslamPage = location.pathname.startsWith("/islam");
  const onHinduPage = location.pathname.startsWith("/hindu");

  const faithConfig = onIslamPage
    ? FAITH_CONFIGS.muslim
    : onHinduPage
      ? FAITH_CONFIGS.hindu
      : userConfig;

  const isNeutralLanding = location.pathname === "/";
  const navLinks = isNeutralLanding ? [] : faithConfig.navLinks;
```

**Step 2: Update Sign-In button to fork 3-ways**

Replace the existing conditional Sign In `className`:

```tsx
                <Link
                  to="/auth/login"
                  className={
                    isNeutralLanding
                      ? "hidden sm:inline-flex items-center gap-2 text-sm font-semibold px-5 py-2 rounded-xl bg-[#1A1238] text-white hover:bg-[#2D1B5E] transition-colors"
                      : onHinduPage
                        ? "hidden sm:inline-flex btn-hindu-primary text-sm px-5 py-2"
                        : "hidden sm:inline-flex btn-primary text-sm px-5 py-2"
                  }
                >
                  Sign In
                </Link>
```

**Step 3: Verify visually**

```bash
cd faith-web-remix && npm run dev
```

- Visit `http://localhost:5173/islam` — Header shows green Sign-In button.
- Visit `http://localhost:5173/hindu` — Header shows burgundy Sign-In button + 9 Hindu nav items.
- Visit `http://localhost:5173/` — Header shows midnight Sign-In button + no nav items.

**Step 4: Commit**

```bash
cd faith-web-remix
git add app/components/Header.tsx
git commit -m "feat(header): 3-way faith chrome (Islam green / Hindu burgundy / neutral)"
```

---

### Task 6: Refactor Footer for 3-way faith chrome

**Files:**
- Modify: `faith-web-remix/app/components/Footer.tsx:7-30` (chrome class detection)
- Modify: `faith-web-remix/app/components/Footer.tsx:33-45` (apply Hindu chrome conditional)

**Step 1: Add Hindu detection alongside Islam**

The existing code already has `onIslamPage` and `onHinduPage`. Update the `shellClasses`, `accentClass`, `accentSubtleClass`, `decorPattern` derivations to fork 3-ways:

```tsx
  const shellClasses = onIslamPage
    ? "bg-hero-warm"
    : onHinduPage
      ? "bg-hero-hindu"
      : "bg-hero-neutral";

  const accentClass = onIslamPage
    ? "text-gold"
    : onHinduPage
      ? "text-[#E0B470]"
      : "text-[#E0B470]";

  const accentSubtleClass = onIslamPage
    ? "text-gold/70"
    : "text-[#E0B470]/75";

  const decorPattern = onIslamPage
    ? "pattern-islamic opacity-40"
    : onHinduPage
      ? "pattern-kolam opacity-50"
      : "pattern-stars opacity-50";
```

**Step 2: Update Hindu-specific brand description (already has placeholder)**

The footer already conditionally renders different brand-column copy for `onHinduPage`. Confirm it reads well — current text `"Mantras, scriptures, Panchang and festivals — Siraat for Hindu seekers, in development."` should be updated to reflect that we're shipping:

```tsx
              {onIslamPage
                ? "Your Islamic spiritual companion. Prayer times, Quran, dhikr, hadiths and more — all in one place."
                : onHinduPage
                  ? "Your Hindu spiritual companion. Sandhya, scriptures, mantras, Panchang and more — all in one place."
                  : "A multi-faith spiritual companion. Choose your tradition, build your daily practice — one bridge between you and your faith."}
```

**Step 3: Verify visually**

```bash
cd faith-web-remix && npm run dev
```

- Visit `http://localhost:5173/hindu` — Footer is burgundy with kolam pattern, "Your Hindu spiritual companion" copy, gold accent on "Premium" link.
- Visit `http://localhost:5173/islam/prayers` — Footer is still green with islamic pattern.
- Visit `/` — Footer is dark twilight with stars pattern.

**Step 4: Commit**

```bash
cd faith-web-remix
git add app/components/Footer.tsx
git commit -m "feat(footer): 3-way faith chrome and Hindu brand copy"
```

---

### Task 7: Update `root.tsx` meta() and breadcrumb schema for `/hindu/*` paths

**Files:**
- Modify: `faith-web-remix/app/root.tsx` (meta function + BreadcrumbSchema)

**Step 1: Add `/hindu/*` branches to meta() function**

In the `meta()` function (~line 70 onwards), add Hindu branches before the `pathname === "/about"` branch:

```tsx
  } else if (pathname === "/hindu") {
    pageTitle = "Siraat for Hindu seekers — Sandhya, Gita & Panchang";
    pageDescription = "Your Hindu spiritual companion. Sandhya times, Bhagavad Gita, mantras, Panchang and festivals.";
  } else if (pathname.startsWith("/hindu/puja-times")) {
    pageTitle = "Sandhya & Puja Times | Siraat";
    pageDescription = "Accurate Sandhya timings based on your location with auspicious-time markers.";
  } else if (pathname.startsWith("/hindu/scriptures")) {
    pageTitle = "Bhagavad Gita & Hindu Scriptures | Siraat";
    pageDescription = "Read the Bhagavad Gita, Vishnu Sahasranama, Hanuman Chalisa with Sanskrit, Hindi and English translations.";
  } else if (pathname.startsWith("/hindu/japa")) {
    pageTitle = "Japa & Mantra Counter | Siraat";
    pageDescription = "Track your daily mantra recitations with mala-style counters and goals.";
  } else if (pathname.startsWith("/hindu/panchang")) {
    pageTitle = "Daily Panchang & Hindu Festivals | Siraat";
    pageDescription = "Today's Tithi, Nakshatra, Yoga, Karana and Vaara with upcoming Hindu festivals.";
  } else if (pathname.startsWith("/hindu/stotras")) {
    pageTitle = "Stotras, Aartis & Bhajans | Siraat";
    pageDescription = "Devotional stotras and aartis with Sanskrit text and translations.";
  } else if (pathname.startsWith("/hindu/names")) {
    pageTitle = "108 Names of Hindu Deities | Siraat";
    pageDescription = "108 Names of Vishnu, Shiva, Devi, Ganesha, Hanuman and Rama with Sanskrit, transliteration and meanings.";
  } else if (pathname.startsWith("/hindu/temples")) {
    pageTitle = "Hindu Temple Locator | Siraat";
    pageDescription = "Find Hindu temples near you with deity, address, and visiting information.";
  } else if (pathname.startsWith("/hindu/feelings")) {
    pageTitle = "Bhagavad Gita Verses for Every Emotion | Siraat";
    pageDescription = "Find Gita verses and Hindu wisdom for every emotional state.";
  } else if (pathname.startsWith("/hindu/stories")) {
    pageTitle = "Hindu Sacred Stories | Siraat";
    pageDescription = "Stories from the Puranas, Ramayana, and lives of saints — for daily reflection.";
```

**Step 2: Update BreadcrumbSchema**

In the `BreadcrumbSchema` component, update the `validTopLevel` array (already has `"hindu"` from earlier work — confirm):

```tsx
  const validTopLevel = ["islam", "hindu", "subscribe", "about", "privacy", "terms", "contact", "settings", "auth"];
```

Add Hindu route entries to the `routeNames` map:

```tsx
    "/hindu": "Hinduism",
    "/hindu/puja-times": "Sandhya Times",
    "/hindu/scriptures": "Scriptures",
    "/hindu/japa": "Japa",
    "/hindu/panchang": "Panchang",
    "/hindu/stotras": "Stotras",
    "/hindu/temples": "Temples",
    "/hindu/feelings": "Feelings",
    "/hindu/stories": "Sacred Stories",
```

Add Hindu-aware dynamic-segment naming in the breadcrumb walker:

```tsx
    } else if (parent === "scriptures") {
      childName = segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, " ");
    } else if (parent === "stotras") {
      childName = "Stotra Details";
    } else if (parent === "stories") {
      childName = "Story Details";
    } else if (parent === "names") {
      childName = `108 Names of ${segment.charAt(0).toUpperCase() + segment.slice(1)}`;
    } else if (parent === "feelings") {
      childName = segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, " ");
```

**Step 3: Verify**

```bash
cd faith-web-remix && npx tsc --noEmit 2>&1 | grep -v 'dhikr.tsx' | head -10
```

Expected: no TS errors.

```bash
npm run dev
```

Visit `http://localhost:5173/hindu` and inspect the document `<title>` — expected: `"Siraat for Hindu seekers — Sandhya, Gita & Panchang"`. View page source and search for `application/ld+json` — expected: BreadcrumbList JSON-LD includes "Hinduism" entry.

**Step 4: Commit**

```bash
cd faith-web-remix
git add app/root.tsx
git commit -m "feat(seo): add /hindu/* meta tags and breadcrumb schema entries"
```

---

### Task 8: Update sitemap with `/hindu/*` static paths

**Files:**
- Modify: `faith-web-remix/app/routes/sitemap[.]xml.ts:6-23` (STATIC_PAGES array)

**Step 1: Update Hindu placeholder line and add submodule entries**

Find the line:
```ts
  { path: "/hindu", lastmod: "2026-05-10", priority: "0.6", changefreq: "monthly" },
```

Replace with:
```ts
  { path: "/hindu", lastmod: "2026-05-10", priority: "0.95", changefreq: "daily" },
  { path: "/hindu/puja-times", lastmod: "2026-05-10", priority: "0.9", changefreq: "daily" },
  { path: "/hindu/scriptures", lastmod: "2026-05-10", priority: "0.9", changefreq: "weekly" },
  { path: "/hindu/japa", lastmod: "2026-05-10", priority: "0.8", changefreq: "weekly" },
  { path: "/hindu/panchang", lastmod: "2026-05-10", priority: "0.85", changefreq: "daily" },
  { path: "/hindu/stotras", lastmod: "2026-05-10", priority: "0.8", changefreq: "weekly" },
  { path: "/hindu/temples", lastmod: "2026-05-10", priority: "0.7", changefreq: "monthly" },
  { path: "/hindu/feelings", lastmod: "2026-05-10", priority: "0.8", changefreq: "weekly" },
  { path: "/hindu/stories", lastmod: "2026-05-10", priority: "0.85", changefreq: "weekly" },
```

Note: deity-names sub-routes (`/hindu/names/:deity`) are dynamic and added by ingestion in a later phase.

**Step 2: Verify**

```bash
cd faith-web-remix && npm run dev
```

Visit `http://localhost:5173/sitemap.xml`. Confirm new entries are present and well-formed.

**Step 3: Commit**

```bash
cd faith-web-remix
git add app/routes/sitemap[.]xml.ts
git commit -m "feat(seo): add /hindu/* entries to sitemap"
```

---

### Task 9: Add stub frontend route files for `/hindu/*` modules

**Files:**
- Create (8 new files):
  - `faith-web-remix/app/routes/hindu.puja-times.tsx`
  - `faith-web-remix/app/routes/hindu.scriptures.tsx`
  - `faith-web-remix/app/routes/hindu.japa.tsx`
  - `faith-web-remix/app/routes/hindu.panchang.tsx`
  - `faith-web-remix/app/routes/hindu.stotras.tsx`
  - `faith-web-remix/app/routes/hindu.temples.tsx`
  - `faith-web-remix/app/routes/hindu.feelings.tsx`
  - `faith-web-remix/app/routes/hindu.stories.tsx`
- Modify: `faith-web-remix/app/routes.ts` (register new routes)

**Step 1: Create a shared placeholder component**

Create `faith-web-remix/app/components/HinduComingSoonSection.tsx`:

```tsx
import { Sparkles } from "lucide-react";

export function HinduComingSoonSection({ title }: { title: string }) {
  return (
    <section className="bg-[#FBF6EC] min-h-[calc(100vh-4.5rem)]">
      <div className="container-faith py-20 md:py-28 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#6B1F2A]/10 text-[#6B1F2A] text-xs font-semibold tracking-wide mb-6">
          <Sparkles size={14} />
          In development
        </div>
        <h1 className="text-4xl md:text-5xl font-bold font-playfair text-text mb-4">
          {title}
        </h1>
        <p className="text-text-secondary max-w-md mx-auto">
          This module is being built. We'll notify you when it ships.
        </p>
      </div>
    </section>
  );
}
```

**Step 2: Create 8 stub route files**

Each file uses the shared placeholder. Example for `hindu.puja-times.tsx`:

```tsx
import { HinduComingSoonSection } from "~/components/HinduComingSoonSection";

export function meta() {
  return [
    { title: "Sandhya & Puja Times | Siraat" },
    { name: "robots", content: "noindex" },  // remove when content ships
  ];
}

export default function HinduPujaTimes() {
  return <HinduComingSoonSection title="Sandhya & Puja Times" />;
}
```

Repeat with module-appropriate titles:
- `hindu.scriptures.tsx` → "Bhagavad Gita & Scriptures"
- `hindu.japa.tsx` → "Japa & Mantra Counter"
- `hindu.panchang.tsx` → "Today's Panchang"
- `hindu.stotras.tsx` → "Stotras, Aartis & Bhajans"
- `hindu.temples.tsx` → "Temple Locator"
- `hindu.feelings.tsx` → "Gita Verses for Every Emotion"
- `hindu.stories.tsx` → "Sacred Stories"

**Step 3: Register routes in `routes.ts`**

Replace the current single Hindu line:
```ts
  route("hindu", "routes/hindu.tsx"),
```

with:
```ts
  // Faith: Hindu
  route("hindu", "routes/hindu.tsx"),
  route("hindu/puja-times", "routes/hindu.puja-times.tsx"),
  route("hindu/scriptures", "routes/hindu.scriptures.tsx"),
  route("hindu/japa", "routes/hindu.japa.tsx"),
  route("hindu/panchang", "routes/hindu.panchang.tsx"),
  route("hindu/stotras", "routes/hindu.stotras.tsx"),
  route("hindu/temples", "routes/hindu.temples.tsx"),
  route("hindu/feelings", "routes/hindu.feelings.tsx"),
  route("hindu/stories", "routes/hindu.stories.tsx"),
```

Detail pages (e.g. `hindu/scriptures/:slug`, `hindu/stotras/:id`, `hindu/names/:deity`) are added in Phase 2/3 when they have content. Keeping the route table minimal here.

**Step 4: Verify**

```bash
cd faith-web-remix && npx tsc --noEmit 2>&1 | grep -v 'dhikr.tsx' | head -10
```

Expected: no TS errors.

```bash
npm run dev
```

Click each Hindu nav item from `/hindu`. Each route should load the coming-soon placeholder (no 404). Header should remain on the burgundy Hindu chrome throughout.

**Step 5: Commit**

```bash
cd faith-web-remix
git add app/components/HinduComingSoonSection.tsx app/routes/hindu.*.tsx app/routes.ts
git commit -m "feat(hindu-routes): add 8 placeholder routes wired into nav"
```

---

### Task 10: Scaffold backend `src/faiths/hindu/` skeleton (9 module stubs)

**Files:**
- Create directory: `unified-faith-service/src/faiths/hindu/`
- Create 9 stub modules under it (one per submodule)
- Create: `unified-faith-service/src/faiths/hindu/hindu.module.ts`

**Step 1: Create Puja-times stub**

Create `unified-faith-service/src/faiths/hindu/puja-times/puja-times.module.ts`:

```ts
import { Module } from '@nestjs/common';

@Module({
  controllers: [],
  providers: [],
  exports: [],
})
export class PujaTimesModule {}
```

**Step 2: Repeat for the other 8 submodules**

Create `*.module.ts` files at:
- `src/faiths/hindu/scriptures/scriptures.module.ts` — `class ScripturesModule {}`
- `src/faiths/hindu/japa/japa.module.ts` — `class JapaModule {}`
- `src/faiths/hindu/panchang/panchang.module.ts` — `class PanchangModule {}`
- `src/faiths/hindu/stotras/stotras.module.ts` — `class StotrasModule {}`
- `src/faiths/hindu/deity-names/deity-names.module.ts` — `class DeityNamesModule {}`
- `src/faiths/hindu/temple-locator/temple-locator.module.ts` — `class TempleLocatorModule {}`
- `src/faiths/hindu/feelings/feelings.module.ts` — `class HinduFeelingsModule {}` (note: `Hindu` prefix to avoid collision with `IslamFeelingsModule`)
- `src/faiths/hindu/sacred-stories/sacred-stories.module.ts` — `class SacredStoriesModule {}`

Each follows the same `@Module({ controllers: [], providers: [], exports: [] })` shape.

**Step 3: Create top-level `hindu.module.ts`**

Create `unified-faith-service/src/faiths/hindu/hindu.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { PujaTimesModule } from './puja-times/puja-times.module';
import { ScripturesModule } from './scriptures/scriptures.module';
import { JapaModule } from './japa/japa.module';
import { PanchangModule } from './panchang/panchang.module';
import { StotrasModule } from './stotras/stotras.module';
import { DeityNamesModule } from './deity-names/deity-names.module';
import { TempleLocatorModule } from './temple-locator/temple-locator.module';
import { HinduFeelingsModule } from './feelings/feelings.module';
import { SacredStoriesModule } from './sacred-stories/sacred-stories.module';

@Module({
  imports: [
    PujaTimesModule,
    ScripturesModule,
    JapaModule,
    PanchangModule,
    StotrasModule,
    DeityNamesModule,
    TempleLocatorModule,
    HinduFeelingsModule,
    SacredStoriesModule,
  ],
  exports: [
    PujaTimesModule,
    ScripturesModule,
    JapaModule,
    PanchangModule,
    StotrasModule,
    DeityNamesModule,
    TempleLocatorModule,
    HinduFeelingsModule,
    SacredStoriesModule,
  ],
})
export class HinduModule {}
```

**Step 4: Verify build**

```bash
cd unified-faith-service && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

**Step 5: Commit**

```bash
cd unified-faith-service
git add src/faiths/hindu/
git commit -m "feat(hindu): scaffold 9 submodule stubs and HinduModule"
```

---

### Task 11: Wire `HinduModule` into `FaithModule` and verify boot

**Files:**
- Modify: `unified-faith-service/src/faiths/faith.module.ts`

**Step 1: Import and register HinduModule**

Replace the entire file content:

```ts
import { Module } from '@nestjs/common';
import { IslamModule } from './islam/islam.module';
import { HinduModule } from './hindu/hindu.module';

@Module({
  imports: [IslamModule, HinduModule],
  exports: [IslamModule, HinduModule],
})
export class FaithModule {}
```

**Step 2: Verify the app boots**

```bash
cd unified-faith-service && npm run start:dev
```

Expected: boots cleanly, logs show all 9 Hindu submodules being initialized:
```
[Nest] LOG [InstanceLoader] PujaTimesModule dependencies initialized
[Nest] LOG [InstanceLoader] ScripturesModule dependencies initialized
... (etc)
```

Visit `http://localhost:3000/api/v1/islam/calendar/today` to confirm Islam endpoints still work (no regression). Stop the server (Ctrl+C).

**Step 3: Commit**

```bash
cd unified-faith-service
git add src/faiths/faith.module.ts
git commit -m "feat(hindu): wire HinduModule into FaithModule"
```

---

### Task 12: Add Prisma models for Hindu module (single migration)

**Files:**
- Modify: `unified-faith-service/prisma/schema.prisma` (add ~25 new models at end of file)

**Step 1: Add `Deity` model**

Append to `schema.prisma`:

```prisma
// ===== HINDU MODELS =====

model Deity {
  id            String        @id @default(uuid())
  slug          String        @unique
  nameEnglish   String        @map("name_english")
  nameSanskrit  String        @map("name_sanskrit")
  family        String?       // 'vaishnava' | 'shaiva' | 'shakta' | 'smarta' | 'pan'
  color         String?       // hex color for UI badge
  traditions    String[]
  createdAt     DateTime      @default(now()) @map("created_at")
  names         DeityName[]

  @@map("hindu_deities")
}
```

**Step 2: Add `DeityName` and `UserFavoriteDeityName`**

```prisma
model DeityName {
  id              String      @id @default(uuid())
  deityId         String      @map("deity_id")
  sequence        Int
  sanskritName    String      @map("sanskrit_name")
  transliteration String
  hindiName       String?     @map("hindi_name")
  englishMeaning  String      @map("english_meaning")
  description     String?
  createdAt       DateTime    @default(now()) @map("created_at")
  deity           Deity       @relation(fields: [deityId], references: [id], onDelete: Cascade)
  favorites       UserFavoriteDeityName[]

  @@index([deityId, sequence])
  @@map("hindu_deity_names")
}

model UserFavoriteDeityName {
  id           String     @id @default(uuid())
  userId       String     @map("user_id")
  deityNameId  String     @map("deity_name_id")
  createdAt    DateTime   @default(now()) @map("created_at")
  user         User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  deityName    DeityName  @relation(fields: [deityNameId], references: [id], onDelete: Cascade)

  @@unique([userId, deityNameId])
  @@map("hindu_user_favorite_deity_names")
}
```

**Step 3: Add Scripture models**

```prisma
model HinduText {
  id              String                 @id @default(uuid())
  slug            String                 @unique
  nameEnglish     String                 @map("name_english")
  nameSanskrit    String                 @map("name_sanskrit")
  type            String                 // 'gita' | 'sahasranama' | 'chalisa' | 'upanishad' | 'purana'
  totalVerses     Int                    @map("total_verses")
  isPremium       Boolean                @default(false) @map("is_premium")
  createdAt       DateTime               @default(now()) @map("created_at")
  chapters        HinduTextChapter[]
  verses          HinduTextVerse[]
  audios          HinduTextAudio[]

  @@map("hindu_texts")
}

model HinduTextChapter {
  id            String           @id @default(uuid())
  textId        String           @map("text_id")
  chapterNumber Int              @map("chapter_number")
  nameSanskrit  String?          @map("name_sanskrit")
  nameEnglish   String?          @map("name_english")
  text          HinduText        @relation(fields: [textId], references: [id], onDelete: Cascade)
  verses        HinduTextVerse[]
  audios        HinduTextAudio[]

  @@unique([textId, chapterNumber])
  @@map("hindu_text_chapters")
}

model HinduTextVerse {
  id              String                 @id @default(uuid())
  textId          String                 @map("text_id")
  chapterId       String?                @map("chapter_id")
  verseNumber     Int                    @map("verse_number")
  sanskritText    String                 @map("sanskrit_text") @db.Text
  transliteration String?                @db.Text
  createdAt       DateTime               @default(now()) @map("created_at")
  text            HinduText              @relation(fields: [textId], references: [id], onDelete: Cascade)
  chapter         HinduTextChapter?      @relation(fields: [chapterId], references: [id], onDelete: Cascade)
  translations    HinduTextTranslation[]
  bookmarks       HinduScriptureBookmark[]
  emotionRemedies HinduEmotionRemedy[]

  @@index([textId, chapterId, verseNumber])
  @@map("hindu_text_verses")
}

model HinduTextTranslation {
  id            String          @id @default(uuid())
  verseId       String          @map("verse_id")
  languageCode  String          @map("language_code")  // 'en' | 'hi' | 'sa' | 'ta' | 'bn' | ...
  authorName    String          @map("author_name")
  text          String          @db.Text
  isPremium     Boolean         @default(false) @map("is_premium")
  createdAt     DateTime        @default(now()) @map("created_at")
  verse         HinduTextVerse  @relation(fields: [verseId], references: [id], onDelete: Cascade)

  @@unique([verseId, languageCode, authorName])
  @@map("hindu_text_translations")
}

model HinduTextAudio {
  id            String             @id @default(uuid())
  textId        String             @map("text_id")
  chapterId     String?            @map("chapter_id")
  reciterSlug   String             @map("reciter_slug")
  url           String             @db.Text
  isPremium     Boolean            @default(false) @map("is_premium")
  createdAt     DateTime           @default(now()) @map("created_at")
  text          HinduText          @relation(fields: [textId], references: [id], onDelete: Cascade)
  chapter       HinduTextChapter?  @relation(fields: [chapterId], references: [id], onDelete: Cascade)

  @@map("hindu_text_audio")
}

model HinduScriptureBookmark {
  id          String          @id @default(uuid())
  userId      String          @map("user_id")
  verseId     String          @map("verse_id")
  note        String?         @db.Text
  createdAt   DateTime        @default(now()) @map("created_at")
  user        User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  verse       HinduTextVerse  @relation(fields: [verseId], references: [id], onDelete: Cascade)

  @@unique([userId, verseId])
  @@map("hindu_scripture_bookmarks")
}
```

**Step 4: Add Japa models**

```prisma
model JapaCounter {
  id             String     @id @default(uuid())
  userId         String     @map("user_id")
  name           String
  mantraSanskrit String?    @map("mantra_sanskrit")
  mantraEnglish  String?    @map("mantra_english")
  count          Int        @default(0)
  targetCount    Int?       @map("target_count")
  deityKey       String?    @map("deity_key")
  isActive       Boolean    @default(true) @map("is_active")
  createdAt      DateTime   @default(now()) @map("created_at")
  updatedAt      DateTime   @updatedAt @map("updated_at")
  user           User       @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("hindu_japa_counters")
}

model JapaGoal {
  id             String     @id @default(uuid())
  userId         String     @map("user_id")
  mantraSanskrit String     @map("mantra_sanskrit")
  targetCount    Int        @map("target_count")
  period         String     // 'daily' | 'weekly' | 'monthly'
  startDate      DateTime   @map("start_date")
  endDate        DateTime   @map("end_date")
  createdAt      DateTime   @default(now()) @map("created_at")
  user           User       @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("hindu_japa_goals")
}

model JapaHistory {
  id        String     @id @default(uuid())
  userId    String     @map("user_id")
  mantra    String
  count     Int
  date      DateTime
  createdAt DateTime   @default(now()) @map("created_at")
  user      User       @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, date])
  @@map("hindu_japa_history")
}
```

**Step 5: Add Panchang models**

```prisma
model HinduFestival {
  id            String   @id @default(uuid())
  slug          String   @unique
  nameEnglish   String   @map("name_english")
  nameSanskrit  String?  @map("name_sanskrit")
  nameHindi     String?  @map("name_hindi")
  ruleSpec      Json     @map("rule_spec")
  deityKey      String?  @map("deity_key")
  regions       String[]
  description   String?  @db.Text
  createdAt     DateTime @default(now()) @map("created_at")

  @@map("hindu_festivals")
}

model PujaLog {
  id        String   @id @default(uuid())
  userId    String   @map("user_id")
  sandhya   String   // 'pratah' | 'madhyahna' | 'sayam'
  date      DateTime
  status    String   // 'on_time' | 'late' | 'missed'
  createdAt DateTime @default(now()) @map("created_at")
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, date])
  @@map("hindu_puja_logs")
}
```

**Step 6: Add Stotra models**

```prisma
model StotraCategory {
  id        String   @id @default(uuid())
  slug      String   @unique
  name      String
  deityKey  String?  @map("deity_key")
  createdAt DateTime @default(now()) @map("created_at")
  stotras   Stotra[]

  @@map("hindu_stotra_categories")
}

model Stotra {
  id              String                @id @default(uuid())
  categoryId      String                @map("category_id")
  slug            String                @unique
  titleSanskrit   String                @map("title_sanskrit")
  titleEnglish    String                @map("title_english")
  type            String                // 'stotra' | 'aarti' | 'bhajan'
  deityKey        String?               @map("deity_key")
  isPremium       Boolean               @default(false) @map("is_premium")
  createdAt       DateTime              @default(now()) @map("created_at")
  category        StotraCategory        @relation(fields: [categoryId], references: [id], onDelete: Cascade)
  verses          StotraVerse[]
  audios          StotraAudio[]
  favorites       UserFavoriteStotra[]

  @@map("hindu_stotras")
}

model StotraVerse {
  id              String              @id @default(uuid())
  stotraId        String              @map("stotra_id")
  verseNumber     Int                 @map("verse_number")
  sanskritText    String              @map("sanskrit_text") @db.Text
  transliteration String?             @db.Text
  stotra          Stotra              @relation(fields: [stotraId], references: [id], onDelete: Cascade)
  translations    StotraTranslation[]

  @@unique([stotraId, verseNumber])
  @@map("hindu_stotra_verses")
}

model StotraTranslation {
  id            String       @id @default(uuid())
  verseId       String       @map("verse_id")
  languageCode  String       @map("language_code")
  text          String       @db.Text
  verse         StotraVerse  @relation(fields: [verseId], references: [id], onDelete: Cascade)

  @@unique([verseId, languageCode])
  @@map("hindu_stotra_translations")
}

model StotraAudio {
  id          String   @id @default(uuid())
  stotraId    String   @map("stotra_id")
  reciterSlug String   @map("reciter_slug")
  url         String   @db.Text
  stotra      Stotra   @relation(fields: [stotraId], references: [id], onDelete: Cascade)

  @@map("hindu_stotra_audio")
}

model UserFavoriteStotra {
  id        String   @id @default(uuid())
  userId    String   @map("user_id")
  stotraId  String   @map("stotra_id")
  createdAt DateTime @default(now()) @map("created_at")
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  stotra    Stotra   @relation(fields: [stotraId], references: [id], onDelete: Cascade)

  @@unique([userId, stotraId])
  @@map("hindu_user_favorite_stotras")
}
```

**Step 7: Add Temple models**

```prisma
model Temple {
  id            String                @id @default(uuid())
  name          String
  deityKey      String?               @map("deity_key")
  lat           Float
  lng           Float
  address       String                @db.Text
  city          String?
  country       String
  photos        String[]
  googlePlaceId String?               @map("google_place_id")
  source        String                // 'curated' | 'google'
  createdAt     DateTime              @default(now()) @map("created_at")
  favorites     UserFavoriteTemple[]

  @@index([lat, lng])
  @@map("hindu_temples")
}

model UserFavoriteTemple {
  id        String   @id @default(uuid())
  userId    String   @map("user_id")
  templeId  String   @map("temple_id")
  createdAt DateTime @default(now()) @map("created_at")
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  temple    Temple   @relation(fields: [templeId], references: [id], onDelete: Cascade)

  @@unique([userId, templeId])
  @@map("hindu_user_favorite_temples")
}
```

**Step 8: Add Feelings models**

```prisma
model HinduEmotion {
  id          String                @id @default(uuid())
  slug        String                @unique
  nameEnglish String                @map("name_english")
  nameHindi   String?               @map("name_hindi")
  icon        String?
  createdAt   DateTime              @default(now()) @map("created_at")
  remedies    HinduEmotionRemedy[]

  @@map("hindu_emotions")
}

model HinduEmotionRemedy {
  id        String          @id @default(uuid())
  emotionId String          @map("emotion_id")
  verseId   String          @map("verse_id")
  note      String?         @db.Text
  sequence  Int             @default(0)
  emotion   HinduEmotion    @relation(fields: [emotionId], references: [id], onDelete: Cascade)
  verse     HinduTextVerse  @relation(fields: [verseId], references: [id], onDelete: Cascade)

  @@unique([emotionId, verseId])
  @@index([emotionId, sequence])
  @@map("hindu_emotion_remedies")
}
```

**Step 9: Add Sacred Stories models**

```prisma
model HinduStoryCollection {
  id          String              @id @default(uuid())
  slug        String              @unique
  name        String
  sourceText  String              @map("source_text") // 'bhagavata_purana' | 'ramayana' | 'saint_lives' | 'panchatantra'
  isPremium   Boolean             @default(false) @map("is_premium")
  createdAt   DateTime            @default(now()) @map("created_at")
  stories     HinduStory[]

  @@map("hindu_story_collections")
}

model HinduStory {
  id            String                    @id @default(uuid())
  collectionId  String                    @map("collection_id")
  storyNumber   Int?                      @map("story_number")
  title         String
  summary       String                    @db.Text
  body          String                    @db.Text
  deityKey      String?                   @map("deity_key")
  characters    String[]
  createdAt     DateTime                  @default(now()) @map("created_at")
  collection    HinduStoryCollection      @relation(fields: [collectionId], references: [id], onDelete: Cascade)
  translations  HinduStoryTranslation[]
  favorites     UserFavoriteHinduStory[]

  @@map("hindu_stories")
}

model HinduStoryTranslation {
  id            String      @id @default(uuid())
  storyId       String      @map("story_id")
  languageCode  String      @map("language_code")
  body          String      @db.Text
  story         HinduStory  @relation(fields: [storyId], references: [id], onDelete: Cascade)

  @@unique([storyId, languageCode])
  @@map("hindu_story_translations")
}

model UserFavoriteHinduStory {
  id        String      @id @default(uuid())
  userId    String      @map("user_id")
  storyId   String      @map("story_id")
  createdAt DateTime    @default(now()) @map("created_at")
  user      User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  story     HinduStory  @relation(fields: [storyId], references: [id], onDelete: Cascade)

  @@unique([userId, storyId])
  @@map("hindu_user_favorite_stories")
}
```

**Step 10: Add inverse relations to existing `User` model**

Find the existing `User` model in `schema.prisma` and append to its relation list (alongside the existing Islam-related back-relations):

```prisma
  // Hindu module back-relations
  hinduScriptureBookmarks    HinduScriptureBookmark[]
  hinduFavoriteDeityNames    UserFavoriteDeityName[]
  hinduFavoriteStotras       UserFavoriteStotra[]
  hinduFavoriteTemples       UserFavoriteTemple[]
  hinduFavoriteStories       UserFavoriteHinduStory[]
  japaCounters               JapaCounter[]
  japaGoals                  JapaGoal[]
  japaHistory                JapaHistory[]
  pujaLogs                   PujaLog[]
```

**Step 11: Verify Prisma schema is valid**

```bash
cd unified-faith-service && npx prisma validate
```

Expected: `The schema at prisma/schema.prisma is valid 🚀`

If errors appear, fix them before proceeding.

**Step 12: Commit (schema only — migration is the next task)**

```bash
cd unified-faith-service
git add prisma/schema.prisma
git commit -m "feat(prisma): add 25 Hindu models with relations and indexes"
```

---

### Task 13: Generate and run the Hindu migration

**Files:**
- Generated: `unified-faith-service/prisma/migrations/<timestamp>_add_hindu_module/`

**Step 1: Create migration**

```bash
cd unified-faith-service
npm run prisma:migrate
```

When prompted for migration name, enter: `add_hindu_module`

Expected:
- New folder under `prisma/migrations/<timestamp>_add_hindu_module/`
- `migration.sql` containing CREATE TABLE statements for all 25 new tables
- Database has the new tables (Prisma applies migration immediately in dev mode)

**Step 2: Verify tables exist**

```bash
npx prisma studio &
```

Browse — confirm 25 new `hindu_*` tables. Close Studio.

Or via psql if available:
```bash
psql $DATABASE_URL -c "\dt hindu_*"
```

Expected: 25 tables listed.

**Step 3: Regenerate Prisma client**

```bash
npm run prisma:generate
```

**Step 4: Verify backend still typechecks**

```bash
npx tsc --noEmit 2>&1 | head -10
```

Expected: no errors. Hindu types now available on `prisma.hinduText`, `prisma.deity`, etc.

**Step 5: Commit**

```bash
cd unified-faith-service
git add prisma/migrations/
git commit -m "feat(prisma): apply add_hindu_module migration (25 tables)"
```

---

### Task 14: Final smoke test of Phase 0

**Step 1: Restart everything fresh**

```bash
# In unified-faith-service/
npm run start:dev
```

```bash
# In faith-web-remix/ (separate terminal)
npm run dev
```

**Step 2: Backend smoke test**

- App boots without errors
- All 9 Hindu submodules logged as initialized
- `GET http://localhost:3000/api/v1/islam/calendar/today` still works (Islam regression check)

**Step 3: Frontend smoke test (`/`)**

- Visit `http://localhost:5173/` — neutral landing renders, no green/burgundy bleeding into chrome

**Step 4: Frontend smoke test (`/islam/*`)**

- Visit `http://localhost:5173/islam/prayers` — green chrome, Islamic nav, no regression
- Visit `http://localhost:5173/islam` — Islam home renders fine

**Step 5: Frontend smoke test (`/hindu/*`)**

- Visit `http://localhost:5173/hindu` — burgundy chrome, kolam pattern, 9 Hindu nav items
- Click each Hindu nav item — each loads coming-soon placeholder, chrome stays burgundy
- View page source on `/hindu` — `<title>` is the Hindu meta, BreadcrumbList JSON-LD includes "Hinduism"
- Visit `http://localhost:5173/sitemap.xml` — `/hindu/*` entries present

**Step 6: Auth flow smoke test**

- Register a new account with `faith=hindu` from the picker — should succeed, persist `faith=hindu` in `UserPreference`, and redirect to `/hindu`
- Logout, log back in — same redirect to `/hindu`

**Step 7: Commit any final tweaks if smoke test surfaces issues**

```bash
git add -A && git commit -m "fix: <whatever>"  # only if needed
```

**Step 8: Push the Phase 0 branches** (assumes remote is configured)

```bash
cd unified-faith-service && git push -u origin feat/hindu-foundation
cd ../faith-web-remix && git push -u origin feat/hindu-foundation
```

Open PRs against `main` for both repos.

---

## Phases 1-4 — milestone outlines

Each phase below gets its own writing-plans invocation when its phase starts. The outlines here are for scope/sequencing visibility only. **Do not attempt to execute Phases 1-4 from this document — invoke writing-plans first.**

### Phase 1 — Foundational features (Weeks 3-7)

| Week | Deliverable | New endpoints (sketch) |
|---|---|---|
| 3-4 | **Panchang module** — swisseph integration, Tithi/Nakshatra/Yoga/Karana service | `GET /api/v1/hindu/panchang/today`, `GET /api/v1/hindu/panchang/date/:date` |
| 5 | **Festival rule engine + 30 festival seed** | `GET /api/v1/hindu/panchang/festivals`, `GET .../festivals/upcoming` |
| 6 | **Puja-times** (Sandhya calc + log) | `GET /api/v1/hindu/puja-times/today`, `POST .../log` |
| 7 | **Japa** — counters/goals/history mirroring dhikr | `GET/POST /api/v1/hindu/japa/counters`, `.../goals`, `.../history`, `.../mantras` |

End of Phase 1: 4 of 9 Hindu modules live with real content. `/hindu/panchang`, `/hindu/puja-times`, `/hindu/japa` no longer placeholders.

### Phase 2 — Scriptures backbone (Weeks 8-13)

| Week | Deliverable |
|---|---|
| 8 | Scriptures backend models verified, ingestion infra written |
| 9-10 | **Bhagavad Gita** seeded (700 verses + Sanskrit + English Aurobindo + Hindi PD) |
| 11 | **Hanuman Chalisa + Vishnu Sahasranama** seeded with audio (Cloudflare R2 hosting set up) |
| 12 | Scriptures frontend (chapter nav, verse view, audio player, bookmark UI) |
| 13 | **Deity Names** module + 108 × 6 deities seed + frontend listing |

End of Phase 2: `/hindu/scriptures`, `/hindu/scriptures/bhagavad-gita`, `/hindu/names/:deity` all live.

### Phase 3 — Devotional content (Weeks 14-18)

| Week | Deliverable |
|---|---|
| 14-15 | **Stotras** backend + seed (~30 stotras and aartis with text + audio for top 5) |
| 16 | Stotras frontend (listing, detail, favorites) |
| 17 | **Sacred Stories** backend + seed (~50 stories from Bhagavata Purana + Saint Lives) |
| 18 | **Feelings/mood-Gita** mapping (12 emotions × 4-6 verses) + frontend |

End of Phase 3: 8 of 9 modules live. Only Temple Locator remains.

### Phase 4 — Temple locator + polish (Weeks 19-22)

| Week | Deliverable |
|---|---|
| 19-20 | **Temple Locator** — curated 200-temple seed + Google Places fallback + frontend map view |
| 21 | **Hindu home** assembly (greeting, panchang card, sandhya card, daily verse, daily mantra, daily name, festivals, mood widget) + **Deity picker (Ishta Devata)** UX (inline-on-home + settings page) |
| 22 | Full QA, scholarly review pass, SEO audit, content corrections, launch prep, PR push |

End of Phase 4: Hindu launch.

---

## Open decisions to resolve before each phase

These are tracked in the design doc and will be confirmed at the start of their respective phases:

1. **Phase 1 W3:** Swisseph license — pay €600 commercial vs use pure-JS port. Decide before starting.
2. **Phase 2 W11:** Specific PD audio reciters for Hanuman Chalisa, Vishnu Sahasranama, Gayatri Mantra. Content lead picks.
3. **Phase 4 W19:** Temple data source — curated-only vs Google Places hybrid vs Mapbox.
4. **Phase 2 W8:** Premium tier strategy for Hindu content (mirror Islam's premium-translations-and-reciters pattern).
5. **Phase 0 W2 (during this plan):** Editorial policy doc for sect attribution and content-source citation. Drafted before content seeding begins.
6. **Project-wide:** Add Jest/Vitest to the test stack? Currently zero tests; this plan uses manual verification. Worth a separate decision.

---

## Phase 0 commit checklist (success criteria)

By the end of Phase 0 you should have ~13 commits across two repos with this shape:

**Backend (`unified-faith-service`)**
- `chore: align Hindu feature list to canonical 9-module spec`
- `feat(hindu): scaffold 9 submodule stubs and HinduModule`
- `feat(hindu): wire HinduModule into FaithModule`
- `feat(prisma): add 25 Hindu models with relations and indexes`
- `feat(prisma): apply add_hindu_module migration (25 tables)`

**Frontend (`faith-web-remix`)**
- `chore: align Hindu tagline to canonical feature spec`
- `feat(theme): add Hindu palette tokens and Devanagari font`
- `feat(theme): add Hindu hero gradient, kolam pattern, and primary button`
- `feat(faith-config): activate Hindu nav with 9 module entries`
- `feat(header): 3-way faith chrome (Islam green / Hindu burgundy / neutral)`
- `feat(footer): 3-way faith chrome and Hindu brand copy`
- `feat(seo): add /hindu/* meta tags and breadcrumb schema entries`
- `feat(seo): add /hindu/* entries to sitemap`
- `feat(hindu-routes): add 8 placeholder routes wired into nav`

**Functional outcomes:**
- ✅ All `/hindu/*` routes load (no 404s)
- ✅ Burgundy + kolam chrome on `/hindu/*`
- ✅ Green chrome unchanged on `/islam/*`
- ✅ Neutral chrome unchanged on `/`
- ✅ 25 Hindu DB tables exist with all relations
- ✅ HinduModule boots without errors
- ✅ Sitemap includes all top-level Hindu paths
- ✅ Hindi user can register with `faith=hindu` and lands on `/hindu`

When all of the above hold, Phase 0 is done — invoke writing-plans again with this design + Phase 1 outline to start Phase 1.
