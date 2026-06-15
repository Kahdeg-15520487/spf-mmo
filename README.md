# SPF MMO — Shipping Food

A multiplayer food delivery game with 3 player roles: **Shop**, **Buyer**, and **Shipper**. Built with Node.js/TypeScript backend, Next.js frontend, real-world maps, live tracking, and a virtual currency economy.

## How It Works

| Role | What You Do |
|------|-------------|
| 🍳 **Shop** | Pick a commercial zone on the map, build your menu, confirm incoming orders |
| 🛒 **Buyer** | Set your home neighborhood, browse shops, place orders with virtual coins |
| 🛵 **Shipper** | Accept confirmed orders, navigate real roads on the map, deliver for coins + ratings |

**Order flow:** `Pending → Confirmed (shop) → Accepted (shipper) → Picked Up → In Transit → Delivered`

## Tech Stack

- **Backend:** Node.js, Express, TypeScript, Prisma (SQLite), Socket.IO
- **Frontend:** Next.js 16, React, TypeScript, Tailwind CSS, Leaflet maps
- **Real-time:** WebSocket (Socket.IO) for live shipper tracking + order status updates
- **Maps:** OpenStreetMap tiles with optional self-hosted OSRM road routing
- **i18n:** Full Vietnamese UI with `useT()` hook system

## Quick Start

```bash
git clone https://github.com/Kahdeg-15520487/spf-mmo.git
cd spf-mmo

# Install root
npm install

# Backend (port 13110)
cd server
npm install
npx prisma db push
npx tsx prisma/seed.ts     # Seeds 8 shops, 7 shippers, 10 buyers
npm run dev

# Frontend (port 13112) — new terminal
cd client
npm install
npm run dev
```

Open `http://localhost:13112` — enter any username to play. Switch roles with the top nav bar.

## Seeded Accounts

| Username | Role | Notes |
|----------|------|-------|
| `alice` | Shop | Alice's Kitchen — Vietnamese food |
| `bob` | Buyer | Lives in Thủ Đức |
| `charlie` | Shipper | Motorbike shipper |
| `diana` | Shop | Diana's Pizza & Pasta |
| `bep_viet`, `sushi_master`, etc. | Bot Shops | Automated bot accounts |
| `buyer_em`, `buyer_hoa`, etc. | Bot Buyers | Automated ordering |
| `shipper_linh`, `shipper_tuan`, etc. | Bot Shippers | Automated delivery |

Bots use only their own accounts — your manually created accounts are never touched.

## Self-Hosted OSRM (Optional)

For road routing without rate limits:

```bash
cd osrm
docker compose up -d
```

First boot downloads ~100MB Vietnam OSM data and processes it (2-5 min). The frontend auto-detects `localhost:5000` and falls back to the public OSRM API if unavailable.

## Project Structure

```
spf-mmo/
├── server/              # Express + Socket.IO + Prisma
│   ├── prisma/          # Schema + seed data
│   └── src/
│       ├── routes/      # auth, shops, orders, shippers, reviews, zones
│       ├── bots.ts      # Automated buyer/shipper simulation
│       ├── socket.ts    # WebSocket real-time handler
│       └── zones.ts     # Commercial & residential zone definitions
├── client/              # Next.js frontend
│   └── app/
│       ├── i18n/        # Vietnamese translations (useT hook)
│       ├── components/  # ZoneMapPicker
│       ├── buyer/       # Shop browsing, cart, orders, live tracking
│       ├── shop/        # Menu CRUD, order confirm/reject
│       └── shipper/     # Order pool, Leaflet map, delivery flow
├── osrm/                # Docker Compose for self-hosted routing
└── package.json         # Root scripts
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/login` | Login/register with username |
| POST | `/api/auth/switch-role` | Switch between buyer/shop/shipper |
| POST | `/api/auth/set-home-zone` | Set buyer's home neighborhood |
| GET | `/api/shops` | List all shops with menus |
| POST | `/api/shops/:id/menu` | Add menu item |
| POST | `/api/shops/:id/confirm-order` | Shop accepts order |
| POST | `/api/shops/:id/reject-order` | Shop rejects order |
| GET | `/api/orders/available` | Available orders for shippers |
| POST | `/api/orders` | Place a new order |
| POST | `/api/orders/:id/cancel` | Buyer cancels order |
| POST | `/api/shippers/:id/accept-order` | Shipper accepts order |
| POST | `/api/shippers/:id/location` | Update shipper GPS position |
| POST | `/api/shippers/:id/deliver` | Mark order as delivered |
| POST | `/api/reviews` | Submit rating/review |
| GET | `/api/zones/commercial` | List commercial zones |
| GET | `/api/zones/residential` | List residential zones |

## Game Economy

- All transactions use virtual coins (no real money)
- Buyer pays food cost + 5 coin delivery fee on order
- Shop owner receives food cost on order confirmation
- Shipper receives delivery fee on successful delivery
- Cancel/expire refunds buyer and claws back from shop
- Auto-expire runs every 60s
