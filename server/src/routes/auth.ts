import { Router, Request, Response } from 'express';
import { prisma } from '../index';
import { getZoneById } from '../zones';
import { canSwitchToRole, ROLE_REQUIREMENTS, XP_REWARDS, XU_REWARDS, DAILY_BONUS_COOLDOWN, XP_PER_LEVEL } from '../progression';

export const authRouter = Router();

// Get role requirements
authRouter.get('/role-requirements', (_req: Request, res: Response) => {
  res.json(ROLE_REQUIREMENTS);
});

// Login/Register — with daily bonus
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
        data: { username: trimmed, balance: 1000.0, role: 'buyer', level: 1, xp: 0, lastLoginBonus: new Date() },
      });
    } else {
      // Daily login bonus
      const now = new Date();
      const canClaim = !user.lastLoginBonus || (now.getTime() - user.lastLoginBonus.getTime()) >= DAILY_BONUS_COOLDOWN;

      if (canClaim) {
        const bonusXp = XP_REWARDS.dailyLogin;
        const bonusXu = XU_REWARDS.dailyLogin;
        const newXp = user.xp + bonusXp;

        // Check level up
        let newLevel = user.level;
        let remainingXp = newXp;
        while (remainingXp >= XP_PER_LEVEL(newLevel)) {
          remainingXp -= XP_PER_LEVEL(newLevel);
          newLevel++;
        }

        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            balance: { increment: bonusXu },
            xp: newXp,
            level: newLevel,
            lastLoginBonus: now,
          },
        });
      }
    }

    res.json({
      id: user.id, username: user.username, balance: user.balance, role: user.role,
      level: user.level, xp: user.xp, lastLoginBonus: user.lastLoginBonus,
    });
  } catch (error) {
    res.status(500).json({ error: 'Đăng nhập thất bại' });
  }
});

// Switch active role — gated by level
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

    // Check level requirement
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) { res.status(404).json({ error: 'Không tìm thấy người dùng' }); return; }

    if (!canSwitchToRole(user.level, role)) {
      const req = ROLE_REQUIREMENTS.find((r) => r.role === role);
      res.status(403).json({ error: req?.label || 'Chưa đủ cấp để mở khóa vai trò này' });
      return;
    }

    const updated = await prisma.user.update({ where: { id: userId }, data: { role } });

    if (role === 'shop') {
      await prisma.shop.upsert({
        where: { ownerId: userId },
        create: { ownerId: userId, name: `${updated.username} — Shop`, address: 'Chưa chọn địa điểm' },
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
    if (!user) { res.status(404).json({ error: 'Không tìm thấy người dùng' }); return; }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Lấy thông tin thất bại' });
  }
});

// Set buyer home zone
authRouter.post('/set-home-zone', async (req: Request, res: Response) => {
  try {
    const { userId, zoneId } = req.body;
    if (!userId || !zoneId) { res.status(400).json({ error: 'userId và zoneId là bắt buộc' }); return; }

    const zone = getZoneById(zoneId);
    if (!zone || zone.type !== 'residential') { res.status(400).json({ error: 'Khu dân cư không hợp lệ' }); return; }

    const existing = await prisma.user.findUnique({ where: { id: userId }, select: { homeZoneId: true } });
    if (existing?.homeZoneId) { res.status(403).json({ error: 'Không thể thay đổi khu vực sinh sống' }); return; }

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
