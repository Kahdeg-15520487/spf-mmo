'use client';

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Order, useGame } from '../game-context';
import { useT } from '../i18n';

const OSRM_BASE = 'http://localhost:5000';

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

  // Init map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const center = { lat: (order.pickupLat + order.deliveryLat) / 2, lng: (order.pickupLng + order.deliveryLng) / 2 };
    const map = L.map(containerRef.current, { zoomControl: false, attributionControl: false }).setView([center.lat, center.lng], 14);

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

    // Scooter marker
    const shipperLat = order.shipper?.lat || order.pickupLat;
    const shipperLng = order.shipper?.lng || order.pickupLng;
    scooterRef.current = L.marker([shipperLat, shipperLng], { icon: createIcon('🛵', 36), zIndexOffset: 1000 }).addTo(map);

    let destroyed = false;

    // OSRM route
    (async () => {
      try {
        const url = `${OSRM_BASE}/route/v1/driving/${order.pickupLng},${order.pickupLat};${order.deliveryLng},${order.deliveryLat}?geometries=geojson&overview=full`;
        const res = await fetch(url);
        const data = await res.json();
        if (!destroyed && data.routes?.[0]) {
          const coords = data.routes[0].geometry.coordinates.map((c: number[]) => [c[1], c[0]]);
          L.polyline(coords, { color: '#3b82f6', weight: 4, opacity: 0.7 }).addTo(map);
        }
      } catch {
        if (!destroyed && order.pickupLat && order.deliveryLat) {
          L.polyline([[order.pickupLat, order.pickupLng], [order.deliveryLat, order.deliveryLng]], { color: '#3b82f6', weight: 3, dashArray: '8,6', opacity: 0.6 }).addTo(map);
        }
      }
    })();

    if (order.pickupLat && order.pickupLng && order.deliveryLat && order.deliveryLng) {
      map.fitBounds(L.latLngBounds(
        [Math.min(order.pickupLat, order.deliveryLat) - 0.005, Math.min(order.pickupLng, order.deliveryLng) - 0.005],
        [Math.max(order.pickupLat, order.deliveryLat) + 0.005, Math.max(order.pickupLng, order.deliveryLng) + 0.005]
      ));
    }

    mapRef.current = map;
    return () => { destroyed = true; map.remove(); mapRef.current = null; };
  }, [order.id]);

  // Live shipper position via socket
  useEffect(() => {
    if (!socket) return;
    socket.emit('order:watch', order.id);

    socket.on('shipper:location-update', (data: { orderId: string; lat: number; lng: number }) => {
      if (data.orderId !== order.id) return;
      if (scooterRef.current) scooterRef.current.setLatLng([data.lat, data.lng]);
      if (mapRef.current) mapRef.current.panTo([data.lat, data.lng], { animate: true, duration: 0.5 });
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
