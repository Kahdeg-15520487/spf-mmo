# Code Quality Review Findings

## Summary

5 issues found: 2 medium severity, 3 low severity. No critical defects.

---

## Issue 1 — Stale fallback speed after base speed rebalance (Medium)

**File:** `server/src/bots.ts`, line ~181
**Severity:** Medium — likely unintended mismatch, could cause inconsistent bot behavior

```ts
const SPEED: Record<string, number> = {
    'Xe Đạp': 0.000250,  // ~32 km/h @ 3s tick
    'Xe Máy': 0.000550,  // ~72 km/h @ 3s tick
    'Ô Tô':   0.000450,  // ~59 km/h @ 3s tick
};
const speed = (SPEED[order.shipper.vehicle] || 0.000270) * (0.9 + Math.random() * 0.2);
```

The fallback value `0.000270` was **not updated** when the base speeds were rebalanced upward (all roughly doubled). Previously `0.000270` matched the Xe Máy speed (the default vehicle). Now Xe Máy is `0.000550`. If any shipper has an unexpected or null vehicle string (e.g., from a manual DB edit, a migration gap, or a future human registration flow), they will move at less than half the intended default speed.

**Recommendation:** Update the fallback to `0.000550` to match the new Xe Máy base speed, or extract a named constant.

---

## Issue 2 — Bot vehicle diversity eliminated; untested speed paths remain (Medium)

**File:** `server/prisma/seed.ts`, lines ~118–122
**Severity:** Medium — reduces test coverage of the bot movement system

The old seed assigned varied vehicles to shippers:
```
charlie: Xe Máy, shipper_tuan: Xe Đạp, shipper_hung: Ô Tô, shipper_anh: Xe Đạp, ...
```

The new seed hardcodes `vehicle: 'Xe Máy'` for **all 35 bot shippers** in both `update` and `create` blocks. This means:

1. **No bot shipper** will ever exercise the `Xe Đạp` or `Ô Tô` speed branches in the bot movement loop (`server/src/bots.ts`). Those `SPEED` entries are effectively dead code for the entire bot population.
2. If human shippers can choose vehicle types (not visible in this diff), the code path survives — but the bot simulation provides zero coverage for non-motorbike movement.
3. The previous shipper struct (`{ username, vehicle }`) was replaced with a flat username array, discarding per-shipper diversity.

**Recommendation:** Either restore vehicle diversity in the seed data (at least a few bicycle and car shippers), or explicitly document that bot shippers are motorbike-only and clean up the unused SPEED entries if human shippers also default to Xe Máy.

---

## Issue 3 — useEffect missing `user?.homeZoneId` dependency (Low)

**File:** `client/app/buyer/page-content.tsx`, line ~87
**Severity:** Low — stale closure, limited practical impact

```tsx
// Before:
useEffect(() => { if (user && !user.homeZoneId) setShowHomePicker(true); }, [user?.id, user?.homeZoneId]);

// After:
useEffect(() => { if (user && !user.homeZoneId) setShowHomePicker(true); }, [user?.id]);
```

The effect body reads `user.homeZoneId` but the dependency array no longer includes it. React's `exhaustive-deps` lint rule would flag this. In practice:
- The effect only sets `showHomePicker` to `true` (never `false`). Hiding is handled by the `onSelect` form submission callback via `setShowHomePicker(false)`.
- The page does `window.location.reload()` after setting the home zone, causing a full remount.
- So the stale closure doesn't cause an observable bug today.

However, if `user` state were ever updated in-place with a new `homeZoneId` (e.g., via WebSocket event or optimistic update), the effect would not re-evaluate and the picker could remain visible despite the user now having a home zone.

**Recommendation:** Restore `user?.homeZoneId` to the dependency array, or replace the effect with a simpler derivation: `const showHomePicker = !!(!user?.homeZoneId)`.

---

## Issue 4 — Seed `update: { balance: 0 }` destructive on re-seed (Low)

**File:** `server/prisma/seed.ts`, lines ~92, ~116
**Severity:** Low — seed scripts are dev-only, but changed contract

```ts
// Before (shop, shipper upsert update):
update: { balance: 999999, isBot: true },

// After:
update: { balance: 0, isBot: true },
```

Previously, re-running the seed would reset bot balances to 999999 (effectively infinite money). Now it resets them to 0. This is a behavioral change:
- If the seed is run against a database where bots have accumulated balances through simulated orders, those balances are wiped.
- Bots with 0 balance may not be able to place orders (depending on order cost logic not visible in this diff).

**Recommendation:** If the intent is "bots don't need infinite money, let them earn it through simulation," this is fine. But confirm that `balance: 0` doesn't block bots from participating in the economy (e.g., placing buy orders). Consider using `{ isBot: true }` only in the update block and leaving balance untouched, unless resetting it is intentional.

---

## Issue 5 — `resZones` and `addrMap` have partial overlap; no validation (Low)

**File:** `server/prisma/seed.ts`, lines ~101, ~122
**Severity:** Low — no runtime failure, but implicit coupling

```ts
const resZones = ['r-td-linh-trung', 'r-q4-doan-van-bo', ... , 'r-q6-hau-giang'];
// 10 zones used for random shipper home assignment

const addrMap: Record<string, string> = {
    ... 16 entries total ...
};
// 16 zones used for buyer address lookup
```

The `resZones` array (10 entries, used for shipper home zones) and `addrMap` (16 entries, used for buyer address display) have **partial overlap**. New zones like `'r-q4-khanh-hoi'`, `'r-gv-pham-van-chieu'`, `'r-bt-kinh-duong-vuong'` are in `addrMap` but **not** in `resZones`. Conversely, `'r-q2-thao-dien'` and `'r-q11-le-dai-hanh'` and `'r-q6-hau-giang'` are in both.

This is not a bug — buyers and shippers can be assigned to different zone pools — but the two lists have no declared relationship. A future maintainer adding a new zone might update one but not the other, causing a shipper to be assigned a zone with no address label or vice versa.

**Recommendation:** Consider deriving both `resZones` and `buyerZones` from a single authoritative zone registry, or at least add a comment explaining that the two pools are intentionally separate (shipper zones are a subset for geographic diversity reasons).
