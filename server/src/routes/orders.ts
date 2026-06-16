import { Router, Request, Response } from 'express';
import { prisma, io } from '../index';
import { XP_REWARDS, XP_PER_LEVEL } from '../progression';

const OSRM = 'http://localhost:5000';

async function getOsrmEta(fromLng: number, fromLat: number, toLng: number, toLat: number): Promise<number | null> {
  try {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`${OSRM}/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=false`, { signal: controller.signal });
    const data = await res.json() as any;
    return data.routes?.[0]?.duration ?? null; // seconds
  } catch { return null; }
}

export const orderRouter = Router();

async function addXp(userId: string, amount: number) {
  try {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.isBot) return;
  const newXp = user.xp + amount;
  let newLevel = user.level;
  let remainingXp = newXp;
  while (remainingXp >= XP_PER_LEVEL(newLevel)) {
    remainingXp -= XP_PER_LEVEL(newLevel);
    newLevel++;
  }
  await prisma.user.update({ where: { id: userId }, data: { xp: newXp, level: newLevel } });
  } catch (e) { console.error('addXp failed:', e); }
}

orderRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { status, buyerId, shopId, shipperId } = req.query;
    const where: any = {};
    if (status) where.status = status as string;
    if (buyerId) where.buyerId = buyerId as string;
    if (shopId) where.shopId = shopId as string;
    if (shipperId) where.shipperId = shipperId as string;
    const orders = await prisma.order.findMany({
      where, include: { buyer: { select: { id: true, username: true } }, shop: { select: { id: true, name: true } }, shipper: { select: { id: true, vehicle: true, user: { select: { username: true } } } }, items: { include: { menuItem: true } }, review: true }, orderBy: { createdAt: 'desc' },
    });
    res.json(orders);
  } catch (error) { res.status(500).json({ error: 'Không thể tải đơn hàng' }); }
});

orderRouter.get('/available', async (_req: Request, res: Response) => {
  try {
    const orders = await prisma.order.findMany({
      where: { status: 'confirmed', expiresAt: { gt: new Date() } },
      include: { buyer: { select: { id: true, username: true } }, shop: { select: { id: true, name: true, address: true, lat: true, lng: true } }, items: { include: { menuItem: true } } }, orderBy: { createdAt: 'desc' },
    });
    res.json(orders);
  } catch (error) { res.status(500).json({ error: 'Không thể tải đơn có sẵn' }); }
});

orderRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: { buyer: { select: { id: true, username: true } }, shop: { select: { id: true, name: true, address: true, lat: true, lng: true } }, shipper: { select: { id: true, vehicle: true, lat: true, lng: true, user: { select: { username: true } } } }, items: { include: { menuItem: true } }, review: true },
    });
    if (!order) { res.status(404).json({ error: 'Không tìm thấy đơn hàng' }); return; }
    res.json(order);
  } catch (error) { res.status(500).json({ error: 'Không thể tải đơn hàng' }); }
});

// ETA for an order based on shipper's current position
orderRouter.get('/:id/eta', async (req: Request, res: Response) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: { shipper: { select: { lat: true, lng: true } } },
    });
    if (!order) { res.status(404).json({ error: 'Không tìm thấy đơn hàng' }); return; }

    let etaSeconds: number | null = null;
    let etaLabel: string = '';

    if ((order.status === 'accepted') && order.shipper) {
      etaSeconds = await getOsrmEta(order.shipper.lng, order.shipper.lat, order.pickupLng, order.pickupLat);
      etaLabel = 'Shipper đang tới lấy hàng';
    } else if (['picked_up', 'in_transit'].includes(order.status) && order.shipper) {
      etaSeconds = await getOsrmEta(order.shipper.lng, order.shipper.lat, order.deliveryLng, order.deliveryLat);
      etaLabel = 'Shipper đang giao hàng';
    } else if (order.status === 'pending') {
      etaLabel = 'Chờ shop xác nhận';
    } else if (order.status === 'confirmed') {
      etaLabel = 'Chờ shipper nhận đơn';
    } else if (order.status === 'delivered') {
      etaLabel = 'Giao thành công';
    }

    const etaMinutes = etaSeconds !== null ? Math.max(1, Math.round(etaSeconds / 60)) : null;
    res.json({ status: order.status, etaSeconds, etaMinutes, etaLabel });
  } catch (error) { res.status(500).json({ error: 'Không thể tính ETA' }); }
});

orderRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { buyerId, shopId, items, deliveryAddress, deliveryLat, deliveryLng } = req.body;
    if (!buyerId || !shopId || !items || items.length === 0) { res.status(400).json({ error: 'buyerId, shopId và items là bắt buộc' }); return; }

    let foodCost = 0; const orderItemsData = [];
    for (const item of items) {
      const menuItem = await prisma.menuItem.findUnique({ where: { id: item.menuItemId } });
      if (!menuItem || !menuItem.isAvailable) { res.status(400).json({ error: `Món ${item.menuItemId} không có sẵn` }); return; }
      const quantity = item.quantity || 1; foodCost += menuItem.price * quantity;
      orderItemsData.push({ menuItemId: menuItem.id, quantity, price: menuItem.price });
    }

    const deliveryFee = 5.0;
    const buyer = await prisma.user.findUnique({ where: { id: buyerId } });
    if (!buyer || buyer.balance < foodCost + deliveryFee) { res.status(400).json({ error: 'Số dư không đủ' }); return; }

    const finalDeliveryAddress = deliveryAddress || buyer.homeAddress || `${buyer.username} — Vị trí`;
    const finalDeliveryLat = deliveryLat || buyer.homeLat || 10.77;
    const finalDeliveryLng = deliveryLng || buyer.homeLng || 106.67;

    const shop = await prisma.shop.findUnique({ where: { id: shopId } });
    if (!shop) { res.status(404).json({ error: 'Không tìm thấy shop' }); return; }

    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    await prisma.user.update({ where: { id: buyerId }, data: { balance: { decrement: foodCost + deliveryFee } } });
    await prisma.user.update({ where: { id: shop.ownerId }, data: { balance: { increment: foodCost } } });

    const order = await prisma.order.create({
      data: { buyerId, shopId, totalAmount: foodCost + deliveryFee, deliveryFee, pickupAddress: shop.address, pickupLat: shop.lat, pickupLng: shop.lng, deliveryAddress: finalDeliveryAddress, deliveryLat: finalDeliveryLat, deliveryLng: finalDeliveryLng, expiresAt, items: { create: orderItemsData } },
      include: { items: { include: { menuItem: true } }, shop: { select: { name: true } } },
    });

    // Award XP BEFORE sending response
    await addXp(buyerId, XP_REWARDS.placeOrder);

    res.status(201).json(order);

    io.to(`user:${shop.ownerId}`).emit('order:updated', { orderId: order.id, status: 'pending' });
  } catch (error) { console.error('Lỗi tạo đơn:', error); res.status(500).json({ error: 'Không thể tạo đơn hàng' }); }
});

orderRouter.post('/:id/cancel', async (req: Request, res: Response) => {
  try {
    const order = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!order) { res.status(404).json({ error: 'Không tìm thấy đơn hàng' }); return; }
    if (order.status !== 'pending' && order.status !== 'confirmed') { res.status(400).json({ error: 'Chỉ có thể hủy đơn đang chờ hoặc đã xác nhận' }); return; }

    const updated = await prisma.order.updateMany({ where: { id: order.id, status: { in: ['pending', 'confirmed'] } }, data: { status: 'cancelled' } });
    if (updated.count === 0) { res.status(409).json({ error: 'Đơn đã thay đổi trạng thái, không thể hủy' }); return; }

    const foodCost = order.totalAmount - order.deliveryFee;
    await prisma.user.update({ where: { id: order.buyerId }, data: { balance: { increment: order.totalAmount } } });
    const shop = await prisma.shop.findUnique({ where: { id: order.shopId } });
    if (shop) { await prisma.user.update({ where: { id: shop.ownerId }, data: { balance: { decrement: foodCost } } }); io.to(`user:${shop.ownerId}`).emit('order:updated', { orderId: order.id, status: 'cancelled' }); }
    res.json({ ...order, status: 'cancelled' });
  } catch (error) { res.status(500).json({ error: 'Không thể hủy đơn' }); }
});

orderRouter.post('/expire-stale', async (_req: Request, res: Response) => {
  try {
    const toExpire = await prisma.order.findMany({ where: { status: { in: ['pending', 'confirmed'] }, expiresAt: { lt: new Date() } } });
    let count = 0;
    for (const order of toExpire) {
      const result = await prisma.order.updateMany({ where: { id: order.id, status: order.status }, data: { status: 'expired' } });
      if (result.count === 0) continue;
      count++;
      const foodCost = order.totalAmount - order.deliveryFee;
      await prisma.user.update({ where: { id: order.buyerId }, data: { balance: { increment: order.totalAmount } } });
      const shop = await prisma.shop.findUnique({ where: { id: order.shopId } });
      if (shop) await prisma.user.update({ where: { id: shop.ownerId }, data: { balance: { decrement: foodCost } } });
    }
    res.json({ expired: count });
  } catch (error) { res.status(500).json({ error: 'Không thể hết hạn đơn' }); }
});
