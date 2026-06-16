// Progression system — levels, XP, role gating, daily rewards

export const XP_PER_LEVEL = (level: number) => level * level * 50;

export function xpForNextLevel(level: number): number {
  return XP_PER_LEVEL(level);
}

export function totalXpForLevel(level: number): number {
  let total = 0;
  for (let i = 1; i < level; i++) total += XP_PER_LEVEL(i);
  return total;
}

export interface RoleRequirement {
  role: string;
  minLevel: number;
  label: string;
}

export const ROLE_REQUIREMENTS: RoleRequirement[] = [
  { role: 'buyer', minLevel: 1, label: 'Có sẵn từ đầu' },
  { role: 'shipper', minLevel: 3, label: 'Cần cấp 3 — hoàn thành 3 đơn hàng' },
  { role: 'shop', minLevel: 5, label: 'Cần cấp 5 — tích lũy 700 XP' },
];

export function canSwitchToRole(level: number, role: string): boolean {
  const req = ROLE_REQUIREMENTS.find((r) => r.role === role);
  if (!req) return false;
  return level >= req.minLevel;
}

// XP rewards for actions
export const XP_REWARDS = {
  dailyLogin: 10,
  placeOrder: 5,
  reviewSubmitted: 5,
  orderDelivered: 10,  // for shipper
  foodSold: 15,         // for shop owner
} as const;

// Xu rewards for actions
export const XU_REWARDS = {
  dailyLogin: 50,
  reviewSubmitted: 5,
} as const;

// Daily login bonus cooldown (24 hours in ms)
export const DAILY_BONUS_COOLDOWN = 24 * 60 * 60 * 1000;
