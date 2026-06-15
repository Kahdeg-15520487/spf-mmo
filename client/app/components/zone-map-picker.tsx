'use client';

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Zone, COMMERCIAL_ZONES, RESIDENTIAL_ZONES } from '../zones';
import { useT } from '../i18n';

interface ZoneMapPickerProps {
  zoneType: 'commercial' | 'residential';
  selectedZoneId?: string | null;
  onSelect: (zone: Zone) => void;
  height?: string;
}

export default function ZoneMapPicker({ zoneType, selectedZoneId, onSelect, height = '350px' }: ZoneMapPickerProps) {
  const t = useT();
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const [hoveredZone, setHoveredZone] = useState<Zone | null>(null);

  const zones = zoneType === 'commercial' ? COMMERCIAL_ZONES : RESIDENTIAL_ZONES;
  const emoji = zoneType === 'commercial' ? '🏪' : '🏠';
  const selectedColor = zoneType === 'commercial' ? '#f97316' : '#3b82f6';
  const selectLabel = zoneType === 'commercial' ? t.zones.selectCommercial : t.zones.selectResidential;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current).setView([10.775, 106.69], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OSM', maxZoom: 18 }).addTo(map);

    zones.forEach((zone) => {
      const isSelected = zone.id === selectedZoneId;
      const marker = L.marker([zone.lat, zone.lng], {
        icon: L.divIcon({ html: `<div style="font-size:28px;text-align:center;line-height:28px;filter:${isSelected?'drop-shadow(0 0 8px '+selectedColor+')':'none'};transform:${isSelected?'scale(1.3)':'scale(1)'};transition:all 0.2s">${emoji}</div>`, className: '', iconSize: [28, 28], iconAnchor: [14, 14] }),
      }).addTo(map).bindPopup(`<b>${zone.name}</b><br/><small>${zone.description}</small><br/><button onclick="window.__zoneSelect('${zone.id}')" style="margin-top:4px;padding:4px 8px;background:${selectedColor};color:white;border:none;border-radius:4px;cursor:pointer;font-size:12px">${selectLabel}</button>`);
      marker.on('mouseover', () => { setHoveredZone(zone); marker.openPopup(); });
      marker.on('mouseout', () => { setHoveredZone(null); });
      marker.on('click', () => onSelect(zone));
      markersRef.current.push(marker);
    });

    (window as any).__zoneSelect = (id: string) => { const z = zones.find((z) => z.id === id); if (z) onSelect(z); };

    const lats = zones.map(z => z.lat), lngs = zones.map(z => z.lng);
    map.fitBounds(L.latLngBounds([Math.min(...lats) - 0.01, Math.min(...lngs) - 0.01], [Math.max(...lats) + 0.01, Math.max(...lngs) + 0.01]));
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; markersRef.current = []; };
  }, []);

  useEffect(() => {
    markersRef.current.forEach((marker, i) => {
      const zone = zones[i]; const isSelected = zone.id === selectedZoneId;
      marker.setIcon(L.divIcon({ html: `<div style="font-size:${isSelected?'34px':'28px'};text-align:center;line-height:${isSelected?'34px':'28px'};filter:${isSelected?'drop-shadow(0 0 8px '+selectedColor+')':'none'};transform:${isSelected?'scale(1.3)':'scale(1)'};transition:all 0.2s">${emoji}</div>`, className: '', iconSize: [isSelected ? 34 : 28, isSelected ? 34 : 28], iconAnchor: [isSelected ? 17 : 14, isSelected ? 17 : 14] }));
    });
  }, [selectedZoneId]);

  return (
    <div className="relative" style={{ height }}>
      <div ref={containerRef} className="w-full h-full rounded-xl overflow-hidden border border-gray-200 dark:border-gray-600" />
      <div className="absolute top-2 left-2 z-[1000] bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg px-3 py-1.5 text-xs font-medium shadow">
        {zoneType === 'commercial' ? t.zones.commercialTitle : t.zones.residentialTitle}
      </div>
      {hoveredZone && (
        <div className="absolute bottom-2 left-2 z-[1000] bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-lg px-3 py-2 text-xs shadow-lg max-w-[200px]">
          <p className="font-bold text-gray-800 dark:text-white">{hoveredZone.name}</p>
          <p className="text-gray-500">{hoveredZone.description}</p>
        </div>
      )}
    </div>
  );
}
