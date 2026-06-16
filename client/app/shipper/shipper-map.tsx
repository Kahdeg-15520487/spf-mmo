'use client';

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Order, API_URL } from '../game-context';
import { Socket } from 'socket.io-client';
import { COMMERCIAL_ZONES, RESIDENTIAL_ZONES } from '../zones';
import { useT } from '../i18n';

// Fix default marker icon issue with Leaflet in Next.js
const createIcon = (emoji: string, size = 32) =>
  L.divIcon({
    html: `<div style="font-size:${size}px;text-align:center;line-height:${size}px">${emoji}</div>`,
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });

interface ShipperMapProps {
  shipperId: string;
  order: Order;
  socket: Socket | null;
}

export default function ShipperMap({ shipperId, order, socket }: ShipperMapProps) {
  const t = useT();
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const shipperMarkerRef = useRef<L.Marker | null>(null);
  const [currentPos, setCurrentPos] = useState<{ lat: number; lng: number }>({
    lat: order.pickupLat,
    lng: order.pickupLng,
  });

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const center = {
      lat: (order.pickupLat + order.deliveryLat) / 2,
      lng: (order.pickupLng + order.deliveryLng) / 2,
    };

    mapRef.current = L.map(mapContainerRef.current).setView([center.lat, center.lng], 14);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(mapRef.current);

    // Pickup marker
    L.marker([order.pickupLat, order.pickupLng], { icon: createIcon('🏪', 36) })
      .addTo(mapRef.current)
      .bindPopup(`<b>Pickup:</b> ${order.shop?.name || 'Shop'}<br/>${order.pickupAddress}`);

    // Delivery marker
    L.marker([order.deliveryLat, order.deliveryLng], { icon: createIcon('📍', 36) })
      .addTo(mapRef.current)
      .bindPopup(`<b>Delivery:</b> ${order.deliveryAddress}`);

    // Fetch road route — try local OSRM first, fallback to public, then straight line
    (async () => {
      const urls = [
        `http://localhost:5000/route/v1/driving/${order.pickupLng},${order.pickupLat};${order.deliveryLng},${order.deliveryLat}?geometries=geojson&overview=full`,
        `https://router.project-osrm.org/route/v1/driving/${order.pickupLng},${order.pickupLat};${order.deliveryLng},${order.deliveryLat}?geometries=geojson&overview=full`,
      ];
      let routed = false;
      for (const osrmUrl of urls) {
        try {
          const routeRes = await fetch(osrmUrl);
          const routeData = await routeRes.json();
          if (routeData.routes && routeData.routes.length > 0) {
            const coords = routeData.routes[0].geometry.coordinates.map((c: number[]) => [c[1], c[0]]);
            L.polyline(coords, { color: '#3b82f6', weight: 4, opacity: 0.8 }).addTo(mapRef.current!);
            routed = true;
            break;
          }
        } catch { /* try next */ }
      }
      if (!routed) {
        L.polyline([[order.pickupLat, order.pickupLng], [order.deliveryLat, order.deliveryLng]], { color: '#3b82f6', weight: 3, dashArray: '10, 10', opacity: 0.7 }).addTo(mapRef.current!);
      }
    })();

    // Shipper marker
    shipperMarkerRef.current = L.marker([currentPos.lat, currentPos.lng], {
      icon: createIcon('🛵', 40),
    })
      .addTo(mapRef.current)
      .bindPopup('You are here');

    // Fit bounds
    const bounds = L.latLngBounds(
      [order.pickupLat, order.pickupLng],
      [order.deliveryLat, order.deliveryLng]
    );
    mapRef.current.fitBounds(bounds, { padding: [50, 50] });

    // Add zone markers (small, semi-transparent)
    const zoneIcon = (emoji: string) => L.divIcon({
      html: `<div style="font-size:16px;text-align:center;opacity:0.6">${emoji}</div>`,
      className: '', iconSize: [16, 16], iconAnchor: [8, 8],
    });
    COMMERCIAL_ZONES.forEach(z => {
      L.marker([z.lat, z.lng], { icon: zoneIcon('🏪'), interactive: false }).addTo(mapRef.current!);
    });
    RESIDENTIAL_ZONES.forEach(z => {
      L.marker([z.lat, z.lng], { icon: zoneIcon('🏠'), interactive: false }).addTo(mapRef.current!);
    });

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [order.id]);

  // Handle shipper movement (click on map)
  useEffect(() => {
    if (!mapRef.current) return;

    const handleClick = async (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      setCurrentPos({ lat, lng });

      // Update server
      await fetch(`${API_URL}/api/shippers/${shipperId}/location`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lng }),
      });

      // Emit via socket
      if (socket) {
        socket.emit('shipper:location', { shipperId, lat, lng, orderId: order.id });
      }

      // Move marker
      if (shipperMarkerRef.current) {
        shipperMarkerRef.current.setLatLng([lat, lng]);
      }
    };

    mapRef.current.on('click', handleClick);

    return () => {
      mapRef.current?.off('click', handleClick);
    };
  }, [shipperId, order.id, socket]);

  // Simulate movement towards delivery on a timer
  useEffect(() => {
    const statuses = ['accepted', 'picked_up', 'in_transit'];
    if (!statuses.includes(order.status)) return;

    const interval = setInterval(() => {
      setCurrentPos((prev) => {
        const newLat = prev.lat + (order.deliveryLat - prev.lat) * 0.05;
        const newLng = prev.lng + (order.deliveryLng - prev.lng) * 0.05;

        // Update via socket
        if (socket) {
          socket.emit('shipper:location', {
            shipperId,
            lat: newLat,
            lng: newLng,
            orderId: order.id,
          });
        }

        // Update marker
        if (shipperMarkerRef.current) {
          shipperMarkerRef.current.setLatLng([newLat, newLng]);
        }

        return { lat: newLat, lng: newLng };
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [order.status, order.deliveryLat, order.deliveryLng, shipperId, order.id, socket]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainerRef} className="w-full h-full" />
      <div className="absolute bottom-3 left-3 z-[1000] bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg px-3 py-1.5 text-xs font-medium shadow">
        🖱️ {t.map.clickToMove}
      </div>
    </div>
  );
}
