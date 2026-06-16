import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { authRouter } from './routes/auth';
import { shopRouter } from './routes/shops';
import { orderRouter } from './routes/orders';
import { shipperRouter } from './routes/shippers';
import { reviewRouter } from './routes/reviews';
import { zonesRouter } from './routes/zones';
import { debugRouter } from './routes/debug';
import { setupSocketHandlers } from './socket';
import { startBots, stopBots } from './bots';

export const prisma = new PrismaClient();
export { io };

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

app.use(cors());
app.use(express.json());

// REST routes
app.use('/api/auth', authRouter);
app.use('/api/shops', shopRouter);
app.use('/api/orders', orderRouter);
app.use('/api/shippers', shipperRouter);
app.use('/api/reviews', reviewRouter);
app.use('/api/zones', zonesRouter);
app.use('/api/debug', debugRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Socket.IO for real-time tracking
setupSocketHandlers(io);

const PORT = process.env.PORT || 13110;
server.listen(PORT, () => {
  console.log(`🚀 SPF MMO Server running on http://localhost:${PORT}`);
  console.log(`🔌 WebSocket ready for real-time tracking`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  stopBots();
  await prisma.$disconnect();
  process.exit(0);
});

// Auto-expire stale orders every 60 seconds
setInterval(async () => {
  try {
    // Find orders needing expiry in a single pass (no double-refund risk)
    const toExpire = await prisma.order.findMany({
      where: { status: { in: ['pending', 'confirmed'] }, expiresAt: { lt: new Date() } },
    });
    for (const order of toExpire) {
      // Atomic: only expire if still in original status (prevents double-processing)
      const updated = await prisma.order.updateMany({
        where: { id: order.id, status: order.status },
        data: { status: 'expired' },
      });
      if (updated.count === 0) continue; // already expired by another tick

      const foodCost = order.totalAmount - order.deliveryFee;
      await prisma.user.update({ where: { id: order.buyerId }, data: { balance: { increment: order.totalAmount } } });
      const shop = await prisma.shop.findUnique({ where: { id: order.shopId } });
      if (shop) await prisma.user.update({ where: { id: shop.ownerId }, data: { balance: { decrement: foodCost } } });
    }
    if (toExpire.length > 0) console.log(`⏰ Auto-expired ${toExpire.length} stale orders`);
  } catch (e) { console.error('Auto-expire error:', e); }
}, 60000);

console.log('⏰ Auto-expire worker started (checks every 60s)');

// Start bot simulation
startBots(prisma, io);
