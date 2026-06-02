# Timezone — manual QA checklist

How timezone works after this PR:

- **Storage is UTC.** `Booking.startTime` and every generated session start are
  absolute UTC instants. `AvailabilityBlock` rows (weekday + start/endMinute) are
  interpreted as **wall-clock time in the coach's `timezone`** and converted to
  UTC per-date, so DST is handled correctly.
- **Coaches author in their own zone.** Set at signup (defaults to the browser's
  detected zone); the availability grid is labelled with it.
- **Students see their own zone.** Detected from the browser via
  `Intl.DateTimeFormat().resolvedOptions().timeZone` and stored in the `cc_tz`
  cookie (display preference only — no account field). Server components render
  every time in that zone.

## Simulating a viewer timezone

**Fast (exercises the server render path):** open DevTools → Application →
Cookies → set `cc_tz` to an IANA id (e.g. `America/Los_Angeles`) and reload.
Clearing the cookie falls back to **UTC**.

```js
// or paste in the console, then reload:
document.cookie = "cc_tz=Asia/Kolkata; path=/; max-age=31536000; samesite=lax";
```

**End-to-end (exercises detection too):** Chrome DevTools → ⋮ → More tools →
**Sensors** → Location → pick/define a locale with the target timezone, then
reload (`TimezoneSync` writes the cookie and refreshes once). Or change the OS
timezone.

Seed first so there's cross-zone supply: `npm run db:reset` (coaches are seeded
in ET, London, IST, PT, CET, SGT, CT).

## Checklist

### Eastern Time — `America/New_York`
- [ ] `/sessions` calendar columns/labels read as ET; "Today" matches your ET date.
- [ ] Maya Chen (ET coach, Mon 6–9pm) shows at **6–9 PM** on Monday.
- [ ] Book a slot → confirmation + `/dashboard` show the **same ET time**.
- [ ] Coach view: sign in as `maya.chen@coach.test` → grid says "Times are in
      your timezone · America/New_York"; painted hours match what students see in ET.

### Pacific Time — `America/Los_Angeles`
- [ ] Same calendar, now in PT. Maya's 6–9pm ET appears at **3–6 PM PT**
      (−3h) — the underlying instants are identical, only labels differ.
- [ ] Liam Walsh (PT coach) shows at his painted PT hours.

### London — `Europe/London`
- [ ] David Okafor (London coach, weekday 8–11am) shows at **8–11 AM**.
- [ ] In a NY cookie, the same David slots appear at **3–6 AM ET** (summer) —
      confirms cross-zone conversion both directions.

### India / half-hour offset — `Asia/Kolkata` (+5:30)
- [ ] As an **IST viewer**: Priya Nair's IST hours show on the hour (e.g. 9 AM).
- [ ] As a **whole-hour viewer** (e.g. ET) looking at Priya (IST coach): her
      sessions land on the **:30** in your local time. They must still appear in
      the calendar (bucketed into the containing hour cell), the cell modal must
      list her, and the booking confirmation must show the **:30** time.
- [ ] As an **IST viewer** looking at a whole-hour coach (e.g. Maya/ET): her
      sessions show on the **:30** for you, are listed, and book correctly.
- [ ] No "these sessions were just taken" when a counted coach is actually free
      (regression guard for the half-hour bucket/modal match).

### DST boundaries
- [ ] **US spring-forward (2026-03-08):** an ET coach's morning slots stay at the
      same local time across the weekend; the UTC instant shifts by 1h (9 AM ET is
      14:00Z before, 13:00Z after). No 2:00–2:59 AM slot is ever generated.
- [ ] **US fall-back (2026-11-01):** local times stay put; no duplicate 1 AM slot.
- [ ] **London BST↔GMT (Mar 29 / Oct 25, 2026):** London coach mornings hold their
      local time across the change.
- [ ] An IST viewer (no DST) sees ET/London coaches shift by 1h on the US/UK
      change dates — because the *coach's* offset changed, not the viewer's.

### General / regressions
- [ ] **First paint:** in a brand-new session (no `cc_tz`), the page renders in
      UTC, then `TimezoneSync` sets the cookie and it refreshes once into local.
- [ ] **Dynamic rows:** with same-zone supply the grid is the usual 7am–10pm;
      with cross-zone supply landing outside that window, rows expand (contiguous)
      so nothing is hidden — never fewer than 7am–10pm.
- [ ] **Past styling / booking window:** "Past" cells and the 7-day horizon are
      computed in the viewer's local day.
- [ ] **No double-book:** booking the same instant from two zones still hits the
      `@@unique([coachId, startTime])` guard.
- [ ] Coach signup: timezone picker defaults to the detected zone; saving an
      unlisted zone (pick via OS) still persists (any valid IANA id is accepted).
