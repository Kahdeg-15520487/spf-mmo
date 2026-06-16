import { Router, Request, Response } from 'express';
import { prisma, io } from '../index';

export const orderRouter = Router();

// Get all orders (with filters)
orderRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { status, buyerId, shopId, shipperId } = req.query;
    const where: any = {};

    if (status) where.status = status as string;
    if (buyerId) where.buyerId = buyerId as string;
    if (shopId) where.shopId = shopId as string;
    if (shipperId) where.shipperId = shipperId as string;

    const orders = await prisma.order.findMany({
      where,
      include: {
        buyer: { select: { id: true, username: true } },
        shop: { select: { id: true, name: true } },
        shipper: { select: { id: true, vehicle: true, user: { select: { username: true } } } },
        items: { include: { menuItem: true } },
        review: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Get available orders for shippers
orderRouter.get('/available', async (_req: Request, res: Response) => {
  try {
    const orders = await prisma.order.findMany({
      where: {
        status: 'confirmed',
        expiresAt: { gt: new Date() },
      },
      include: {
        buyer: { select: { id: true, username: true } },
        shop: { select: { id: true, name: true, address: true, lat: true, lng: true } },
        items: { include: { menuItem: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch available orders' });
  }
});

// Get single order
orderRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: {
        buyer: { select: { id: true, username: true } },
        shop: { select: { id: true, name: true, address: true, lat: true, lng: true } },
        shipper: {
          select: {
            id: true,
            vehicle: true,
            lat: true,
            lng: true,
            user: { select: { username: true } },
          },
        },
        items: { include: { menuItem: true } },
        review: true,
      },
    });

    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// Place a new order (Buyer)
orderRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { buyerId, shopId, items, deliveryAddress, deliveryLat, deliveryLng } = req.body;

    if (!buyerId || !shopId || !items || items.length === 0) {
      res.status(400).json({ error: 'buyerId, shopId, and items are required' });
      return;
    }

    // Calculate total
    let totalAmount = 0;
    const orderItemsData = [];

    for (const item of items) {
      const menuItem = await prisma.menuItem.findUnique({ where: { id: item.menuItemId } });
      if (!menuItem || !menuItem.isAvailable) {
        res.status(400).json({ error: `Menu item ${item.menuItemId} not available` });
        return;
      }
      const quantity = item.quantity || 1;
      totalAmount += menuItem.price * quantity;
      orderItemsData.push({
        menuItemId: menuItem.id,
        quantity,
        price: menuItem.price,
      });
    }

    const deliveryFee = 5.0;

    // Check buyer balance
    const buyer = await prisma.user.findUnique({ where: { id: buyerId } });
    if (!buyer || buyer.balance < totalAmount + deliveryFee) {
      res.status(400).json({ error: 'Insufficient balance' });
      return;
    }

    // Default delivery to buyer's home zone if not specified
    const finalDeliveryAddress = deliveryAddress || buyer.homeAddress || `${buyer.username}'s Location`;
    const finalDeliveryLat = deliveryLat || buyer.homeLat || 10.77;
    const finalDeliveryLng = deliveryLng || buyer.homeLng || 106.67;

    // Get shop address as pickup
    const shop = await prisma.shop.findUnique({ where: { id: shopId } });
    if (!shop) {
      res.status(404).json({ error: 'Shop not found' });
      return;
    }

    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 min expiry

    // Deduct payment
    await prisma.user.update({
      where: { id: buyerId },
      data: { balance: { decrement: totalAmount + deliveryFee } },
    });

    // Credit shop owner
    await prisma.user.update({
      where: { id: shop.ownerId },
      data: { balance: { increment: totalAmount } },
    });

    const order = await prisma.order.create({
      data: {
        buyerId,
        shopId,
        totalAmount: totalAmount + deliveryFee,
        deliveryFee,
        pickupAddress: shop.address,
        pickupLat: shop.lat,
        pickupLng: shop.lng,
        deliveryAddress: finalDeliveryAddress,
        deliveryLat: finalDeliveryLat,
        deliveryLng: finalDeliveryLng,
        expiresAt,
        items: {
          create: orderItemsData,
        },
      },
      include: {
        items: { include: { menuItem: true } },
        shop: { select: { name: true } },
      },
    });

    res.status(201).json(order);

    // Notify shop via WebSocket
    io.to(`user:${shop.ownerId}`).emit('order:updated', { orderId: order.id, status: 'pending' });
  } catch (error) {
    console.error('Order creation error:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// Cancel order (Buyer only, before accepted)
orderRouter.post('/:id/cancel', async (req: Request, res: Response) => {
  try {
    const order = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!order) { res.status(404).json({ error: 'Order not found' }); return; }

    if (order.status !== 'pending' && order.status !== 'confirmed') {
      res.status(400).json({ error: 'Can only cancel pending or confirmed orders' });
      return;
    }

    // Atomic cancel — only succeeds if order still in cancellable state
    const updated = await prisma.order.updateMany({
      where: { id: order.id, status: { in: ['pending', 'confirmed'] } },
      data: { status: 'cancelled' },
    });

    if (updated.count === 0) {
      res.status(409).json({ error: 'Order status changed, cannot cancel' });
      return;
    }

    // Refund buyer and claw back from shop owner (only after successful cancel)
    const foodCost = order.totalAmount - order.deliveryFee;
    await prisma.user.update({ where: { id: order.buyerId }, data: { balance: { increment: order.totalAmount } } });
    const shop = await prisma.shop.findUnique({ where: { id: order.shopId } });
    if (shop) {
      await prisma.user.update({ where: { id: shop.ownerId }, data: { balance: { decrement: foodCost } } });
      io.to(`user:${shop.ownerId}`).emit('order:updated', { orderId: order.id, status: 'cancelled' });
    }

    res.json({ ...order, status: 'cancelled' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to cancel order' });
  }
});

// Expire stale orders (called periodically or on-demand)
orderRouter.post('/expire-stale', async (_req: Request, res: Response) => {
  try {
    const toExpire = await prisma.order.findMany({
      where: { status: { in: ['pending', 'confirmed'] }, expiresAt: { lt: new Date() } },
    });
    let count = 0;
    for (const order of toExpire) {
      const result = await prisma.order.updateMany({
        where: { id: order.id, status: order.status },
        data: { status: 'expired' },
      });
      if (result.count === 0) continue; // already processed
      count++;
      const foodCost = order.totalAmount - order.deliveryFee;
      await prisma.user.update({ where: { id: order.buyerId }, data: { balance: { increment: order.totalAmount } } });
      const shop = await prisma.shop.findUnique({ where: { id: order.shopId } });
      if (shop) await prisma.user.update({ where: { id: shop.ownerId }, data: { balance: { decrement: foodCost } } });
    }
    res.json({ expired: count });
  } catch (error) {
    res.status(500).json({ error: 'Failed to expire orders' });
  }
});
