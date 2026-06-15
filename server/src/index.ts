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
    const count = await prisma.order.updateMany({
      where: { status: 'pending', expiresAt: { lt: new Date() } },
      data: { status: 'expired' },
    });
    if (count.count > 0) {
      // Refund buyers for auto-expired orders
      const expired = await prisma.order.findMany({ where: { status: 'expired' } });
      for (const order of expired) {
        const foodCost = order.totalAmount - order.deliveryFee;
        await prisma.user.update({ where: { id: order.buyerId }, data: { balance: { increment: order.totalAmount } } });
        const shop = await prisma.shop.findUnique({ where: { id: order.shopId } });
        if (shop) await prisma.user.update({ where: { id: shop.ownerId }, data: { balance: { decrement: foodCost } } });
      }
      console.log(`⏰ Auto-expired ${count.count} stale orders`);
    }
  } catch { /* silently ignore */ }
}, 60000);

console.log('⏰ Auto-expire worker started (checks every 60s)');

// Start bot simulation
startBots(prisma, io);
