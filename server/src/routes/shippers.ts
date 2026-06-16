import { Router, Request, Response } from 'express';
import { prisma, io } from '../index';

export const shipperRouter = Router();

async function emitOrderUpdate(orderId: string, status: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { shop: true } });
  if (!order) return;
  io.to(`user:${order.buyerId}`).emit('order:updated', { orderId, status });
  if (order.shop) io.to(`user:${order.shop.ownerId}`).emit('order:updated', { orderId, status });
}

shipperRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const shippers = await prisma.shipper.findMany({ include: { user: { select: { id: true, username: true } } } });
    res.json(shippers);
  } catch (error) { res.status(500).json({ error: 'Không thể tải shipper' }); }
});

shipperRouter.post('/:id/toggle-online', async (req: Request, res: Response) => {
  try {
    const shipper = await prisma.shipper.findUnique({ where: { id: req.params.id } });
    if (!shipper) { res.status(404).json({ error: 'Không tìm thấy shipper' }); return; }
    const updated = await prisma.shipper.update({ where: { id: req.params.id }, data: { isOnline: !shipper.isOnline }, include: { user: { select: { id: true, username: true } } } });
    res.json(updated);
  } catch (error) { res.status(500).json({ error: 'Không thể đổi trạng thái' }); }
});

shipperRouter.post('/:id/accept-order', async (req: Request, res: Response) => {
  try {
    const { orderId } = req.body;
    if (!orderId) { res.status(400).json({ error: 'orderId là bắt buộc' }); return; }

    const shipper = await prisma.shipper.findUnique({ where: { id: req.params.id } });
    if (!shipper) { res.status(404).json({ error: 'Không tìm thấy shipper' }); return; }

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) { res.status(404).json({ error: 'Không tìm thấy đơn hàng' }); return; }
    if (order.status !== 'confirmed') { res.status(400).json({ error: 'Đơn không còn khả dụng' }); return; }
    if (order.expiresAt && new Date() > order.expiresAt) { res.status(400).json({ error: 'Đơn đã hết hạn' }); return; }

    try {
      const updated = await prisma.order.update({
        where: { id: orderId, status: 'confirmed' },
        data: { shipperId: shipper.id, status: 'accepted', acceptedAt: new Date() },
        include: { buyer: { select: { id: true, username: true } }, shop: { select: { id: true, name: true, lat: true, lng: true, address: true } }, shipper: { select: { id: true, vehicle: true, user: { select: { username: true } } } }, items: { include: { menuItem: true } } },
      });
      res.json(updated);
      io.to(`user:${updated.buyerId}`).emit('order:updated', { orderId, status: 'accepted' });
      if (updated.shop) { const s = await prisma.shop.findUnique({ where: { id: updated.shopId } }); if (s) io.to(`user:${s.ownerId}`).emit('order:updated', { orderId, status: 'accepted' }); }
    } catch { res.status(409).json({ error: 'Đơn đã được shipper khác nhận' }); }
  } catch (error) { res.status(500).json({ error: 'Không thể nhận đơn' }); }
});

shipperRouter.post('/:id/location', async (req: Request, res: Response) => {
  try {
    const { lat, lng } = req.body;
    if (lat == null || lng == null) { res.status(400).json({ error: 'lat và lng là bắt buộc' }); return; }
    const updated = await prisma.shipper.update({ where: { id: req.params.id }, data: { lat: parseFloat(lat), lng: parseFloat(lng) } });
    res.json({ lat: updated.lat, lng: updated.lng });
  } catch (error) { res.status(500).json({ error: 'Không thể cập nhật vị trí' }); }
});

shipperRouter.post('/:id/pickup', async (req: Request, res: Response) => {
  try {
    const { orderId } = req.body;
    const order = await prisma.order.findFirst({ where: { id: orderId, shipperId: req.params.id, status: 'accepted' } });
    if (!order) { res.status(400).json({ error: 'Không tìm thấy đơn hoặc đơn không ở trạng thái đã nhận' }); return; }
    const updated = await prisma.order.update({ where: { id: orderId }, data: { status: 'picked_up', pickedUpAt: new Date() } });
    emitOrderUpdate(orderId, 'picked_up');
    res.json(updated);
  } catch (error) { res.status(500).json({ error: 'Không thể lấy hàng' }); }
});

shipperRouter.post('/:id/in-transit', async (req: Request, res: Response) => {
  try {
    const { orderId } = req.body;
    const order = await prisma.order.findFirst({ where: { id: orderId, shipperId: req.params.id, status: 'picked_up' } });
    if (!order) { res.status(400).json({ error: 'Không tìm thấy đơn hoặc đơn không ở trạng thái đã lấy' }); return; }
    const updated = await prisma.order.update({ where: { id: orderId }, data: { status: 'in_transit' } });
    emitOrderUpdate(orderId, 'in_transit');
    res.json(updated);
  } catch (error) { res.status(500).json({ error: 'Không thể bắt đầu giao' }); }
});

shipperRouter.post('/:id/deliver', async (req: Request, res: Response) => {
  try {
    const { orderId } = req.body;
    const order = await prisma.order.findFirst({ where: { id: orderId, shipperId: req.params.id, status: { in: ['picked_up', 'in_transit'] } } });
    if (!order) { res.status(400).json({ error: 'Không tìm thấy đơn hoặc không thể giao' }); return; }
    const updated = await prisma.order.update({ where: { id: orderId }, data: { status: 'delivered', deliveredAt: new Date() } });
    emitOrderUpdate(orderId, 'delivered');

    const sp = await prisma.shipper.findUnique({ where: { id: req.params.id }, include: { user: true } });
    if (sp) {
      await prisma.user.update({ where: { id: sp.userId }, data: { balance: { increment: order.deliveryFee } } });
      await prisma.shipper.update({ where: { id: req.params.id }, data: { totalDeliveries: { increment: 1 } } });
    }
    res.json(updated);
  } catch (error) { res.status(500).json({ error: 'Không thể giao hàng' }); }
});

shipperRouter.get('/:id/orders', async (req: Request, res: Response) => {
  try {
    const orders = await prisma.order.findMany({
      where: { shipperId: req.params.id, status: { in: ['accepted', 'picked_up', 'in_transit'] } },
      include: { buyer: { select: { id: true, username: true } }, shop: { select: { id: true, name: true, lat: true, lng: true, address: true } }, items: { include: { menuItem: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(orders);
  } catch (error) { res.status(500).json({ error: 'Không thể tải đơn của shipper' }); }
});
