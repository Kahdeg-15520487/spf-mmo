'use client';

import { useEffect, useState, useRef } from 'react';
import { Order, useGame } from '../game-context';
import { useT } from '../i18n';

interface ShipperLocation { shipperId: string; lat: number; lng: number; orderId: string; }

export function OrderTracker({ order }: { order: Order }) {
  const { socket } = useGame();
  const t = useT();
  const [shipperLoc, setShipperLoc] = useState<{ lat: number; lng: number } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!socket) return;
    socket.emit('order:watch', order.id);
    const handleLocationUpdate = (data: ShipperLocation) => { if (data.orderId === order.id) setShipperLoc({ lat: data.lat, lng: data.lng }); };
    socket.on('shipper:location-update', handleLocationUpdate);
    if (order.shipper?.lat && order.shipper?.lng) setShipperLoc({ lat: order.shipper.lat, lng: order.shipper.lng });
    return () => { socket.off('shipper:location-update', handleLocationUpdate); socket.emit('order:unwatch', order.id); };
  }, [socket, order.id, order.shipper]);

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    const w = canvas.width, h = canvas.height;
    const centerLat = (order.pickupLat + order.deliveryLat) / 2;
    const centerLng = (order.pickupLng + order.deliveryLng) / 2;
    const latRange = Math.abs(order.deliveryLat - order.pickupLat) * 1.8;
    const lngRange = Math.abs(order.deliveryLng - order.pickupLng) * 1.8;
    const range = Math.max(latRange, lngRange, 0.005);
    const toX = (lng: number) => ((lng - centerLng) / range) * w + w / 2;
    const toY = (lat: number) => ((centerLat - lat) / range) * h + h / 2;

    ctx.fillStyle = '#f0f9f0'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#e0e0e0'; ctx.lineWidth = 0.5;
    for (let i = 0; i < w; i += 20) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, h); ctx.stroke(); }
    for (let j = 0; j < h; j += 20) { ctx.beginPath(); ctx.moveTo(0, j); ctx.lineTo(w, j); ctx.stroke(); }
    ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 2; ctx.setLineDash([5, 3]);
    ctx.beginPath(); ctx.moveTo(toX(order.pickupLng), toY(order.pickupLat)); ctx.lineTo(toX(order.deliveryLng), toY(order.deliveryLat)); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = '#f97316'; ctx.beginPath(); ctx.arc(toX(order.pickupLng), toY(order.pickupLat), 6, 0, Math.PI * 2); ctx.fill(); ctx.fillText('🏪', toX(order.pickupLng) - 8, toY(order.pickupLat) - 8);
    ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.arc(toX(order.deliveryLng), toY(order.deliveryLat), 6, 0, Math.PI * 2); ctx.fill(); ctx.fillText('📍', toX(order.deliveryLng) - 8, toY(order.deliveryLat) - 8);
    if (shipperLoc) {
      ctx.fillStyle = '#22c55e'; ctx.beginPath(); ctx.arc(toX(shipperLoc.lng), toY(shipperLoc.lat), 7, 0, Math.PI * 2); ctx.fill(); ctx.fillText('🛵', toX(shipperLoc.lng) - 10, toY(shipperLoc.lat) - 10);
      ctx.strokeStyle = 'rgba(34, 197, 94, 0.4)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(toX(shipperLoc.lng), toY(shipperLoc.lat), 12, 0, Math.PI * 2); ctx.stroke();
    }
  }, [order, shipperLoc]);

  return (
    <div className="mt-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
      <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-2">{t.tracker.tracking} {shipperLoc ? t.tracker.moving : t.tracker.waiting}</p>
      <canvas ref={canvasRef} width={300} height={200} className="w-full rounded-lg border border-gray-200 dark:border-gray-600" />
      <div className="flex justify-between text-xs text-gray-400 mt-1"><span>{t.tracker.pickup} {order.shop?.name}</span><span>{t.tracker.delivery}</span></div>
    </div>
  );
}
