'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Order, API_URL, useGame } from '../game-context';
import { useT } from '../i18n';
import { COMMERCIAL_ZONES, RESIDENTIAL_ZONES } from '../zones';
import VirtualJoystick from '../components/virtual-joystick';

const OSRM_BASE = 'http://localhost:5000';

const createIcon = (emoji: string, size = 32) =>
  L.divIcon({
    html: `<div style="font-size:${size}px;text-align:center;line-height:${size}px">${emoji}</div>`,
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });

interface ShipperMapProps {
  shipperId: string;
  orders: Order[]; // all active orders
  socket: any;
}

export default function ShipperMap({ shipperId, orders, socket }: ShipperMapProps) {
  const t = useT();
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const scooterMarkerRef = useRef<L.Marker | null>(null);
  const routeLinesRef = useRef<L.Polyline[]>([]);
  const markerRefs = useRef<L.Marker[]>([]);

  const [scooterPos, setScooterPos] = useState({ lat: 10.775, lng: 106.698 });
  const lastSnapRef = useRef(0);
  const animFrameRef = useRef(0);

  // Get pickup + delivery points from all active orders
  const allStops = orders.flatMap(o => [
    { lat: o.pickupLat, lng: o.pickupLng, label: '🏪', name: o.shop?.name || 'Shop', type: 'pickup', orderId: o.id },
    { lat: o.deliveryLat, lng: o.deliveryLng, label: '📍', name: o.deliveryAddress, type: 'delivery', orderId: o.id },
  ]);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: false,
    }).setView([10.775, 106.69], 14);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OSM',
      maxZoom: 19,
    }).addTo(map);

    // Scooter marker
    scooterMarkerRef.current = L.marker([scooterPos.lat, scooterPos.lng], {
      icon: createIcon('🛵', 42),
      zIndexOffset: 1000,
    }).addTo(map).bindPopup('Bạn đang ở đây');

    // Add all stop markers
    const seen = new Set<string>();
    allStops.forEach(stop => {
      const key = `${stop.lat},${stop.lng}`;
      if (seen.has(key)) return;
      seen.add(key);
      const marker = L.marker([stop.lat, stop.lng], {
        icon: createIcon(stop.label, 32),
      }).addTo(map).bindPopup(`<b>${stop.name}</b>`);
      markerRefs.current.push(marker);
    });

    // Fetch OSRM route for each order (suggested path)
    orders.forEach(async (order) => {
      try {
        const url = `${OSRM_BASE}/route/v1/driving/${order.pickupLng},${order.pickupLat};${order.deliveryLng},${order.deliveryLat}?geometries=geojson&overview=full`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.routes?.[0]) {
          const coords = data.routes[0].geometry.coordinates.map((c: number[]) => [c[1], c[0]]);
          const line = L.polyline(coords, { color: '#93c5fd', weight: 2, dashArray: '6, 6', opacity: 0.5 }).addTo(map);
          routeLinesRef.current.push(line);
        }
      } catch {}
    });

    // Zone markers
    const zoneIcon = (emoji: string) => L.divIcon({
      html: `<div style="font-size:12px;text-align:center;opacity:0.4">${emoji}</div>`,
      className: '', iconSize: [12, 12], iconAnchor: [6, 6],
    });
    COMMERCIAL_ZONES.forEach(z => {
      L.marker([z.lat, z.lng], { icon: zoneIcon('🏪'), interactive: false }).addTo(map);
    });
    RESIDENTIAL_ZONES.forEach(z => {
      L.marker([z.lat, z.lng], { icon: zoneIcon('🏠'), interactive: false }).addTo(map);
    });

    // Fit to all stops
    if (allStops.length > 0) {
      const lats = [scooterPos.lat, ...allStops.map(s => s.lat)];
      const lngs = [scooterPos.lng, ...allStops.map(s => s.lng)];
      map.fitBounds(L.latLngBounds(
        [Math.min(...lats) - 0.005, Math.min(...lngs) - 0.005],
        [Math.max(...lats) + 0.005, Math.max(...lngs) + 0.005]
      ));
    }

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [orders.length]);

  // Move scooter along road via OSRM snapping
  const snapToRoad = useCallback(async (fromLat: number, fromLng: number, angle: number, force: number) => {
    if (force < 0.1) return { lat: fromLat, lng: fromLng };

    const rad = (angle * Math.PI) / 180;
    const stepDeg = 0.002 * force; // ~200m at max force
    const targetLat = fromLat + Math.sin(rad) * stepDeg;
    const targetLng = fromLng + Math.cos(rad) * stepDeg;

    try {
      // Snap target to nearest road
      const nearUrl = `${OSRM_BASE}/nearest/v1/driving/${targetLng},${targetLat}?number=1`;
      const nearRes = await fetch(nearUrl);
      const nearData = await nearRes.json();
      if (!nearData.waypoints?.[0]) return { lat: targetLat, lng: targetLng };

      const snapped = nearData.waypoints[0].location; // [lng, lat]

      // Get route from current to snapped point
      const routeUrl = `${OSRM_BASE}/route/v1/driving/${fromLng},${fromLat};${snapped[0]},${snapped[1]}?geometries=geojson&overview=full`;
      const routeRes = await fetch(routeUrl);
      const routeData = await routeRes.json();

      if (routeData.routes?.[0]) {
        const coords = routeData.routes[0].geometry.coordinates;
        // Move along first few points
        const steps = Math.min(Math.ceil(force * 5), coords.length - 1);
        const next = coords[Math.min(steps, coords.length - 1)];
        return { lat: next[1], lng: next[0] };
      }
    } catch {}

    return { lat: targetLat, lng: targetLng };
  }, []);

  // Animation loop
  useEffect(() => {
    let joystickAngle = 0;
    let joystickForce = 0;

    const onJoystick = (data: { angle: number; force: number; active: boolean }) => {
      joystickAngle = data.angle;
      joystickForce = data.force;
    };

    const animate = () => {
      if (joystickForce > 0.05) {
        setScooterPos(prev => {
          const now = Date.now();
          if (now - lastSnapRef.current > 500) {
            lastSnapRef.current = now;
            // Async snap — will update on next frame
            snapToRoad(prev.lat, prev.lng, joystickAngle, joystickForce).then(newPos => {
              setScooterPos(newPos);
              // Update server
              fetch(`${API_URL}/api/shippers/${shipperId}/location`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lat: newPos.lat, lng: newPos.lng }),
              });
              if (socket) {
                socket.emit('shipper:location', {
                  shipperId, lat: newPos.lat, lng: newPos.lng,
                  orderId: orders[0]?.id,
                });
              }
            });
            return prev;
          }
          return prev;
        });
      }
      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [shipperId, socket, orders, snapToRoad]);

  // Update scooter marker position
  useEffect(() => {
    if (scooterMarkerRef.current) {
      scooterMarkerRef.current.setLatLng([scooterPos.lat, scooterPos.lng]);
    }
    if (mapRef.current) {
      mapRef.current.panTo([scooterPos.lat, scooterPos.lng], { animate: true, duration: 0.5 });
    }
  }, [scooterPos.lat, scooterPos.lng]);

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />
      <VirtualJoystick onMove={() => {}} />
      <div className="absolute bottom-4 right-4 z-[1000] bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg px-3 py-2 text-xs shadow">
        <div className="font-bold">🛵 {orders.length} đơn đang giao</div>
        {orders.map(o => (
          <div key={o.id} className="text-gray-500">
            {o.shop?.name} → {o.deliveryAddress} · {t.orderStatus[o.status as keyof typeof t.orderStatus] || o.status}
          </div>
        ))}
      </div>
    </div>
  );
}
