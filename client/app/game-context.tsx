'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:13110';

export interface User {
  id: string;
  username: string;
  balance: number;
  role: string;
  homeZoneId?: string | null;
  homeAddress?: string | null;
  homeLat?: number | null;
  homeLng?: number | null;
  shop?: Shop | null;
  shipper?: Shipper | null;
}

export interface Shop {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  address: string;
  lat: number;
  lng: number;
  ownerId: string;
  menuItems?: MenuItem[];
}

export interface MenuItem {
  id: string;
  shopId: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  category: string;
  isAvailable: boolean;
}

export interface Shipper {
  id: string;
  userId: string;
  vehicle: string;
  rating: number;
  totalDeliveries: number;
  isOnline: boolean;
  lat: number;
  lng: number;
  user?: { id: string; username: string };
}

export interface Order {
  id: string;
  buyerId: string;
  shopId: string;
  shipperId: string | null;
  status: string;
  totalAmount: number;
  deliveryFee: number;
  pickupAddress: string;
  pickupLat: number;
  pickupLng: number;
  deliveryAddress: string;
  deliveryLat: number;
  deliveryLng: number;
  createdAt: string;
  expiresAt?: string;
  acceptedAt?: string;
  pickedUpAt?: string;
  deliveredAt?: string;
  buyer?: { id: string; username: string };
  shop?: Shop;
  shipper?: Shipper;
  items?: OrderItem[];
  review?: Review | null;
}

export interface OrderItem {
  id: string;
  menuItemId: string;
  quantity: number;
  price: number;
  menuItem: MenuItem;
}

export interface Review {
  id: string;
  orderId: string;
  shipperRating: number | null;
  shopRating: number | null;
  shipperComment: string | null;
  shopComment: string | null;
}

interface GameContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  socket: Socket | null;
  login: (username: string) => Promise<void>;
  switchRole: (role: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export function GameProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);

  // Restore user from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('spf-user');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setUser(parsed);
      } catch {
        localStorage.removeItem('spf-user');
      }
    }
  }, []);

  // Connect socket when user is set
  useEffect(() => {
    if (!user) return;

    const s = io(API_URL);
    setSocket(s);

    s.on('connect', () => {
      s.emit('join', { userId: user.id, role: user.role });
    });

    return () => {
      s.disconnect();
    };
  }, [user?.id, user?.role]);

  const login = useCallback(async (username: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });
      if (!res.ok) throw new Error('Login failed');
      const data = await res.json();
      setUser(data);
      localStorage.setItem('spf-user', JSON.stringify(data));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const switchRole = useCallback(async (role: string) => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/auth/switch-role`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, role }),
      });
      if (!res.ok) throw new Error('Role switch failed');
      const data = await res.json();
      setUser(data);
      localStorage.setItem('spf-user', JSON.stringify(data));

      // Re-emit join with new role
      if (socket) {
        socket.emit('join', { userId: user.id, role });
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user, socket]);

  const logout = useCallback(() => {
    if (socket) socket.disconnect();
    setUser(null);
    localStorage.removeItem('spf-user');
  }, [socket]);

  const refreshUser = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(`${API_URL}/api/auth/me/${user.id}`);
      if (res.ok) {
        const data = await res.json();
        setUser(data);
        localStorage.setItem('spf-user', JSON.stringify(data));
      }
    } catch { /* ignore */ }
  }, [user?.id]);

  return (
    <GameContext.Provider value={{ user, loading, error, socket, login, switchRole, logout, refreshUser }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}

export { API_URL };
