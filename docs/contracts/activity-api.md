# Activity API Contract — Retention Engine Phase 1

**Status:** Frozen as of 2026-10-08.
**Scope:** The four Phase 1 endpoints only. `/challenges`, `/circle` and `/pulse` are Phase 2–3 and are deliberately absent.
**Change policy:** This document is the interface between the backend track (Tasks 1.3–1.7) and the mobile track (Tasks 1.8–1.15), which run in parallel against it. Any change after the freeze requires re-cutting both tracks — raise it, do not patch it on one side.

Design doc: `faith_mobile/docs/plans/2026-10-08-retention-engine-design.md` §4, §5, §8.

---

## Base URL

```
http://localhost:3000        # local development
https://www.siraat.website   # production (mobile default, dio_client.dart)
```

> Note: `APIs.md` documents `localhost:8000`. The server actually defaults to `3000` (`src/main.ts`, `PORT`). Use `3000` locally.

## Authentication

Every endpoint in this document requires a Bearer token. There are no public activity endpoints.

```
Authorization: Bearer <accessToken>
Content-Type: application/json
```

The user is taken from the token (`JwtAuthGuard` + `@CurrentUser()`). **There is no `userId` in any request body or query string** — a client cannot write activity for another user, and must not try.

---

## Table of Contents

1. [Shared vocabulary](#1-shared-vocabulary) — enums, formats, `sourceRef`
2. [Normative rules](#2-normative-rules) — local day, goal met, streak, freezes
3. [Error shape](#3-error-shape)
4. [`POST /api/v1/activity/events`](#4-post-apiv1activityevents)
5. [`GET /api/v1/activity/today`](#5-get-apiv1activitytoday)
6. [`GET /api/v1/activity/history`](#6-get-apiv1activityhistory)
7. [`PUT /api/v1/activity/goal`](#7-put-apiv1activitygoal)
8. [Client implementation checklist](#8-client-implementation-checklist)

---

## 1. Shared vocabulary

### 1.1 `faithId`

| Value | Meaning |
|---|---|
| `islam` | Islam content pack |
| `hindu` | Hindu content pack |

Lowercase, exact. Any other value is rejected (`unknown_faith_id`). A user may hold activity, a goal and a streak under **both** faiths simultaneously; they are entirely independent projections. `faithId` is a required discriminator on every request in this document.

### 1.2 `activityType`

| `activityType` | `faithId` | Unit of `quantity` | Recorded from |
|---|---|---|---|
| `quran_verse` | `islam` | one verse (ayah) | Qur'an reader |
| `prayer` | `islam` | one prayer logged | Prayer log |
| `dhikr` | `islam` | one dhikr repetition | Dhikr counter |
| `gita_shloka` | `hindu` | one shloka | Gita reader |
| `sandhya` | `hindu` | one sandhya logged | Sandhya log |
| `japa_mala` | `hindu` | one completed mala (108 beads) | Japa counter |

An `activityType` belongs to exactly one faith. Sending `faithId: "islam"` with `activityType: "gita_shloka"` is an error (`activity_type_faith_mismatch`) — it is not silently re-homed.

### 1.3 `goalType`

`goalType` names the **unit the user sets a target in**, which is why it is plural and reads in English (`verses`) rather than mirroring `activityType` (`quran_verse`). Each `goalType` counts exactly one `activityType`.

| `goalType` | `faithId` | Counts | Target range | Example UI |
|---|---|---|---|---|
| `verses` | `islam` | `quran_verse` | 1–1000 | "5 / 5 verses" |
| `prayers` | `islam` | `prayer` | 1–5 | "4 / 5 prayers" |
| `dhikr` | `islam` | `dhikr` | 1–10000 | "40 / 100 dhikr" |
| `shlokas` | `hindu` | `gita_shloka` | 1–1000 | "3 / 3 shlokas" |
| `sandhyas` | `hindu` | `sandhya` | 1–3 | "2 / 3 sandhyas" |
| `malas` | `hindu` | `japa_mala` | 1–108 | "1 / 2 malas" |

Deliberately **not** in Phase 1: `pages` (needs a verse→page map) and `minutes` (needs the reader session from Phase 2). Do not send them; they are rejected as unknown.

### 1.4 Unknown enum values

Unknown `faithId`, `activityType` or `goalType` is **always an error, never a silent default and never stored**. The server does not accept forward-compatible values — a new activity type requires a deployed server that knows it. Within a `POST /events` batch the rejection is per-event (§4.4); on `/today`, `/history` and `/goal` it fails the whole request with `400`.

### 1.5 Date and time formats

| Field | Type | Format | Example | Notes |
|---|---|---|---|---|
| `localDay` | **calendar date** | `YYYY-MM-DD` | `"2026-10-08"` | No time, no zone, no `T`. This is the day the user believes it was. Streaks count these. |
| `from`, `to` | calendar date | `YYYY-MM-DD` | `"2026-10-01"` | Same as `localDay`. |
| `occurredAt` | **instant** | RFC 3339 / ISO 8601 | `"2026-10-08T14:03:22Z"` | Must carry a zone. `Z` preferred; a numeric offset (`+05:30`) is accepted and normalised to UTC on the way in. A bare `2026-10-08T14:03:22` with no zone is rejected. Milliseconds are accepted and preserved. |
| `timezone` | IANA zone name | tz database identifier | `"Asia/Kolkata"` | Never a fixed offset (`+05:30`), never an abbreviation (`IST`). On Flutter, use the IANA name from the device, not `DateTime.timeZoneName`. |
| `updatedAt`, `freezeResetOn` | instant / date | as labelled per field | | Response-only. |

**All dates and instants in responses are UTC.** `localDay` values in responses are the user's local days, unconverted.

### 1.6 `sourceRef`

Optional free-form string, max 128 characters, stored verbatim and not validated in Phase 1. It is load-bearing from Phase 2 (challenge progress is derived from it — "Surah Kahf" matches `quran:18:*`), so clients **must** emit it in the documented shape now.

| `activityType` | `sourceRef` format | Example |
|---|---|---|
| `quran_verse` | `quran:<surah>:<ayah>` | `quran:2:148` |
| `prayer` | `prayer:<name>` — `fajr`, `dhuhr`, `asr`, `maghrib`, `isha` | `prayer:fajr` |
| `dhikr` | `dhikr:<counterId>` | `dhikr:3f9c1a7e-...` |
| `gita_shloka` | `gita:<chapter>:<verse>` | `gita:11:32` |
| `sandhya` | `sandhya:<name>` — `pratah`, `madhyahna`, `sayam` | `sandhya:pratah` |
| `japa_mala` | `japa:<mantraId>` | `japa:om-namah-shivaya` |

Omit the field, or send `null`, when there is genuinely no reference. Do not send an empty string.

### 1.7 Unknown request fields are silently stripped

The global `ValidationPipe` runs with `whitelist: true, forbidNonWhitelisted: false` (`src/main.ts`). A field not in this contract is **dropped without an error** — it is not stored and the request still succeeds. If you add `deviceModel` to an event and it never appears anywhere, this is why. Adding a field requires a contract change and a server deploy.

---

## 2. Normative rules

These rules are duplicated in the mobile local streak engine (Task 1.10). The two implementations disagreeing is a bug in whichever one departs from this section.

### 2.1 The local day is authoritative, and the device stamps it

Streaks are counted over `localDay`, never over `occurredAt`. The device decides what day it is and says so.

### 2.2 How the server validates `localDay`

```
abs( localDay  −  dateOf(occurredAt in UTC) )  ≤  1 day
```

Read that carefully — the reference day is derived from **the event's own `occurredAt`**, not from the server's wall clock at the time the request arrives.

This matters enormously, and it is the single rule most likely to be implemented wrongly:

- Validating against *server today* would reject every event in a batch that had been queued offline for more than a day, which is exactly the case offline support exists for. A three-day flight with no signal would discard three days of worship.
- Validating against the event's own `occurredAt` is time-of-arrival independent. An event queued on 2026-10-08 and flushed on 2026-10-14 validates identically on both days.
- `±1` rather than `±0` covers the full civil range of UTC−12 to UTC+14. A user in `Pacific/Kiritimati` (UTC+14) at 01:00 local is still on the previous UTC date; a user in `Pacific/Niue` (UTC−11) at 23:00 is on the next. Both are honest and both must pass.

Consequences the client should know:

- **`timezone` is stored, not used for this validation.** A wrong-but-well-formed IANA string never causes a rejection. It is retained for rollup, display and the Phase 1.15 reminder.
- **This check does not detect a tampered clock.** The device supplies both `localDay` and `occurredAt`, so a phone set forward produces a self-consistent pair that passes. That is accepted deliberately (design §8, "Clock tampering"): the leaderboard is friends-only by invite, so the only person cheated is the cheater. The checks below exist to bound storage and nonsense, not to police honesty.

### 2.3 Bounds on `occurredAt`

| Condition | Result |
|---|---|
| `occurredAt` more than **24 hours in the future** of server receipt time | rejected, `occurred_at_in_future` |
| `occurredAt` more than **90 days in the past** of server receipt time | rejected, `occurred_at_too_old` |

90 days is generous on purpose: the device queue holds ~5000 rows and a user can be offline or have the app closed for a long time. An event older than 90 days is far likelier to be a corrupt queue row than a real act of worship the user is still waiting to see counted.

### 2.4 How `goal.met` is computed

For the user's `localDay` D, faith F and current goal `(goalType, target)`:

```
progress = SUM(quantity) of all ActivityEvents
           where userId = me, faithId = F, localDay = D,
                 activityType = the one activityType that goalType counts
met      = progress >= target
```

It is a **sum of `quantity`**, not a count of events. Three `dhikr` events of `quantity: 33` make `progress = 99`, not `3`.

If the user has **no goal set** for that faith, `met` is `false` and `goal` is `null` in responses. The server never invents a default target. The client may display a suggested default (5 verses / 1 mala) but until the user confirms it with `PUT /goal` there is no goal and no day can be met.

### 2.5 How `streak.current` is computed

`current` is the length of the unbroken run of goal-met days ending at the **most recent goal-met day**, walking backwards and spending freezes (§2.6) on gaps.

The practical consequence, which the client must render correctly:

- A user with a 25-day run who met the goal yesterday and has done nothing yet today sees `current: 25` and `goal.met: false` all morning. **The streak does not drop to 24 overnight.**
- When today's goal is met, `current` becomes `26` and `goal.met` becomes `true`.
- So `streak.current` includes today **if and only if `goal.met` is `true`**. That one sentence is the contract; there is no separate flag.

The streak is `0` when the most recent goal-met day is further back than freezes can bridge, and `0` for a user who has never met a goal.

`longest` is the longest such run ever achieved, and never decreases.

### 2.6 Streak freezes

- **Two per calendar month**, in the user's timezone, applied automatically. The user is never asked and cannot spend them manually.
- A freeze is consumed **lazily, at evaluation time**, by a gap day inside an otherwise-unbroken run — not at the moment the day passes. A user who misses Tuesday and returns on Wednesday has one freeze consumed when the streak is next computed.
- One freeze bridges exactly **one** missed day. Two consecutive missed days need two freezes.
- With no freezes left, a gap breaks the streak: `current` resets and `longest` is preserved.
- `freezesLeft` is reported **after** any freezes already consumed this month, and **excludes today** — today is not a gap until it is over.
- `freezeResetOn` is the date the allowance returns to 2: the first day of the next calendar month in the user's timezone.

**Worked example — the one that catches people.** The goal was met every day from Oct 1 to Oct 25. Oct 26 was missed. Two freezes were available.

| When | Walk starts at | Oct 26 examined? | `streak.current` | `streak.freezesLeft` |
|---|---|---|---|---|
| Morning of Oct 27, goal not yet met | Oct 25 (the most recent goal-met day) | **No** | `25` | `2` |
| Oct 27, after the goal is met | Oct 27 | Yes — one freeze spent bridging it | `26` | `1` |

Because the walk begins at the most recent goal-met day, a gap behind it is never examined and therefore never charged. A freeze is spent only at the moment it actually bridges something. The intuitive-but-wrong implementation spends the freeze eagerly on Oct 26 and shows `freezesLeft: 1` all morning; per §2.7 the server then overrides it on the next sync and the user watches their freeze count change for no reason. Lazy consumption is the contract.

### 2.7 Reconciliation — the server wins

The client computes streak and goal locally for instant UI and then reconciles against `GET /today`. Where they disagree, **the server's value is correct and the client adopts it**. Animate to the server's number rather than snapping; a silent correction reads as a bug (design §8).

### 2.8 When a day is closed

`goalMet` on `GET /history` is described as the value a day had "when it closed". A day D is **closed** once D has ended in the timezone carried by that day's own events — that is, once the instant `end of D, in that timezone` has passed. The timezone is read from the events stored against D; where a day carries several (a user who flew), the latest event's timezone governs. For a day with no events at all, the timezone of the user's most recent event before it governs, falling back to `UTC`.

The nightly rollup cron (Task 1.7) persists closed days into `DailyRollup`, but it runs on a fixed schedule and the world has 38 UTC offsets, so a day will routinely be closed for the user before the cron reaches it. **Any day not yet persisted is computed on read**, from the event stream, and returned identically. A client can never tell whether a given day came from the rollup cache or from a live computation, and must not depend on the distinction. This is also why `/history` needs no `timezone` parameter: closure is derived from what the events themselves recorded.

### 2.9 Points are not in Phase 1

`DailyRollup` carries a `points` column, but the weighting is not decided until the social layer (Phase 3). **No Phase 1 response returns `points`.** Do not render it, do not depend on it appearing later in a given shape.

---

## 3. Error shape

Matching `APIs.md` § Error Responses, with one addition:

```json
{
  "statusCode": 400,
  "message": "Human-readable sentence, for logs. Not for branching on.",
  "code": "stable_machine_code",
  "errors": {
    "target": ["target must not be greater than 1000"]
  }
}
```

| Field | Always present | Notes |
|---|---|---|
| `statusCode` | yes | Mirrors the HTTP status. |
| `message` | yes | English prose. **Never branch on it.** It may be reworded at any time without a contract change. |
| `code` | yes, on every error in this document | Stable, lowercase snake_case. This is the only field a client may branch on. |
| `errors` | only on field validation failures | Map of field name → array of messages, for developer display. |

**Implementation note (Tasks 1.4 / 1.6):** Nest's default `ValidationPipe` emits `{statusCode, message: string[], error}`, which is *not* the shape above, and the repo currently registers no `exceptionFactory` or exception filter. The activity module must supply one so these responses match this contract. This is a known gap, recorded here so it is not discovered by the mobile client at integration time.

### Errors common to all four endpoints

| Status | `code` | When |
|---|---|---|
| `401` | `unauthorized` | Missing, malformed, invalid or expired Bearer token. The client must refresh the token and retry once; if the refresh fails, send the user to login and **keep the local queue intact** — those events are still valid. |
| `400` | `unknown_faith_id` | `faithId` is absent or not `islam` \| `hindu`. |
| `500` | `internal_error` | Unhandled server fault. Retryable. |

```json
{
  "statusCode": 401,
  "message": "Unauthorized - Invalid or missing token",
  "code": "unauthorized"
}
```

---

## 4. `POST /api/v1/activity/events`

**Endpoint:** `POST /api/v1/activity/events`

**Description:** Ingest a batch of activity events. Idempotent on `clientEventId`. This is the only write path for activity; everything else in the retention engine is a projection over what this endpoint stores.

**Auth:** required.

### 4.1 Request body

| Field | Type | Required | Rules |
|---|---|---|---|
| `events` | array of Event | yes | 1–100 items. Empty array is an error. |

**Event object**

| Field | Type | Required | Rules |
|---|---|---|---|
| `clientEventId` | string (UUID) | yes | **Any well-formed UUID**, minted on the device. Unique per user, forever. See §4.3 and §4.3.1. |
| `faithId` | string enum | yes | §1.1 |
| `activityType` | string enum | yes | §1.2, and must belong to `faithId` |
| `quantity` | integer | no — defaults to `1` | `1 … 10000`. Must be a positive integer; `0`, negatives and fractions are rejected. |
| `occurredAt` | RFC 3339 instant | yes | §1.5, bounded by §2.3 |
| `localDay` | `YYYY-MM-DD` | yes | §1.5, validated by §2.2 |
| `timezone` | IANA zone | yes | §1.5. Stored, not validated against `localDay`. |
| `sourceRef` | string \| null | no | max 128 chars, §1.6 |

A single batch may mix faiths, activity types, `localDay` values and timezones freely. A user who flew Delhi→London mid-queue produces exactly that, and it is valid.

```bash
curl -X POST http://localhost:3000/api/v1/activity/events \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "events": [
      {
        "clientEventId": "6f1b2c4e-9d3a-4f87-9f1a-2c7f0b5d8e10",
        "faithId": "islam",
        "activityType": "quran_verse",
        "quantity": 1,
        "occurredAt": "2026-10-08T14:03:22Z",
        "localDay": "2026-10-08",
        "timezone": "Asia/Kolkata",
        "sourceRef": "quran:2:148"
      },
      {
        "clientEventId": "b2d4e6f8-0a1c-4e3d-8b5a-7c9e1f3a5b7d",
        "faithId": "islam",
        "activityType": "prayer",
        "quantity": 1,
        "occurredAt": "2026-10-08T12:41:00Z",
        "localDay": "2026-10-08",
        "timezone": "Asia/Kolkata",
        "sourceRef": "prayer:dhuhr"
      }
    ]
  }'
```

### 4.2 The batch is partial, not atomic

**One invalid event does not fail the other 49.** Valid events are written; invalid ones come back individually in `rejected[]`. The response is `200` even when some events are rejected.

Justification, in one line: all-or-nothing creates a poison pill — a single permanently-invalid row in a device queue would block every event behind it forever, and a flaky-network client has no way to identify or remove it, so the user's streak dies because of one corrupt row they cannot see.

`400` is therefore reserved for failures of the **envelope** — malformed JSON, a missing or non-array `events`, an empty array, or more than 100 items — where no per-event result is meaningful.

### 4.3 Idempotency

- The server enforces `@@unique([userId, clientEventId])`.
- Re-sending a batch any number of times writes each event exactly once. A full re-send of an already-accepted batch returns `{"accepted": 0, "duplicates": 50, "rejected": []}`.
- **First write wins.** If the same `clientEventId` arrives with a different payload, the stored row is *not* updated — the second is counted as a duplicate and the original stands. The device must therefore never reuse a `clientEventId` for different content. Mint a fresh UUID per recorded act, persist it with the queue row, and reuse it only for retries of that same row.
- A `clientEventId` repeated **within a single batch** follows the same rule: the first occurrence is accepted, later ones are counted as duplicates.
- `clientEventId` is scoped to the user. Two users may theoretically mint the same UUID without collision.

#### §4.3.1 Any UUID version is valid — do not narrow this

An earlier revision of this table said "UUID v4". **The server has never
enforced that**, and must not start: it validates shape only, and the comment
at `src/activity/services/activity.service.ts:144` records the reasoning —
§4.5's error is "not a UUID", a rejection is *permanent*, and telling a client
minting a v7 that its id is malformed forever would be a lie the client can
never recover from.

This is now load-bearing rather than theoretical. The Qur'an readers mint
**UUID v5** over `type | dedupeKey | localDay` so that re-reading the same
verse on the same day is one act rather than a fresh one, and so that the surah
reader and the juz reader agree about a verse read in both. Those ids are
deterministic by design.

**Narrowing the validator to v4 would reject every verse-read event — and
because rejection is permanent (§4.8), the flusher would delete each one.
Reading history would vanish with no error surfaced to the user.** If you are
tempted to "fix" the validator to match a contract that says v4, this clause is
the reason not to. Counters still mint v4; only deterministic dedupe uses v5.

### 4.4 Success response

**Response (200 OK):**

```json
{
  "accepted": 12,
  "duplicates": 3,
  "rejected": [
    {
      "clientEventId": "d41d8cd9-8f00-4b20-a981-6b1e2f3c4a5b",
      "code": "local_day_mismatch",
      "message": "localDay 2026-10-11 is more than one day from the date of occurredAt (2026-10-08)"
    }
  ]
}
```

| Field | Type | Meaning |
|---|---|---|
| `accepted` | integer | Events written on this request. |
| `duplicates` | integer | Events already stored under this `(userId, clientEventId)` — nothing written, nothing wrong. |
| `rejected` | array | One entry per permanently-invalid event, each carrying its `clientEventId` so the client can identify the exact queue row. Empty array when everything landed. |

`accepted + duplicates + rejected.length` always equals the number of events sent.

### 4.5 Per-event rejection codes (inside `rejected[]`, HTTP 200)

| `code` | When | Client action |
|---|---|---|
| `invalid_client_event_id` | absent, or not a UUID | Drop. A client bug. |
| `unknown_faith_id` | not `islam` \| `hindu` | Drop. |
| `unknown_activity_type` | not in §1.2 | Drop. Likely a client newer than the server. |
| `activity_type_faith_mismatch` | e.g. `islam` + `gita_shloka` | Drop. A client bug. |
| `invalid_quantity` | not an integer, `< 1`, or `> 10000` | Drop. |
| `invalid_occurred_at` | absent, unparseable, or no zone | Drop. |
| `occurred_at_in_future` | §2.3 | Drop. |
| `occurred_at_too_old` | §2.3 | Drop. |
| `invalid_local_day` | absent, or not `YYYY-MM-DD` | Drop. |
| `local_day_mismatch` | fails §2.2 | Drop. |
| `invalid_timezone` | absent, or not an IANA zone name | Drop. |
| `source_ref_too_long` | over 128 characters | Drop. |

**Every rejection in this table is permanent.** Retrying the identical event will produce the identical rejection. The client deletes these rows from the queue — it does not retry them — and may report them to analytics as a client bug.

### 4.6 Whole-request errors

| Status | `code` | When | Client action |
|---|---|---|---|
| `400` | `malformed_body` | Body is not JSON, or `events` is absent / not an array | Drop or fix. A client bug. |
| `400` | `empty_batch` | `events` is `[]` | Do not send empty batches. |
| `400` | `batch_too_large` | more than **100** events in one request | Re-chunk into batches of ≤100 and retry. Not a permanent failure. |
| `401` | `unauthorized` | §3 | Refresh token, retry once, keep the queue. |
| `500` | `internal_error` | server fault | Retry the whole batch with backoff. Safe — idempotency makes it free. |

```json
{
  "statusCode": 400,
  "message": "A batch may contain at most 100 events; received 312",
  "code": "batch_too_large"
}
```

### 4.7 Batch size

**Maximum 100 events per request.** The client chunks a larger queue into successive requests of ≤100 and sends them sequentially (not in parallel — ordering keeps the server's rollup work cheap and makes failures easier to reason about).

Nest's default JSON body limit of 100 kB is the real backstop underneath this; at roughly 220 bytes per event, 100 events is comfortably inside it and 400+ events would not be. Do not try to raise the batch size by making events smaller.

### 4.8 Client queue rules — normative

This is the part a correct offline client depends on. Follow it exactly.

| Outcome | What it means | What the queue does |
|---|---|---|
| `200` | The whole batch is settled — every event is now accepted, duplicate, or permanently rejected | **Delete all events in the batch from the queue**, including the rejected ones. |
| `400 batch_too_large` | Nothing was written | Re-chunk to ≤100 and retry. |
| `400` other | Client bug, nothing was written | Drop the batch and report. Retrying will not help. |
| `401` | Nothing was written | Refresh the token and retry once; on failure, **keep the batch** and retry after the user logs in again. |
| `5xx`, timeout, DNS failure, socket error, or any response the client cannot parse | **Unknown** — the server may or may not have written the batch | **Keep the entire batch** and retry later with exponential backoff. Idempotency guarantees this cannot double-count. |

The ambiguous case — a request that succeeded server-side but whose response never arrived — is precisely what `clientEventId` exists for. Always retry it; never try to detect it.

---

## 5. `GET /api/v1/activity/today`

**Endpoint:** `GET /api/v1/activity/today`

**Description:** Everything the Today screen's header, week strip and goal card need, in one call: the day's counts, the current goal and its progress, and the streak.

**Auth:** required.

### 5.1 Query parameters

| Param | Type | Required | Notes |
|---|---|---|---|
| `faithId` | `islam` \| `hindu` | **yes** | §1.1 |
| `timezone` | IANA zone | **yes** | The server derives which day "today" is from this. §5.2 |
| `localDay` | `YYYY-MM-DD` | no | Override. When supplied the server uses it verbatim instead of deriving, subject to §2.2-style sanity (within ±1 day of the day derived from `timezone` and server time). Intended for the client's own optimistic-UI reconciliation and for tests, not for ordinary use. |

### 5.2 `timezone` is required, and why

Without it the server would have to answer "what day is it?" from its own UTC clock. A user in `Asia/Kolkata` opening the app at 02:00 IST is on 2026-10-09 locally but 2026-10-08 in UTC, and would be shown yesterday's card, yesterday's counts, and a streak that looks broken. The same class of bug the panchang work already paid for once.

So the device states its zone, the server derives `localDay` from it, and **echoes the derived `localDay` back in the response** so there is exactly one authority on which day is being described. The client renders the `localDay` it is given, not the one it assumed.

```bash
curl -X GET "http://localhost:3000/api/v1/activity/today?faithId=islam&timezone=Asia/Kolkata" \
  -H "Authorization: Bearer <token>"
```

### 5.3 Success response

**Response (200 OK):**

```json
{
  "faithId": "islam",
  "localDay": "2026-10-08",
  "timezone": "Asia/Kolkata",
  "counts": {
    "quran_verse": 12,
    "prayer": 5,
    "dhikr": 99
  },
  "goal": {
    "goalType": "verses",
    "target": 5,
    "progress": 12,
    "met": true
  },
  "streak": {
    "current": 25,
    "longest": 41,
    "freezesLeft": 2,
    "freezeResetOn": "2026-11-01",
    "lastGoalMetDay": "2026-10-08"
  }
}
```

| Field | Type | Notes |
|---|---|---|
| `faithId` | string | Echo of the request. |
| `localDay` | date | **The server's derivation. Authoritative.** Render this. |
| `timezone` | string | Echo of the request. |
| `counts` | object | `activityType` → summed `quantity` for `localDay`. **Only activity types with a non-zero total appear as keys.** An absent key means zero; it does not mean unknown. Treat a missing key as `0`. |
| `goal` | object \| **null** | `null` when the user has never set a goal for this faith. |
| `goal.goalType` | string | §1.3 |
| `goal.target` | integer | What the user set. |
| `goal.progress` | integer | Summed `quantity` of the counted activity type, today. §2.4 |
| `goal.met` | boolean | `progress >= target`. |
| `streak.current` | integer | §2.5. Includes today iff `goal.met` is `true`. |
| `streak.longest` | integer | Never decreases. |
| `streak.freezesLeft` | integer | `0`–`2`. §2.6 |
| `streak.freezeResetOn` | date | First day of next month in `timezone`. |
| `streak.lastGoalMetDay` | date \| null | Most recent goal-met day; `null` if never. Lets the client render "streak at risk" without recomputing. |

### 5.4 A user who has never recorded anything gets a zero-valued `200`, not a `404`

**Response (200 OK)** for a brand-new user:

```json
{
  "faithId": "islam",
  "localDay": "2026-10-08",
  "timezone": "Asia/Kolkata",
  "counts": {},
  "goal": null,
  "streak": {
    "current": 0,
    "longest": 0,
    "freezesLeft": 2,
    "freezeResetOn": "2026-11-01",
    "lastGoalMetDay": null
  }
}
```

Three reasons this is a `200` and not a `404`:

1. **The empty state is the normal first-run path, not an error.** Every single user passes through it exactly once, on the screen that forms their first impression. A `404` would force the app's primary screen to render its most important moment off an error branch.
2. **Nothing is missing.** `/today` is a dashboard over a user that definitely exists — the token proves it. `404` means "the thing you addressed does not exist", and the thing addressed here is the authenticated user's day, which always exists.
3. **It removes a branch from the client.** Zeroes render as zeroes. A `404` would mean every consumer re-derives the same zero-valued object from an exception handler, and one of them would get it wrong.

`goal` is `null` rather than a fabricated default so the client can tell "never set a goal" (show the goal-setting prompt) apart from "set a goal and has not met it yet" (show the ring at 0%). `freezesLeft` is `2` because the monthly allowance is not earned, it is granted.

### 5.5 Errors

| Status | `code` | When |
|---|---|---|
| `400` | `unknown_faith_id` | `faithId` absent or not in §1.1 |
| `400` | `invalid_timezone` | `timezone` absent, or not an IANA zone name |
| `400` | `invalid_local_day` | `localDay` supplied but not `YYYY-MM-DD` |
| `400` | `local_day_mismatch` | `localDay` supplied and more than one day from the server's derivation |
| `401` | `unauthorized` | §3 |
| `500` | `internal_error` | server fault |

```json
{
  "statusCode": 400,
  "message": "timezone must be an IANA zone name, e.g. Asia/Kolkata",
  "code": "invalid_timezone"
}
```

---

## 6. `GET /api/v1/activity/history`

**Endpoint:** `GET /api/v1/activity/history`

**Description:** One row per day over a date range. Feeds the week strip (7 days) and the month dot-grid (28–31 days).

**Auth:** required.

### 6.1 Query parameters

| Param | Type | Required | Notes |
|---|---|---|---|
| `faithId` | `islam` \| `hindu` | yes | §1.1 |
| `from` | `YYYY-MM-DD` | yes | Inclusive. A `localDay`, not an instant. |
| `to` | `YYYY-MM-DD` | yes | **Inclusive.** Must be `>= from`. |

`from == to` is valid and returns one day. No `timezone` parameter: `from` and `to` are already explicit local days, so there is nothing to derive.

```bash
curl -X GET "http://localhost:3000/api/v1/activity/history?faithId=islam&from=2026-10-01&to=2026-10-08" \
  -H "Authorization: Bearer <token>"
```

### 6.2 Range limit

**Maximum 92 days inclusive** (`to − from + 1 <= 92`). Ninety-two days covers any three-month grid, which is the largest view Phase 1 renders.

A longer span exceeds the limit and returns `400 range_too_large` — it is **not** silently truncated, because a silently truncated range produces a chart that is wrong rather than absent. The client requests successive windows of ≤92 days and concatenates them; the response is a dense, self-describing array per §6.3, so concatenation is safe and gapless with no de-duplication needed as long as the windows do not overlap.

### 6.3 Success response

Every day in `[from, to]` is returned, in ascending `localDay` order, **including days with no activity**. The array is dense: `to − from + 1` entries, always. The dot-grid needs a cell for every day, so the server fills the gaps rather than making every client do it.

**Response (200 OK):**

```json
{
  "faithId": "islam",
  "from": "2026-10-01",
  "to": "2026-10-08",
  "days": [
    { "localDay": "2026-10-01", "counts": { "quran_verse": 7, "prayer": 5 }, "goalMet": true },
    { "localDay": "2026-10-02", "counts": { "quran_verse": 5, "prayer": 4 }, "goalMet": true },
    { "localDay": "2026-10-03", "counts": {}, "goalMet": false },
    { "localDay": "2026-10-04", "counts": { "quran_verse": 9, "prayer": 5 }, "goalMet": true },
    { "localDay": "2026-10-05", "counts": { "quran_verse": 5 }, "goalMet": true },
    { "localDay": "2026-10-06", "counts": { "quran_verse": 6, "dhikr": 33 }, "goalMet": true },
    { "localDay": "2026-10-07", "counts": { "quran_verse": 5, "prayer": 5 }, "goalMet": true },
    { "localDay": "2026-10-08", "counts": { "quran_verse": 12, "prayer": 5, "dhikr": 99 }, "goalMet": true }
  ]
}
```

| Field | Type | Notes |
|---|---|---|
| `days[].localDay` | date | Ascending, contiguous, no gaps. |
| `days[].counts` | object | Same semantics as `/today`: zero totals are absent keys, not `0` values. A day with no activity is `{}`. |
| `days[].goalMet` | boolean | Whether that day met the goal **as it stood when the day closed** — see §2.8 for when a day closes and §7.4 for why a later goal change does not rewrite it. A day with no activity is always `false`. |

Notes the client needs:

- **Today is included** when it falls inside the range, and it is a partial day: its `counts` are whatever has happened so far and its `goalMet` can flip from `false` to `true` later the same day. Treat the last cell as live.
- **Future days are included** if the range extends past today, with `counts: {}` and `goalMet: false`. Prefer not to request them.
- **`goalMet` here is per-day and does not account for freezes.** A frozen day shows `goalMet: false` and the streak still survives it. The week strip must read `goalMet` from this endpoint and `streak` from `/today`, and must not try to infer one from the other.
- The response carries no `points` (§2.9) and no streak — streak is a single value for the user, not a per-day one, and lives on `/today`.

### 6.4 Errors

| Status | `code` | When |
|---|---|---|
| `400` | `unknown_faith_id` | `faithId` absent or not in §1.1 |
| `400` | `invalid_date_range` | `from` or `to` absent, not `YYYY-MM-DD`, or `to < from` |
| `400` | `range_too_large` | more than 92 days inclusive |
| `401` | `unauthorized` | §3 |
| `500` | `internal_error` | server fault |

```json
{
  "statusCode": 400,
  "message": "The range from 2026-01-01 to 2026-10-08 spans 281 days; the maximum is 92",
  "code": "range_too_large"
}
```

---

## 7. `PUT /api/v1/activity/goal`

**Endpoint:** `PUT /api/v1/activity/goal`

**Description:** Set or replace the user's daily goal for one faith.

**Auth:** required.

### 7.1 Semantics

`PUT`, not `POST`, because there is exactly **one goal per `(userId, faithId)`** and this request is an upsert of it. Calling it twice with the same body is a no-op beyond `updatedAt`. There is no goal id, no list of goals, and no `DELETE` in Phase 1 — a user who wants no goal sets a target of 1, or ignores the card.

A user may hold one goal under `islam` and a different one under `hindu` at the same time.

### 7.2 Request body

| Field | Type | Required | Rules |
|---|---|---|---|
| `faithId` | `islam` \| `hindu` | yes | §1.1 |
| `goalType` | string enum | yes | §1.3, and must belong to `faithId` |
| `target` | integer | yes | Within the range for that `goalType` in §1.3. Must be a positive integer. |
| `timezone` | IANA zone | no | Used to compute which `localDay` the response's `met` is evaluated against, and from which day the change takes effect (§7.4). Falls back to the timezone on the user's most recent event, then to `UTC`. **Send it** — the fallbacks are there for robustness, not for use. |

```bash
curl -X PUT http://localhost:3000/api/v1/activity/goal \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "faithId": "islam",
    "goalType": "verses",
    "target": 5,
    "timezone": "Asia/Kolkata"
  }'
```

### 7.3 Success response

**Response (200 OK)** — `200` for both a first-time set and a replacement; `PUT` is an upsert and the client does not need to distinguish them.

```json
{
  "faithId": "islam",
  "goalType": "verses",
  "target": 5,
  "localDay": "2026-10-08",
  "progress": 12,
  "met": true,
  "updatedAt": "2026-10-08T09:14:03.221Z"
}
```

The response re-evaluates today against the **new** goal — `progress` is today's summed quantity for the newly-counted activity type and `met` reflects the new target — so the client updates the goal card from this response and does not need to follow up with a `GET /today`. Changing `goalType` changes which activity is counted, so `progress` can jump dramatically; that is correct, not a bug.

### 7.4 Changing a goal is not retroactive

A goal change takes effect from the user's **current `localDay` forward**. Days already closed keep the `goalMet` they were closed with, and `GET /history` keeps reporting it.

This is deliberate and load-bearing: if lowering the target rewrote history, a user could set `verses: 1` and retroactively manufacture a 90-day streak out of 90 days of incidental reading, which would make the streak meaningless for everyone including them.

The current day is the one exception — it has not closed, so it is re-evaluated immediately against the new goal, which is what `progress` and `met` in the response show. A user who has read 12 verses and then sets a 5-verse goal has met it today. A user who has read 12 verses and sets a 50-verse goal has not.

**A consequence worth stating outright:** a user who read every day for 40 days before ever setting a goal has 40 closed days of `goalMet: false`, and `streak.current` of `0`. The streak begins on the first day the user both has a goal and meets it. Activity recorded before a goal existed is kept, is returned in `counts`, and is never counted toward a streak retroactively.

### 7.5 This requires `UserGoal` to be effective-dated — a change to Task 1.3

§7.4 is not implementable against `UserGoal` as the design doc §4 sketches it. That model is `{userId, faithId, goalType, target, updatedAt}` — **one current row with no history**. With only the current goal on hand, a replay cannot know what the target was on 2026-08-14; it can only recompute every past day against today's goal, which is exactly the retroactivity §7.4 forbids.

It also breaks the Task 1.5 test the plan singles out as *"the property that justifies event sourcing — assert it"*: **rebuilds identical state when rollups are deleted and replayed.** If the user changed their target at any point in the window, replaying against a single current goal row produces different `goalMet` values from the ones the days closed with, and that test fails — correctly, because the system really has lost information.

**The contract resolves it this way, and Task 1.3 must build it:** `UserGoal` carries an `effectiveFrom` date (a `localDay`) and rows are **append-only**. A `PUT /goal` closes the previous row and inserts a new one effective from the user's current `localDay`. Rollup and replay read the goal in force on the day being computed. This is the only option that preserves both §7.4 and the replay property; the alternatives — making `DailyRollup.goalMet` write-once and excluded from replay, or abandoning non-retroactivity — each give up one of the two.

Nothing about this is visible in the request or response shapes above. `PUT /goal` still takes and returns one goal, `GET /today` still reports one goal, and the mobile track needs no change. It is recorded here because the contract depends on it and the schema task would otherwise not know.

### 7.6 Errors

| Status | `code` | When |
|---|---|---|
| `400` | `unknown_faith_id` | `faithId` absent or not in §1.1 |
| `400` | `unknown_goal_type` | `goalType` absent or not in §1.3 |
| `400` | `goal_type_faith_mismatch` | e.g. `islam` + `shlokas` |
| `400` | `invalid_target` | not an integer, `< 1`, or above the per-`goalType` maximum in §1.3 |
| `400` | `invalid_timezone` | `timezone` supplied but not an IANA zone name |
| `401` | `unauthorized` | §3 |
| `500` | `internal_error` | server fault |

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "code": "invalid_target",
  "errors": {
    "target": ["target must not be greater than 5 for goalType \"prayers\""]
  }
}
```

---

## 8. Client implementation checklist

A correct offline-capable client satisfies all of these. Each one maps to a rule above.

- [ ] Mint a UUID as `clientEventId` per recorded act, persist it alongside the queued row, and reuse it for every retry of that row — never for anything else (§4.3). A fresh v4 for acts that genuinely repeat (each dhikr tap is its own act); a deterministic v5 where re-doing the same thing on the same day must count once (§4.3.1).
- [ ] Stamp `localDay`, `timezone` and `occurredAt` **at the moment of the act**, from the device, not at flush time. An event flushed six days later still carries the day it happened (§2.2).
- [ ] Send `timezone` as an IANA name, not an offset or abbreviation (§1.5).
- [ ] Chunk the queue into batches of ≤100 and send them sequentially (§4.7).
- [ ] On `200`, delete every event in the batch from the queue — accepted, duplicate and rejected alike (§4.8).
- [ ] On `5xx`, timeout or any unparseable response, keep the whole batch and retry with backoff. Never attempt to detect whether it landed (§4.8).
- [ ] On `401`, keep the queue, refresh, retry once (§3).
- [ ] Log `rejected[]` entries to analytics as client bugs — they are all permanent and all preventable (§4.5).
- [ ] Always send `timezone` to `GET /today`, and render the `localDay` the response returns rather than the one assumed (§5.2).
- [ ] Render the never-recorded-anything case from the zero-valued `200`; no error branch (§5.4).
- [ ] Treat an absent key in `counts` as `0` (§5.3).
- [ ] Distinguish `goal: null` (prompt the user to set a goal) from a goal with `progress: 0` (show an empty ring) (§2.4).
- [ ] Spend freezes lazily, exactly as §2.6's worked example does — a gap behind the most recent goal-met day is not charged until the streak actually walks across it (§2.6).
- [ ] Show `streak.current` unchanged in the morning before the goal is met — it includes today only once `goal.met` is `true`, and does not drop overnight (§2.5).
- [ ] Read the week strip's filled/unfilled state from `/history`'s `goalMet`, and the flame number from `/today`'s `streak`. Do not derive either from the other (§6.3).
- [ ] Keep requests to ≤92 days and page for anything longer (§6.2).
- [ ] Animate to the server's streak and counts on reconciliation rather than snapping (§2.7).
- [ ] Emit `sourceRef` in the documented format even though nothing validates it yet (§1.6).
- [ ] Do not send fields outside this contract — they are silently dropped (§1.7).
