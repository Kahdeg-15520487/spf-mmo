import { Router, Request, Response } from 'express';
import { prisma } from '../index';

export const reviewRouter = Router();

// Submit a review for a delivered order
reviewRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { orderId, buyerId, shipperRating, shopRating, shipperComment, shopComment } = req.body;

    if (!orderId || !buyerId) {
      res.status(400).json({ error: 'orderId and buyerId are required' });
      return;
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { review: true },
    });

    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    if (order.status !== 'delivered') {
      res.status(400).json({ error: 'Can only review delivered orders' });
      return;
    }

    if (order.review) {
      res.status(400).json({ error: 'Order already reviewed' });
      return;
    }

    const review = await prisma.review.create({
      data: {
        orderId,
        buyerId,
        shipperId: order.shipperId,
        shipperRating: shipperRating || null,
        shopRating: shopRating || null,
        shipperComment: shipperComment || null,
        shopComment: shopComment || null,
      },
    });

    // Update shipper average rating
    if (order.shipperId && shipperRating) {
      const allShipperReviews = await prisma.review.findMany({
        where: { shipperId: order.shipperId, shipperRating: { not: null } },
        select: { shipperRating: true },
      });
      const avg =
        allShipperReviews.reduce((sum, r) => sum + (r.shipperRating || 0), 0) /
        allShipperReviews.length;
      await prisma.shipper.update({
        where: { id: order.shipperId },
        data: { rating: Math.round(avg * 10) / 10 },
      });
    }

    res.status(201).json(review);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create review' });
  }
});

// Get reviews for a shop
reviewRouter.get('/shop/:shopId', async (req: Request, res: Response) => {
  try {
    const orders = await prisma.order.findMany({
      where: { shopId: req.params.shopId, status: 'delivered' },
      select: { id: true },
    });
    const orderIds = orders.map((o) => o.id);

    const reviews = await prisma.review.findMany({
      where: { orderId: { in: orderIds }, shopRating: { not: null } },
      include: {
        buyer: { select: { id: true, username: true } },
        order: { select: { id: true, createdAt: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.json(reviews);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// Get reviews for a shipper
reviewRouter.get('/shipper/:shipperId', async (req: Request, res: Response) => {
  try {
    const reviews = await prisma.review.findMany({
      where: { shipperId: req.params.shipperId, shipperRating: { not: null } },
      include: {
        buyer: { select: { id: true, username: true } },
        order: { select: { id: true, createdAt: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.json(reviews);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});
