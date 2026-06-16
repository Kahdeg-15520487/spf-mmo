import { Server as SocketIOServer, Socket } from 'socket.io';
import { prisma } from './index';

// Track which users are connected and their socket IDs
const userSockets = new Map<string, Set<string>>();
// Track which orders buyers are watching
const orderWatchers = new Map<string, Set<string>>();

export function setupSocketHandlers(io: SocketIOServer) {
  io.on('connection', (socket: Socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    // User joins with their userId
    socket.on('join', async (data: { userId: string; role: string }) => {
      const { userId, role } = data;
      if (!userId) return;

      // Track user socket mapping
      if (!userSockets.has(userId)) {
        userSockets.set(userId, new Set());
      }
      userSockets.get(userId)!.add(socket.id);

      // Join role-specific room
      socket.join(`user:${userId}`);
      socket.join(`role:${role}`);

      // If shipper, update online status
      if (role === 'shipper') {
        try {
          const shipper = await prisma.shipper.findUnique({ where: { userId } });
          if (shipper) {
            await prisma.shipper.update({ where: { id: shipper.id }, data: { isOnline: true } });
            socket.join('shippers');
            io.to('shippers').emit('shipper:online', shipper.id);
          }
        } catch (e) { console.error('Socket join shipper error:', e); }
      }

      console.log(`👤 User ${userId} joined as ${role}`);
    });

    // Shipper sends location update → broadcast to watching buyers
    socket.on('shipper:location', async (data: { shipperId: string; lat: number; lng: number; orderId?: string }) => {
      try {
        const { shipperId, lat, lng, orderId } = data;
        await prisma.shipper.update({ where: { id: shipperId }, data: { lat, lng } });

        if (orderId) {
          io.to(`order:${orderId}`).emit('shipper:location-update', { shipperId, lat, lng, orderId });
        }
      } catch (e) { console.error('Socket location error:', e); }
    });

    // Buyer starts watching an order (for live tracking)
    socket.on('order:watch', (orderId: string) => {
      socket.join(`order:${orderId}`);
      if (!orderWatchers.has(orderId)) {
        orderWatchers.set(orderId, new Set());
      }
      orderWatchers.get(orderId)!.add(socket.id);
      console.log(`👀 Client ${socket.id} watching order ${orderId}`);
    });

    // Buyer stops watching
    socket.on('order:unwatch', (orderId: string) => {
      socket.leave(`order:${orderId}`);
      const watchers = orderWatchers.get(orderId);
      if (watchers) {
        watchers.delete(socket.id);
        if (watchers.size === 0) orderWatchers.delete(orderId);
      }
    });

    // Order status changed → notify relevant parties
    socket.on('order:status-changed', (data: { orderId: string; status: string }) => {
      const { orderId, status } = data;
      io.to(`order:${orderId}`).emit('order:status-update', { orderId, status });

      // Also notify the buyer's user room
      io.emit('order:updated', { orderId, status });
    });

    // Shipper accepts order → notify buyer
    socket.on('order:accepted', (data: { orderId: string; buyerId: string }) => {
      io.to(`user:${data.buyerId}`).emit('order:shipper-assigned', data);
      io.to(`order:${data.orderId}`).emit('order:shipper-assigned', data);
    });

    // Disconnect
    socket.on('disconnect', async () => {
      try {
      console.log(`🔌 Client disconnected: ${socket.id}`);

      // Clean up user socket tracking
      for (const [userId, sockets] of userSockets.entries()) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          userSockets.delete(userId);
          // If user was a shipper, mark offline
          const shipper = await prisma.shipper.findUnique({ where: { userId } });
          if (shipper) {
            await prisma.shipper.update({
              where: { id: shipper.id },
              data: { isOnline: false },
            });
            io.to('shippers').emit('shipper:offline', shipper.id);
          }
        }
      }

      // Clean up order watchers
      for (const [orderId, watchers] of orderWatchers.entries()) {
        watchers.delete(socket.id);
        if (watchers.size === 0) orderWatchers.delete(orderId);
      }
      } catch (e) { console.error('Socket disconnect error:', e); }
    });
  });
}
