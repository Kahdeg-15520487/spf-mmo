import { Router, Request, Response } from 'express';
import { prisma } from '../index';
import { XP_REWARDS, XU_REWARDS, XP_PER_LEVEL } from '../progression';

export const reviewRouter = Router();

async function addXpAndXu(userId: string, xp: number, xu: number) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.isBot) return;
  const newXp = user.xp + xp;
  let newLevel = user.level;
  let remainingXp = newXp;
  while (remainingXp >= XP_PER_LEVEL(newLevel)) { remainingXp -= XP_PER_LEVEL(newLevel); newLevel++; }
  await prisma.user.update({ where: { id: userId }, data: { xp: newXp, level: newLevel, balance: { increment: xu } } });
}

reviewRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { orderId, buyerId, shipperRating, shopRating, shipperComment, shopComment } = req.body;
    if (!orderId || !buyerId) { res.status(400).json({ error: 'orderId và buyerId là bắt buộc' }); return; }

    const order = await prisma.order.findUnique({ where: { id: orderId }, include: { review: true } });
    if (!order) { res.status(404).json({ error: 'Không tìm thấy đơn hàng' }); return; }
    if (order.status !== 'delivered') { res.status(400).json({ error: 'Chỉ đánh giá đơn đã giao' }); return; }
    if (order.review) { res.status(400).json({ error: 'Đơn đã được đánh giá' }); return; }

    const review = await prisma.review.create({
      data: { orderId, buyerId, shipperId: order.shipperId, shipperRating: shipperRating || null, shopRating: shopRating || null, shipperComment: shipperComment || null, shopComment: shopComment || null },
    });

    if (order.shipperId && shipperRating) {
      const all = await prisma.review.findMany({ where: { shipperId: order.shipperId, shipperRating: { not: null } }, select: { shipperRating: true } });
      const avg = all.reduce((sum, r) => sum + (r.shipperRating || 0), 0) / all.length;
      await prisma.shipper.update({ where: { id: order.shipperId }, data: { rating: Math.round(avg * 10) / 10 } });
    }

    res.status(201).json(review);

    // Award XP + xu to buyer for reviewing
    await addXpAndXu(buyerId, XP_REWARDS.reviewSubmitted, XU_REWARDS.reviewSubmitted);
  } catch (error) { res.status(500).json({ error: 'Không thể gửi đánh giá' }); }
});

reviewRouter.get('/shop/:shopId', async (req: Request, res: Response) => {
  try {
    const orders = await prisma.order.findMany({ where: { shopId: req.params.shopId, status: 'delivered' }, select: { id: true } });
    const orderIds = orders.map((o) => o.id);
    const reviews = await prisma.review.findMany({
      where: { orderId: { in: orderIds }, shopRating: { not: null } },
      include: { buyer: { select: { id: true, username: true } }, order: { select: { id: true, createdAt: true } } },
      orderBy: { createdAt: 'desc' }, take: 50,
    });
    res.json(reviews);
  } catch (error) { res.status(500).json({ error: 'Không thể tải đánh giá' }); }
});

reviewRouter.get('/shipper/:shipperId', async (req: Request, res: Response) => {
  try {
    const reviews = await prisma.review.findMany({
      where: { shipperId: req.params.shipperId, shipperRating: { not: null } },
      include: { buyer: { select: { id: true, username: true } }, order: { select: { id: true, createdAt: true } } },
      orderBy: { createdAt: 'desc' }, take: 50,
    });
    res.json(reviews);
  } catch (error) { res.status(500).json({ error: 'Không thể tải đánh giá' }); }
});
