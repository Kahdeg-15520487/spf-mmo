# AGENTS.md — SPF MMO

## Project

A multiplayer food delivery game: 3 roles (Shop, Buyer, Shipper), Node.js/TypeScript backend, Next.js 16 frontend, Leaflet maps, Socket.IO real-time tracking, Prisma/SQLite, virtual currency economy.

## Stack

- **Backend:** Node.js, Express, TypeScript, Prisma (SQLite), Socket.IO — runs on port 13110
- **Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS, Leaflet — runs on port 13112
- **Real-time:** Socket.IO WebSocket for shipper GPS + order status
- **Maps:** OpenStreetMap tiles, optional self-hosted OSRM (port 13114)
- **i18n:** Vietnamese with `useT()` hook, translations in `client/app/i18n/`

## Run Commands

```bash
# Backend
cd server && npm run dev

# Frontend (separate terminal)
cd client && npm run dev

# Seed DB (first time or reset)
cd server && npx prisma db push && npx tsx prisma/seed.ts

# Self-hosted OSRM (optional, Docker required)
cd osrm && docker compose up -d
```

## Project Structure

```
spf-mmo/
├── server/
│   ├── prisma/          # Schema + seed data (10 shops, 35 shippers, 15 buyers)
│   └── src/
│       ├── routes/      # auth, shops, orders, shippers, reviews, zones
│       ├── bots.ts      # Automated buyer/shipper/shop simulation
│       ├── socket.ts    # WebSocket real-time handler
│       ├── zones.ts     # Commercial & residential zone definitions
│       ├── progression.ts  # XP, levels, role gating, daily rewards
│       └── index.ts     # Express + Socket.IO entry point
├── client/
│   └── app/
│       ├── i18n/        # Vietnamese translations (useT hook)
│       ├── components/  # ZoneMapPicker, etc.
│       ├── buyer/       # Shop browsing, cart, orders, live tracking
│       ├── shop/        # Menu CRUD, order confirm/reject
│       └── shipper/     # Order pool, Leaflet map, delivery flow
├── osrm/                # Docker Compose for self-hosted routing
└── package.json         # Root scripts
```

## Bot Architecture

All seeded accounts are bots (`isBot: true`, balance: `0`). The bot system in `server/src/bots.ts`:

- **Bot Buyers** (15 accounts): Place orders at random intervals (~every 15s, 70% chance). Skip deducting balance. Bot-owned shops get paid automatically.
- **Bot Shops** (10 accounts): Auto-confirm pending orders every 5s.
- **Bot Shippers** (35 accounts): Accept confirmed orders, move along OSRM routes, deliver. Free shippers prioritized. All-bot orders skip simulation — delivered instantly after OSRM ETA.

Bots only operate on bot accounts — manually created accounts are never touched.

## API Constraints

- `/api/auth/set-home-zone` — **Immutable.** Once a home zone is set, subsequent calls return 403. There is no change-home-zone endpoint.
- `/api/auth/switch-role` — Gated by level: Shipper requires Lv3, Shop requires Lv5.
- `/api/auth/login` — Login/register in one call. First login each day awards daily bonus (+10 XP, +500 xu, 24h cooldown).
- Bot accounts have `isBot: true` and are excluded from real economy operations like balance deduction.

## Key Behavioral Rules

- Do **not** modify bot usernames in seed.ts without updating the `BOT_BUYERS` / `BOT_SHOPS` / `BOT_SHIPPERS` sets in `server/src/bots.ts`.
- Do **not** change role gating levels without updating frontend UX labels in i18n.
- The `review-result.md` file at the project root is a swarm-review output — read it for recent findings and recommendations.
