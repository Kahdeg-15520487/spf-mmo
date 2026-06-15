import { Router, Request, Response } from 'express';
import { prisma, io } from '../index';
import { getZoneById } from '../zones';

export const shopRouter = Router();

// Get all shops
shopRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const shops = await prisma.shop.findMany({
      include: {
        owner: { select: { id: true, username: true } },
        menuItems: { where: { isAvailable: true } },
      },
    });
    res.json(shops);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch shops' });
  }
});

// Get shop by ID with full menu
shopRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const shop = await prisma.shop.findUnique({
      where: { id: req.params.id },
      include: {
        owner: { select: { id: true, username: true } },
        menuItems: true,
        orders: {
          include: { items: true },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!shop) {
      res.status(404).json({ error: 'Shop not found' });
      return;
    }

    res.json(shop);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch shop' });
  }
});

// Update shop profile (including zone)
shopRouter.put('/:id', async (req: Request, res: Response) => {
  try {
    const { name, description, imageUrl, address, zoneId } = req.body;

    const data: any = { name, description, imageUrl, address };

    // If zoneId provided, set coordinates from zone
    if (zoneId) {
      const zone = getZoneById(zoneId);
      if (zone && zone.type === 'commercial') {
        data.zoneId = zoneId;
        data.address = zone.name;
        data.lat = zone.lat;
        data.lng = zone.lng;
      }
    }

    const shop = await prisma.shop.update({
      where: { id: req.params.id },
      data,
      include: { menuItems: true },
    });
    res.json(shop);

    // Notify all clients that shops updated
    io.emit('shops:updated');
  } catch (error) {
    res.status(500).json({ error: 'Failed to update shop' });
  }
});

// Add menu item
shopRouter.post('/:id/menu', async (req: Request, res: Response) => {
  try {
    const { name, description, price, imageUrl, category } = req.body;
    if (!name || price == null) {
      res.status(400).json({ error: 'Name and price are required' });
      return;
    }

    const item = await prisma.menuItem.create({
      data: {
        shopId: req.params.id,
        name,
        description: description || '',
        price: parseFloat(price),
        imageUrl: imageUrl || '',
        category: category || 'General',
      },
    });
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create menu item' });
  }
});

// Update menu item
shopRouter.put('/:shopId/menu/:itemId', async (req: Request, res: Response) => {
  try {
    const { name, description, price, imageUrl, category, isAvailable } = req.body;
    const item = await prisma.menuItem.update({
      where: { id: req.params.itemId },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(price !== undefined && { price: parseFloat(price) }),
        ...(imageUrl !== undefined && { imageUrl }),
        ...(category !== undefined && { category }),
        ...(isAvailable !== undefined && { isAvailable }),
      },
    });
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update menu item' });
  }
});

// Delete menu item
shopRouter.delete('/:shopId/menu/:itemId', async (req: Request, res: Response) => {
  try {
    await prisma.menuItem.delete({ where: { id: req.params.itemId } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete menu item' });
  }
});

// Shop confirms an order (accept it)
shopRouter.post('/:shopId/confirm-order', async (req: Request, res: Response) => {
  try {
    const { orderId } = req.body;
    const order = await prisma.order.findFirst({
      where: { id: orderId, shopId: req.params.shopId, status: 'pending' },
    });
    if (!order) {
      res.status(400).json({ error: 'Order not found or not pending' });
      return;
    }
    const updated = await prisma.order.update({
      where: { id: orderId },
      data: { status: 'confirmed' },
    });

    // Notify buyer
    io.to(`user:${order.buyerId}`).emit('order:updated', { orderId, status: 'confirmed' });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to confirm order' });
  }
});

// Shop rejects an order
shopRouter.post('/:shopId/reject-order', async (req: Request, res: Response) => {
  try {
    const { orderId } = req.body;
    const order = await prisma.order.findFirst({
      where: { id: orderId, shopId: req.params.shopId, status: 'pending' },
    });
    if (!order) {
      res.status(400).json({ error: 'Order not found or not pending' });
      return;
    }
    // Refund buyer and claw back
    const foodCost = order.totalAmount - order.deliveryFee;
    await prisma.user.update({ where: { id: order.buyerId }, data: { balance: { increment: order.totalAmount } } });
    const shop = await prisma.shop.findUnique({ where: { id: order.shopId } });
    if (shop) {
      await prisma.user.update({ where: { id: shop.ownerId }, data: { balance: { decrement: foodCost } } });
    }
    const updated = await prisma.order.update({
      where: { id: orderId },
      data: { status: 'rejected' },
    });

    // Notify buyer
    io.to(`user:${order.buyerId}`).emit('order:updated', { orderId, status: 'rejected' });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to reject order' });
  }
});
