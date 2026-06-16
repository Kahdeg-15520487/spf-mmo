import { Router, Request, Response } from 'express';
import { prisma } from '../index';

export const debugRouter = Router();

// Active orders with shipper positions
debugRouter.get('/active-orders', async (_req: Request, res: Response) => {
  try {
    const orders = await prisma.order.findMany({
      where: { status: { in: ['pending', 'confirmed', 'accepted', 'picked_up', 'in_transit'] } },
      include: {
        buyer: { select: { username: true, isBot: true } },
        shop: { select: { name: true, lat: true, lng: true } },
        shipper: { include: { user: { select: { username: true } } } },
        items: { select: { quantity: true, price: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const result = orders.map(o => {
      const targetLat = o.status === 'accepted' ? o.pickupLat : o.deliveryLat;
      const targetLng = o.status === 'accepted' ? o.pickupLng : o.deliveryLng;
      const dLat = targetLat - (o.shipper?.lat || 0);
      const dLng = targetLng - (o.shipper?.lng || 0);
      const distToTarget = Math.sqrt(dLat * dLat + dLng * dLng);
      const ageSeconds = o.acceptedAt ? Math.round((Date.now() - new Date(o.acceptedAt).getTime()) / 1000) : null;
      return {
        id: o.id.slice(0, 8),
        status: o.status,
        buyer: o.buyer?.username,
        isBot: o.buyer?.isBot,
        shop: o.shop?.name,
        shipper: o.shipper?.user?.username || null,
        shipperPos: o.shipper ? { lat: o.shipper.lat, lng: o.shipper.lng } : null,
        targetPos: { lat: targetLat, lng: targetLng },
        distToTarget: Math.round(distToTarget * 111000), // meters
        ageSeconds,
        total: o.totalAmount,
      };
    });

    res.json(result);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Shippers status
debugRouter.get('/shippers', async (_req: Request, res: Response) => {
  try {
    const shippers = await prisma.shipper.findMany({
      include: {
        user: { select: { username: true, isBot: true, balance: true } },
        orders: { where: { status: { in: ['accepted', 'picked_up', 'in_transit'] } }, select: { id: true, status: true } },
      },
    });
    res.json(shippers.map(s => ({
      id: s.id.slice(0, 8),
      username: s.user.username,
      isBot: s.user.isBot,
      vehicle: s.vehicle,
      isOnline: s.isOnline,
      rating: s.rating,
      deliveries: s.totalDeliveries,
      balance: s.user.balance,
      pos: { lat: s.lat, lng: s.lng },
      activeOrders: s.orders.length,
    })));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Economy summary
debugRouter.get('/economy', async (_req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({ select: { username: true, balance: true, isBot: true, level: true, xp: true } });
    const orders = await prisma.order.groupBy({ by: ['status'], _count: true });
    res.json({
      orders: Object.fromEntries(orders.map(o => [o.status, o._count])),
      players: users.filter(u => !u.isBot).map(u => ({ username: u.username, balance: u.balance, level: u.level, xp: u.xp })),
      botBalance: users.filter(u => u.isBot).reduce((s, u) => s + u.balance, 0),
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});
