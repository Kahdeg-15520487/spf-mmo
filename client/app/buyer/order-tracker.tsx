'use client';

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Order, useGame, getOsrmUrl } from '../game-context';
import { useT } from '../i18n';

const OSRM_BASE = getOsrmUrl();

const createIcon = (emoji: string, size = 32) =>
  L.divIcon({
    html: `<div style="font-size:${size}px;text-align:center;line-height:${size}px">${emoji}</div>`,
    className: '', iconSize: [size, size], iconAnchor: [size / 2, size / 2],
  });

export function OrderTracker({ order }: { order: Order }) {
  const { socket } = useGame();
  const t = useT();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const scooterRef = useRef<L.Marker | null>(null);
  const routeLineRef = useRef<L.Polyline | null>(null);
  const lastRouteUpdateRef = useRef<number>(0);
  const lastRouteFromRef = useRef<{lat: number, lng: number} | null>(null);
  const orderRef = useRef(order);
  orderRef.current = order; // always latest

  const updateRoute = async (fromLat: number, fromLng: number) => {
    const map = mapRef.current;
    if (!map) return;

    // Throttle: only update every 10s
    const now = Date.now();
    if (now - lastRouteUpdateRef.current < 10000) return;

    // Only update if moved >50m from last route draw
    const last = lastRouteFromRef.current;
    if (last) {
      const d = Math.sqrt(Math.pow(fromLat - last.lat, 2) + Math.pow(fromLng - last.lng, 2));
      if (d < 0.0005) return; // ~50m
    }

    lastRouteUpdateRef.current = now;
    lastRouteFromRef.current = { lat: fromLat, lng: fromLng };

    const o = orderRef.current;
    const targetLat = o.status === 'picked_up' || o.status === 'in_transit' ? o.deliveryLat : o.pickupLat;
    const targetLng = o.status === 'picked_up' || o.status === 'in_transit' ? o.deliveryLng : o.pickupLng;
    if (!targetLat || !targetLng) return;
    try {
      const url = `${OSRM_BASE}/route/v1/driving/${fromLng},${fromLat};${targetLng},${targetLat}?geometries=geojson&overview=full`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.routes?.[0] && mapRef.current) {
        const coords: [number, number][] = data.routes[0].geometry.coordinates.map((c: number[]) => [c[1], c[0]]);
        if (routeLineRef.current) {
          routeLineRef.current.setLatLngs(coords); // update in place — no flicker
        } else {
          routeLineRef.current = L.polyline(coords, { color: '#3b82f6', weight: 4, opacity: 0.8 }).addTo(map);
        }
      }
    } catch {}
  };

  // Init map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const shipperLat = order.shipper?.lat || order.pickupLat;
    const shipperLng = order.shipper?.lng || order.pickupLng;
    const center = { lat: shipperLat || order.pickupLat, lng: shipperLng || order.pickupLng };
    const map = L.map(containerRef.current, { zoomControl: false, attributionControl: false }).setView([center.lat, center.lng], 15);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);

    // Pickup + delivery markers
    if (order.pickupLat && order.pickupLng) {
      L.marker([order.pickupLat, order.pickupLng], { icon: createIcon('🏪', 32) }).addTo(map)
        .bindPopup(`<b>${order.shop?.name}</b>`);
    }
    if (order.deliveryLat && order.deliveryLng) {
      L.marker([order.deliveryLat, order.deliveryLng], { icon: createIcon('📍', 32) }).addTo(map)
        .bindPopup('Điểm giao hàng');
    }

    // Shipper icon based on vehicle type
    const vehicleEmoji = order.shipper?.vehicle === 'Xe Đạp' ? '🚲' : order.shipper?.vehicle === 'Ô Tô' ? '🚗' : '🛵';
    scooterRef.current = L.marker([shipperLat, shipperLng], { icon: createIcon(vehicleEmoji, 36), zIndexOffset: 1000 }).addTo(map);

    let destroyed = false;

    // Initial route from shipper's current position
    const initLat = order.shipper?.lat || order.pickupLat;
    const initLng = order.shipper?.lng || order.pickupLng;
    if (initLat && initLng) {
      setTimeout(() => updateRoute(initLat, initLng), 100);
    }

    // Center on shipper at zoom 15 — don't zoom out to fit all markers
    if (shipperLat && shipperLng) {
      map.setView([shipperLat, shipperLng], 15);
    }

    mapRef.current = map;
    return () => { destroyed = true; map.remove(); mapRef.current = null; };
  }, [order.id]);

  // Force route redraw when status changes
  useEffect(() => {
    lastRouteUpdateRef.current = 0;
    lastRouteFromRef.current = null;
  }, [order.status]);

  // Move scooter marker when shipper gets assigned (order.id unchanged but shipper appears)
  useEffect(() => {
    if (!order.shipper?.lat || !order.shipper?.lng || !scooterRef.current) return;
    scooterRef.current.setLatLng([order.shipper.lat, order.shipper.lng]);
    // Center map on the newly-assigned shipper
    if (mapRef.current) {
      mapRef.current.setView([order.shipper.lat, order.shipper.lng], 15);
    }
    // Also trigger initial route draw from the shipper's position
    lastRouteUpdateRef.current = 0;
    lastRouteFromRef.current = null;
    updateRoute(order.shipper.lat, order.shipper.lng);
  }, [order.shipper?.lat, order.shipper?.lng]);

  // Live shipper position via socket
  useEffect(() => {
    if (!socket) return;
    socket.emit('order:watch', order.id);

    socket.on('shipper:location-update', (data: { orderId: string; lat: number; lng: number }) => {
      if (data.orderId !== order.id) return;
      if (scooterRef.current) scooterRef.current.setLatLng([data.lat, data.lng]);
      // Only pan if scooter is outside current view
      if (mapRef.current && !mapRef.current.getBounds().contains([data.lat, data.lng])) {
        mapRef.current.panTo([data.lat, data.lng], { animate: true, duration: 0.5 });
      }
      updateRoute(data.lat, data.lng);
    });

    return () => {
      socket.off('shipper:location-update');
      socket.emit('order:unwatch', order.id);
    };
  }, [socket, order.id]);

  return (
    <div className="mt-2 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600">
      <div className="px-3 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50">
        🗺️ {t.tracker.tracking}
      </div>
      <div ref={containerRef} style={{ height: '200px' }} />
    </div>
  );
}
