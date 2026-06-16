'use client';

import { useRef, useEffect, useCallback, useState } from 'react';

interface JoystickData {
  angle: number;  // 0-360 degrees, 0 = right, 90 = up
  force: number;  // 0-1
  active: boolean;
}

interface VirtualJoystickProps {
  onMove: (data: JoystickData) => void;
  size?: number;
}

export default function VirtualJoystick({ onMove, size = 120 }: VirtualJoystickProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const touchIdRef = useRef<number | null>(null);
  const centerRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [knobOffset, setKnobOffset] = useState({ x: 0, y: 0 });
  const rafRef = useRef<number>(0);

  const radius = size / 2;
  const knobRadius = radius * 0.35;

  const getJoystickData = useCallback((clientX: number, clientY: number): JoystickData => {
    const dx = clientX - centerRef.current.x;
    const dy = clientY - centerRef.current.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const clampedDist = Math.min(dist, radius - knobRadius);
    const angle = (Math.atan2(-dy, dx) * 180) / Math.PI; // 0=right, 90=up
    const normalizedAngle = ((angle % 360) + 360) % 360;
    const force = Math.min(dist / (radius - knobRadius), 1);

    return { angle: normalizedAngle, force, active: force > 0.05 };
  }, [radius, knobRadius]);

  const updateKnob = useCallback((clientX: number, clientY: number) => {
    const data = getJoystickData(clientX, clientY);
    if (data.force > 0) {
      const rad = (data.angle * Math.PI) / 180;
      setKnobOffset({
        x: Math.cos(rad) * (radius - knobRadius) * data.force,
        y: -Math.sin(rad) * (radius - knobRadius) * data.force,
      });
    } else {
      setKnobOffset({ x: 0, y: 0 });
    }
    onMove(data);
  }, [getJoystickData, onMove, radius, knobRadius]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    const touch = e.changedTouches[0];
    touchIdRef.current = touch.identifier;
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      centerRef.current = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    }
    updateKnob(touch.clientX, touch.clientY);
  }, [updateKnob]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === touchIdRef.current) {
        updateKnob(e.changedTouches[i].clientX, e.changedTouches[i].clientY);
        break;
      }
    }
  }, [updateKnob]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === touchIdRef.current) {
        touchIdRef.current = null;
        setKnobOffset({ x: 0, y: 0 });
        onMove({ angle: 0, force: 0, active: false });
        break;
      }
    }
  }, [onMove]);

  // Mouse support for desktop
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      centerRef.current = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    }
    updateKnob(e.clientX, e.clientY);

    const handleMouseMove = (me: MouseEvent) => {
      updateKnob(me.clientX, me.clientY);
    };
    const handleMouseUp = () => {
      setKnobOffset({ x: 0, y: 0 });
      onMove({ angle: 0, force: 0, active: false });
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [updateKnob, onMove]);

  return (
    <div
      ref={containerRef}
      className="absolute bottom-6 left-6 z-[1000] rounded-full bg-black/25 backdrop-blur-sm border-2 border-white/30"
      style={{ width: size, height: size }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
    >
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-1 h-1 rounded-full bg-white/50" />
        <div className="absolute rounded-full border border-white/20" style={{ width: radius * 1.2, height: radius * 1.2 }} />
      </div>
      <div
        ref={knobRef}
        className="absolute rounded-full bg-white/80 shadow-lg pointer-events-none transition-transform duration-75"
        style={{
          width: knobRadius * 2,
          height: knobRadius * 2,
          left: radius - knobRadius + knobOffset.x,
          top: radius - knobRadius + knobOffset.y,
        }}
      >
        <div className="w-full h-full flex items-center justify-center text-lg">🛵</div>
      </div>
    </div>
  );
}
