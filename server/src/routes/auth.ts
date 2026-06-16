import { Router, Request, Response } from 'express';
import { prisma } from '../index';
import { getZoneById } from '../zones';

export const authRouter = Router();

// Login/Register with username only
authRouter.post('/login', async (req: Request, res: Response) => {
  try {
    const { username } = req.body;
    if (!username || typeof username !== 'string' || username.trim().length === 0) {
      res.status(400).json({ error: 'Tên người dùng là bắt buộc' });
      return;
    }

    const trimmed = username.trim().toLowerCase();
    let user = await prisma.user.findUnique({ where: { username: trimmed } });

    if (!user) {
      user = await prisma.user.create({
        data: { username: trimmed, balance: 1000.0, role: 'buyer' },
      });
    }

    res.json({ id: user.id, username: user.username, balance: user.balance, role: user.role });
  } catch (error) {
    res.status(500).json({ error: 'Đăng nhập thất bại' });
  }
});

// Switch active role
authRouter.post('/switch-role', async (req: Request, res: Response) => {
  try {
    const { userId, role } = req.body;
    if (!userId || !role) {
      res.status(400).json({ error: 'userId và role là bắt buộc' });
      return;
    }

    const validRoles = ['buyer', 'shop', 'shipper'];
    if (!validRoles.includes(role)) {
      res.status(400).json({ error: `Vai trò phải là: ${validRoles.join(', ')}` });
      return;
    }

    const user = await prisma.user.update({ where: { id: userId }, data: { role } });

    if (role === 'shop') {
      await prisma.shop.upsert({
        where: { ownerId: userId },
        create: { ownerId: userId, name: `${user.username} — Shop`, address: 'Chưa chọn địa điểm' },
        update: {},
      });
    }
    if (role === 'shipper') {
      await prisma.shipper.upsert({
        where: { userId: userId },
        create: { userId: userId, vehicle: 'Xe Máy' },
        update: {},
      });
    }

    const fullUser = await prisma.user.findUnique({ where: { id: userId }, include: { shop: true, shipper: true } });
    res.json(fullUser);
  } catch (error) {
    res.status(500).json({ error: 'Chuyển vai trò thất bại' });
  }
});

// Get current user with profiles
authRouter.get('/me/:userId', async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.userId },
      include: { shop: true, shipper: true },
    });
    if (!user) {
      res.status(404).json({ error: 'Không tìm thấy người dùng' });
      return;
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Lấy thông tin thất bại' });
  }
});

// Set buyer home zone
authRouter.post('/set-home-zone', async (req: Request, res: Response) => {
  try {
    const { userId, zoneId } = req.body;
    if (!userId || !zoneId) {
      res.status(400).json({ error: 'userId và zoneId là bắt buộc' });
      return;
    }

    const zone = getZoneById(zoneId);
    if (!zone || zone.type !== 'residential') {
      res.status(400).json({ error: 'Khu dân cư không hợp lệ' });
      return;
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { homeZoneId: zoneId, homeAddress: zone.name, homeLat: zone.lat, homeLng: zone.lng },
      include: { shop: true, shipper: true },
    });

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Đặt khu vực thất bại' });
  }
});
