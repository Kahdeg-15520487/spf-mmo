import { PrismaClient } from '@prisma/client';
import { Server as SocketIOServer } from 'socket.io';

// In-memory route cache: orderId → array of [lat, lng] waypoints + current index
const botRoutes = new Map<string, { waypoints: [number, number][]; idx: number }>();

async function fetchOsrmEta(fromLat: number, fromLng: number, toLat: number, toLng: number): Promise<number> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const url = `http://localhost:5000/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=false`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    const data = await res.json() as any;
    if (data.routes?.[0]) return data.routes[0].duration * 1000; // ms
  } catch {}
  // Fallback: estimate from straight-line distance at 30km/h
  const d = Math.sqrt(Math.pow(toLat - fromLat, 2) + Math.pow(toLng - fromLng, 2)) * 111000;
  return (d / (30000 / 3600)) * 1000;
}

async function fetchOsrmRoute(fromLat: number, fromLng: number, toLat: number, toLng: number): Promise<[number, number][]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const url = `http://localhost:5000/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?geometries=geojson&overview=full`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    const data = await res.json() as any;
    if (data.routes?.[0]) {
      return data.routes[0].geometry.coordinates.map((c: number[]) => [c[1], c[0]] as [number, number]);
    }
  } catch {}
  // Fallback: straight line with intermediate points
  const steps = 20;
  return Array.from({ length: steps + 1 }, (_, i) => [
    fromLat + (toLat - fromLat) * (i / steps),
    fromLng + (toLng - fromLng) * (i / steps),
  ] as [number, number]);
}

// All seeded accounts are bots — every shop, buyer, and shipper runs automatically
const BOT_BUYERS = new Set([
  'bob',
  'buyer_em', 'buyer_hoa', 'buyer_long', 'buyer_thao',
  'buyer_minh', 'buyer_trang', 'buyer_hai', 'buyer_nam', 'buyer_phuc',
]);
const BOT_SHOPS = new Set([
  'alice', 'diana',
  'bep_viet', 'sushi_master', 'banh_mi_king',
  'seafood_grill', 'chef_minh', 'dessert_house',
]);
const BOT_SHIPPERS = new Set([
  'charlie',
  'shipper_linh', 'shipper_tuan', 'shipper_mai',
  'shipper_hung', 'shipper_anh', 'shipper_dat',
]);

let prisma: PrismaClient;
let io: SocketIOServer;

function emitOrderUpdate(orderId: string, status: string) {
  io.emit('order:updated', { orderId, status });
}

async function botBuyerPlaceOrder() {
  try {
    const buyers = await prisma.user.findMany({
      where: { role: 'buyer', username: { in: [...BOT_BUYERS] } },
      take: 20,
    });
    const shops = await prisma.shop.findMany({
      include: { menuItems: { where: { isAvailable: true }, take: 5 } },
    });

    if (buyers.length === 0 || shops.length === 0) return;

    // Only pick buyers with no active orders
    const activeBuyerIds = new Set(
      (await prisma.order.findMany({
        where: { status: { in: ['pending', 'confirmed', 'accepted', 'picked_up', 'in_transit'] }, buyerId: { in: buyers.map(b => b.id) } },
        select: { buyerId: true },
      })).map(o => o.buyerId)
    );
    const idleBuyers = buyers.filter(b => !activeBuyerIds.has(b.id));
    if (idleBuyers.length === 0) return;

    const buyer = idleBuyers[Math.floor(Math.random() * idleBuyers.length)];
    const shop = shops[Math.floor(Math.random() * shops.length)];
    if (shop.menuItems.length === 0) return;

    const itemCount = 1 + Math.floor(Math.random() * 3);
    const picked = [];
    const available = [...shop.menuItems];
    for (let i = 0; i < itemCount && available.length > 0; i++) {
      const idx = Math.floor(Math.random() * available.length);
      picked.push({ menuItemId: available[idx].id, quantity: 1 + Math.floor(Math.random() * 2) });
      available.splice(idx, 1);
    }

    let foodCost = 0;
    for (const p of picked) {
      const item = shop.menuItems.find((m) => m.id === p.menuItemId);
      if (item) foodCost += item.price * p.quantity;
    }
    const deliveryFee = 5;

    const total = foodCost + deliveryFee;

    // Bot buyers don't deduct balance — shops still get paid
    await prisma.user.update({ where: { id: shop.ownerId }, data: { balance: { increment: foodCost } } });

    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    const order = await prisma.order.create({
      data: {
        buyerId: buyer.id, shopId: shop.id,
        totalAmount: foodCost + deliveryFee, deliveryFee,
        pickupAddress: shop.address, pickupLat: shop.lat, pickupLng: shop.lng,
        deliveryAddress: buyer.homeAddress || `${buyer.username} — Nhà`,
        deliveryLat: buyer.homeLat || (10.77 + Math.random() * 0.08), deliveryLng: buyer.homeLng || (106.63 + Math.random() * 0.14),
        expiresAt,
        items: { create: picked.map((p) => ({ ...p, price: shop.menuItems.find((m) => m.id === p.menuItemId)?.price || 0 })) },
      },
    });

    // Auto-confirm immediately (bot shop)
    await prisma.order.update({ where: { id: order.id }, data: { status: 'confirmed' } });

    // Notify
    emitOrderUpdate(order.id, 'confirmed');
    io.to(`user:${shop.ownerId}`).emit('order:updated', { orderId: order.id, status: 'confirmed' });

    console.log(`🤖 ${buyer.username} ordered from ${shop.name} — ${foodCost + deliveryFee} xu (bot)`);
  } catch (e) { console.error('Bot buyer error:', e); }
}

// Auto-confirm pending orders at bot-owned shops (so real players don't wait)
async function botShopConfirm() {
  try {
    const pending = await prisma.order.findMany({
      where: {
        status: 'pending',
        shop: { owner: { username: { in: [...BOT_SHOPS] } } },
      },
      take: 10,
    });
    for (const order of pending) {
      await prisma.order.update({ where: { id: order.id }, data: { status: 'confirmed' } });
      emitOrderUpdate(order.id, 'confirmed');
      const shop = await prisma.shop.findUnique({ where: { id: order.shopId } });
      if (shop) io.to(`user:${shop.ownerId}`).emit('order:updated', { orderId: order.id, status: 'confirmed' });
      console.log(`🏪 Bot shop auto-confirmed order ${order.id.slice(0, 8)}`);
    }
  } catch (e) { console.error('Bot shop confirm error:', e); }
}

async function botShipperProcess() {
  try {
    // === PART 1: Move active orders ===
    const active = await prisma.order.findMany({
      where: {
        status: { in: ['accepted', 'picked_up', 'in_transit'] },
        shipper: { user: { username: { in: [...BOT_SHIPPERS] } } },
      },
      include: { shipper: { include: { user: true } }, buyer: { select: { isBot: true } }, shop: { include: { owner: { select: { isBot: true } } } } },
      take: 20,
    });

    for (const order of active) {
      if (!order.shipper) continue;
      // All-bot order handled by setTimeout on accept — skip movement
      if (order.buyer?.isBot && order.shop?.owner?.isBot) continue;

      const SPEED: Record<string, number> = {
        'Xe Đạp': 0.000250,  // ~32 km/h @ 3s tick
        'Xe Máy': 0.000550,  // ~72 km/h @ 3s tick
        'Ô Tô':   0.000450,  // ~59 km/h @ 3s tick
      };
      const speed = (SPEED[order.shipper.vehicle] || 0.000270) * (0.9 + Math.random() * 0.2);
      const targetLat = order.status === 'accepted' ? order.pickupLat : order.deliveryLat;
      const targetLng = order.status === 'accepted' ? order.pickupLng : order.deliveryLng;

      const routeKey = `${order.id}:${order.status}`;
      let route = botRoutes.get(routeKey);
      if (!route) {
        const waypoints = await fetchOsrmRoute(order.shipper.lat, order.shipper.lng, targetLat, targetLng);
        route = { waypoints, idx: 0 };
        botRoutes.set(routeKey, route);
      }

      if (route.idx >= route.waypoints.length - 1) {
        botRoutes.delete(routeKey);
        const nextStatus =
          order.status === 'accepted' ? 'picked_up' :
          order.status === 'picked_up' ? 'in_transit' :
          order.status === 'in_transit' ? 'delivered' : null;
        if (!nextStatus) continue;
        const updateData: any = { status: nextStatus };
        if (nextStatus === 'picked_up') updateData.pickedUpAt = new Date();
        if (nextStatus === 'delivered') updateData.deliveredAt = new Date();
        await prisma.order.update({ where: { id: order.id }, data: updateData });
        emitOrderUpdate(order.id, nextStatus);
        io.to(`user:${order.buyerId}`).emit('order:updated', { orderId: order.id, status: nextStatus });
        if (nextStatus === 'delivered') {
          await prisma.user.update({ where: { id: order.shipper.userId }, data: { balance: { increment: order.deliveryFee } } });
          await prisma.shipper.update({ where: { id: order.shipperId! }, data: { totalDeliveries: { increment: 1 } } });
          console.log(`✅ ${order.shipper.user.username} delivered`);
        }
        continue;
      }

      let remaining = speed;
      while (remaining > 0 && route.idx < route.waypoints.length - 1) {
        const [nextLat, nextLng] = route.waypoints[route.idx + 1];
        const [currLat, currLng] = route.waypoints[route.idx];
        const d = Math.sqrt(Math.pow(nextLat - currLat, 2) + Math.pow(nextLng - currLng, 2));
        if (d <= remaining) { remaining -= d; route.idx++; }
        else {
          const frac = remaining / d;
          route.waypoints[route.idx] = [currLat + (nextLat - currLat) * frac, currLng + (nextLng - currLng) * frac];
          remaining = 0;
        }
      }
      const [newLat, newLng] = route.waypoints[route.idx];
      await prisma.shipper.update({ where: { id: order.shipper.id }, data: { lat: newLat, lng: newLng } });
      io.to(`order:${order.id}`).emit('shipper:location-update', { shipperId: order.shipper.id, lat: newLat, lng: newLng, orderId: order.id });
    }

    // === PART 2: Accept new confirmed orders (free shippers only) ===
    const shippers = await prisma.shipper.findMany({
      where: { isOnline: true, user: { username: { in: [...BOT_SHIPPERS] } } },
      include: { user: true },
    });
    const busyIds = new Set(active.map(o => o.shipperId!));
    const freeShippers = shippers.filter(s => !busyIds.has(s.id));
    if (freeShippers.length > 0) {
      const pending = await prisma.order.findMany({
        where: { status: 'confirmed', expiresAt: { gt: new Date() } },
        take: freeShippers.length, orderBy: { createdAt: 'asc' },
        include: { buyer: true, shop: { include: { owner: true } } },
      });
      for (let i = 0; i < Math.min(pending.length, freeShippers.length); i++) {
        const order = pending[i], shipper = freeShippers[i];
        const result = await prisma.order.updateMany({ where: { id: order.id, status: 'confirmed' }, data: { shipperId: shipper.id, status: 'accepted', acceptedAt: new Date() } });
        if (result.count === 0) continue;
        botRoutes.delete(`${order.id}:accepted`);
        botRoutes.delete(`${order.id}:picked_up`);
        botRoutes.delete(`${order.id}:in_transit`);
        emitOrderUpdate(order.id, 'accepted');
        io.to(`user:${order.buyerId}`).emit('order:updated', { orderId: order.id, status: 'accepted' });

        const allBot = order.buyer?.isBot && order.shop?.owner?.isBot;
        if (allBot) {
          // All-bot order: skip simulation, deliver after OSRM ETA
          const etaMs = await fetchOsrmEta(order.pickupLat, order.pickupLng, order.deliveryLat, order.deliveryLng);
          console.log(`🤖 All-bot order — ETA ${Math.round(etaMs / 1000)}s`);
          setTimeout(async () => {
            try {
              await prisma.order.update({ where: { id: order.id }, data: { status: 'delivered', pickedUpAt: new Date(), deliveredAt: new Date() } });
              await prisma.user.update({ where: { id: shipper.userId }, data: { balance: { increment: order.deliveryFee } } });
              await prisma.shipper.update({ where: { id: shipper.id }, data: { totalDeliveries: { increment: 1 } } });
              emitOrderUpdate(order.id, 'delivered');
            } catch { /* order may have expired */ }
          }, etaMs);
        } else {
          // At least one human — full movement simulation
          await prisma.shipper.update({ where: { id: shipper.id }, data: { lat: order.pickupLat + (Math.random()-0.5)*0.01, lng: order.pickupLng + (Math.random()-0.5)*0.01 } });
          console.log(`🛵 ${shipper.user.username} accepted (human order)`);
        }
      }
    }
  } catch (e) { console.error('Bot shipper error:', e); }
}

let buyerInterval: ReturnType<typeof setInterval> | null = null;
let shipperInterval: ReturnType<typeof setInterval> | null = null;
let shopConfirmInterval: ReturnType<typeof setInterval> | null = null;

export function startBots(_prisma: PrismaClient, _io: SocketIOServer) {
  prisma = _prisma;
  io = _io;
  console.log('🤖 Bot simulation started');

  // Ensure bot shippers are online
  prisma.shipper.updateMany({
    where: { user: { username: { in: [...BOT_SHIPPERS] } } },
    data: { isOnline: true },
  }).then(() => console.log('🤖 Bot shippers set online'));

  buyerInterval = setInterval(() => {
    if (Math.random() > 0.3) botBuyerPlaceOrder();
  }, 15000);

  shipperInterval = setInterval(() => {
    botShipperProcess();
  }, 3000);

  // Auto-confirm orders at bot shops every 5 seconds
  shopConfirmInterval = setInterval(() => {
    botShopConfirm();
  }, 5000);

  botBuyerPlaceOrder();
  botShipperProcess();
  botShopConfirm();
}

export function stopBots() {
  if (buyerInterval) clearInterval(buyerInterval);
  if (shipperInterval) clearInterval(shipperInterval);
  if (shopConfirmInterval) clearInterval(shopConfirmInterval);
  console.log('🤖 Bot simulation stopped');
}
