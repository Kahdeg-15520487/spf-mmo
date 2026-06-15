import { Router, Request, Response } from 'express';
import { prisma, io } from '../index';

export const shipperRouter = Router();

async function emitOrderUpdate(orderId: string, status: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { shop: true },
  });
  if (!order) return;
  io.to(`user:${order.buyerId}`).emit('order:updated', { orderId, status });
  if (order.shop) {
    io.to(`user:${order.shop.ownerId}`).emit('order:updated', { orderId, status });
  }
}

// Get all shippers
shipperRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const shippers = await prisma.shipper.findMany({
      include: { user: { select: { id: true, username: true } } },
    });
    res.json(shippers);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch shippers' });
  }
});

// Toggle shipper online status
shipperRouter.post('/:id/toggle-online', async (req: Request, res: Response) => {
  try {
    const shipper = await prisma.shipper.findUnique({ where: { id: req.params.id } });
    if (!shipper) {
      res.status(404).json({ error: 'Shipper not found' });
      return;
    }

    const updated = await prisma.shipper.update({
      where: { id: req.params.id },
      data: { isOnline: !shipper.isOnline },
      include: { user: { select: { id: true, username: true } } },
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to toggle online status' });
  }
});

// Accept an order
shipperRouter.post('/:id/accept-order', async (req: Request, res: Response) => {
  try {
    const { orderId } = req.body;
    if (!orderId) {
      res.status(400).json({ error: 'orderId is required' });
      return;
    }

    const shipper = await prisma.shipper.findUnique({ where: { id: req.params.id } });
    if (!shipper) {
      res.status(404).json({ error: 'Shipper not found' });
      return;
    }

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    if (order.status !== 'confirmed') {
      res.status(400).json({ error: 'Order is no longer available' });
      return;
    }

    if (order.expiresAt && new Date() > order.expiresAt) {
      res.status(400).json({ error: 'Order has expired' });
      return;
    }

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: {
        shipperId: shipper.id,
        status: 'accepted',
        acceptedAt: new Date(),
      },
      include: {
        buyer: { select: { id: true, username: true } },
        shop: { select: { id: true, name: true, lat: true, lng: true, address: true } },
        shipper: { select: { id: true, vehicle: true, user: { select: { username: true } } } },
        items: { include: { menuItem: true } },
      },
    });

    res.json(updated);

    // Notify buyer and shop
    io.to(`user:${updated.buyerId}`).emit('order:updated', { orderId, status: 'accepted' });
    if (updated.shop) {
      const shop = await prisma.shop.findUnique({ where: { id: updated.shopId } });
      if (shop) io.to(`user:${shop.ownerId}`).emit('order:updated', { orderId, status: 'accepted' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to accept order' });
  }
});

// Update shipper location (for real-time tracking)
shipperRouter.post('/:id/location', async (req: Request, res: Response) => {
  try {
    const { lat, lng } = req.body;
    if (lat == null || lng == null) {
      res.status(400).json({ error: 'lat and lng are required' });
      return;
    }

    const updated = await prisma.shipper.update({
      where: { id: req.params.id },
      data: { lat: parseFloat(lat), lng: parseFloat(lng) },
    });

    res.json({ lat: updated.lat, lng: updated.lng });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update location' });
  }
});

// Pick up order (shipper arrived at shop)
shipperRouter.post('/:id/pickup', async (req: Request, res: Response) => {
  try {
    const { orderId } = req.body;
    const order = await prisma.order.findFirst({
      where: { id: orderId, shipperId: req.params.id, status: 'accepted' },
    });

    if (!order) {
      res.status(400).json({ error: 'Order not found or not in accepted state' });
      return;
    }

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: { status: 'picked_up', pickedUpAt: new Date() },
    });
    emitOrderUpdate(orderId, 'picked_up');
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to pick up order' });
  }
});

// Mark as in transit
shipperRouter.post('/:id/in-transit', async (req: Request, res: Response) => {
  try {
    const { orderId } = req.body;
    const order = await prisma.order.findFirst({
      where: { id: orderId, shipperId: req.params.id, status: 'picked_up' },
    });

    if (!order) {
      res.status(400).json({ error: 'Order not found or not in picked_up state' });
      return;
    }

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: { status: 'in_transit' },
    });
    emitOrderUpdate(orderId, 'in_transit');
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

// Deliver order
shipperRouter.post('/:id/deliver', async (req: Request, res: Response) => {
  try {
    const { orderId } = req.body;
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        shipperId: req.params.id,
        status: { in: ['picked_up', 'in_transit'] },
      },
    });

    if (!order) {
      res.status(400).json({ error: 'Order not found or not deliverable' });
      return;
    }

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: { status: 'delivered', deliveredAt: new Date() },
    });
    emitOrderUpdate(orderId, 'delivered');

    // Pay the shipper for delivery
    const shipperProfile = await prisma.shipper.findUnique({
      where: { id: req.params.id },
      include: { user: true },
    });
    if (shipperProfile) {
      await prisma.user.update({
        where: { id: shipperProfile.userId },
        data: { balance: { increment: order.deliveryFee } },
      });
      await prisma.shipper.update({
        where: { id: req.params.id },
        data: { totalDeliveries: { increment: 1 } },
      });
    }

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to deliver order' });
  }
});

// Get shipper's active orders
shipperRouter.get('/:id/orders', async (req: Request, res: Response) => {
  try {
    const orders = await prisma.order.findMany({
      where: {
        shipperId: req.params.id,
        status: { in: ['accepted', 'picked_up', 'in_transit'] },
      },
      include: {
        buyer: { select: { id: true, username: true } },
        shop: { select: { id: true, name: true, lat: true, lng: true, address: true } },
        items: { include: { menuItem: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});
