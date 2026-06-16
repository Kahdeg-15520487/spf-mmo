'use client';

import { useState, useEffect } from 'react';
import { API_URL } from '../game-context';

interface EtaData {
  status: string;
  etaSeconds: number | null;
  etaMinutes: number | null;
  etaLabel: string;
}

export function OrderEta({ orderId, status }: { orderId: string; status: string }) {
  const [eta, setEta] = useState<EtaData | null>(null);

  useEffect(() => {
    const fetch_ = async () => {
      try {
        const res = await fetch(`${API_URL}/api/orders/${orderId}/eta`);
        if (res.ok) setEta(await res.json());
      } catch {}
    };

    fetch_();
    // Poll every 15s to update as shipper moves
    const interval = setInterval(fetch_, 15000);
    return () => clearInterval(interval);
  }, [orderId, status]);

  if (!eta) return null;

  const color = eta.etaMinutes !== null && eta.etaMinutes <= 5
    ? 'text-green-600 dark:text-green-400'
    : 'text-orange-600 dark:text-orange-400';

  return (
    <div className={`flex items-center gap-1 mt-1 text-xs font-medium ${color}`}>
      <span>⏱</span>
      <span>{eta.etaLabel}</span>
      {eta.etaMinutes !== null && (
        <span className="ml-1 bg-orange-100 dark:bg-orange-900/30 px-1.5 py-0.5 rounded-full">
          ~{eta.etaMinutes} phút
        </span>
      )}
    </div>
  );
}
