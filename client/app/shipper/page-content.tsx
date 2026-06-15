'use client';

import { useState, useEffect, useCallback } from 'react';
import { useGame, Order, API_URL } from '../game-context';
import { useT } from '../i18n';
import dynamic from 'next/dynamic';

const ShipperMap = dynamic(() => import('./shipper-map'), { ssr: false });

export function ShipperDashboard() {
  const { user, socket } = useGame();
  const t = useT();
  const [shipper, setShipper] = useState<any>(null);
  const [availableOrders, setAvailableOrders] = useState<Order[]>([]);
  const [myOrders, setMyOrders] = useState<Order[]>([]);
  const [isOnline, setIsOnline] = useState(false);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadShipper = useCallback(async () => {
    if (!user?.shipper?.id) return;
    const shippers = await fetch(`${API_URL}/api/shippers`);
    if (shippers.ok) { const data = await shippers.json(); const me = data.find((s: any) => s.userId === user.id); if (me) { setShipper(me); setIsOnline(me.isOnline); } }
  }, [user?.shipper?.id, user?.id]);
  const loadAvailableOrders = useCallback(async () => { const res = await fetch(`${API_URL}/api/orders/available`); if (res.ok) setAvailableOrders(await res.json()); }, []);
  const loadMyOrders = useCallback(async () => {
    if (!shipper?.id) return;
    const res = await fetch(`${API_URL}/api/shippers/${shipper.id}/orders`);
    if (res.ok) { const orders = await res.json(); setMyOrders(orders); const active = orders.find((o: Order) => ['accepted','picked_up','in_transit'].includes(o.status)); if (active) setActiveOrder(active); }
  }, [shipper?.id]);

  useEffect(() => { loadShipper(); }, [loadShipper]);
  useEffect(() => { loadAvailableOrders(); loadMyOrders(); }, [loadAvailableOrders, loadMyOrders, refreshKey]);
  useEffect(() => { if (!socket) return; socket.on('order:updated', () => { loadAvailableOrders(); loadMyOrders(); }); return () => { socket.off('order:updated'); }; }, [socket, loadAvailableOrders, loadMyOrders]);

  const toggleOnline = async () => { if (!shipper) return; await fetch(`${API_URL}/api/shippers/${shipper.id}/toggle-online`, { method: 'POST' }); loadShipper(); };

  const acceptOrder = async (orderId: string) => {
    if (!shipper) return;
    const res = await fetch(`${API_URL}/api/shippers/${shipper.id}/accept-order`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderId }) });
    if (res.ok) { const order = await res.json(); setActiveOrder(order); if (socket) { socket.emit('order:accepted', { orderId, buyerId: order.buyerId }); socket.emit('order:status-changed', { orderId, status: 'accepted' }); } setRefreshKey((k) => k + 1); }
    else { const err = await res.json(); alert(err.error || t.general.acceptFailed); }
  };

  const updateOrderStatus = async (status: string) => {
    if (!shipper || !activeOrder) return;
    const endpoint = status === 'picked_up' ? 'pickup' : status === 'in_transit' ? 'in-transit' : status === 'delivered' ? 'deliver' : '';
    if (!endpoint) return;
    await fetch(`${API_URL}/api/shippers/${shipper.id}/${endpoint}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderId: activeOrder.id }) });
    if (socket) socket.emit('order:status-changed', { orderId: activeOrder.id, status });
    if (status === 'delivered') setActiveOrder(null); else setActiveOrder({ ...activeOrder, status });
    setRefreshKey((k) => k + 1);
  };

  const statusLabel = (s: string) => (t.orderStatus as any)[s] || s;

  if (!shipper) return <div className="text-center py-12"><div className="text-5xl mb-4">🛵</div><p className="text-gray-500 dark:text-gray-400">{t.shipper.loading}</p><button onClick={loadShipper} className="mt-4 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm">{t.shipper.reload}</button></div>;

  return (
    <div>
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-md mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3"><span className="text-3xl">🛵</span><div><h2 className="font-bold text-gray-800 dark:text-white">{user?.username} · {shipper.vehicle}</h2><p className="text-sm text-gray-500">⭐ {shipper.rating?.toFixed(1)} · 📦 {t.shipper.deliveries(shipper.totalDeliveries)}</p></div></div>
        <button onClick={toggleOnline} className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${isOnline ? 'bg-green-500 text-white shadow-md hover:bg-green-600' : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-300'}`}>{isOnline ? t.shipper.online : t.shipper.offline}</button>
      </div>

      {activeOrder && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden mb-4">
          <div className="p-4 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div><h3 className="font-bold text-gray-800 dark:text-white">{t.shipper.activeDelivery(statusLabel(activeOrder.status))}</h3><p className="text-sm text-gray-500">{t.shipper.fromTo}: {activeOrder.shop?.name} → {activeOrder.deliveryAddress}</p></div>
              <span className="font-bold text-orange-600">{activeOrder.deliveryFee} {t.app.coins}</span>
            </div>
            <div className="flex gap-2 mt-3">
              {activeOrder.status === 'accepted' && <button onClick={() => updateOrderStatus('picked_up')} className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600">{t.shipper.pickedUp}</button>}
              {activeOrder.status === 'picked_up' && <button onClick={() => updateOrderStatus('in_transit')} className="px-4 py-2 bg-yellow-500 text-white rounded-lg text-sm font-medium hover:bg-yellow-600">{t.shipper.startDelivery}</button>}
              {['picked_up','in_transit'].includes(activeOrder.status) && <button onClick={() => updateOrderStatus('delivered')} className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600">{t.shipper.delivered}</button>}
            </div>
          </div>
          <div className="h-[400px]"><ShipperMap shipperId={shipper.id} order={activeOrder} socket={socket} /></div>
        </div>
      )}

      {!activeOrder && isOnline && (
        <div>
          <h3 className="font-bold text-gray-700 dark:text-gray-200 mb-4">{t.shipper.availableOrders(availableOrders.length)}</h3>
          {availableOrders.length === 0 && <p className="text-gray-400 text-center py-8">{t.shipper.noOrders}</p>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {availableOrders.map((order) => (
              <div key={order.id} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-md border border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-between mb-2"><div><span className="text-sm font-medium text-gray-800 dark:text-white">{order.shop?.name}</span><p className="text-xs text-gray-400">{t.shipper.pickup}: {order.pickupAddress} → {order.deliveryAddress}</p></div><span className="font-bold text-green-600">+{order.deliveryFee} 💰</span></div>
                <div className="text-xs text-gray-400 mb-2">{order.items?.map((oi) => <span key={oi.id} className="mr-2">• {oi.quantity}x {oi.menuItem?.name}</span>)}</div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">🛒 {order.buyer?.username} · {t.shipper.expiresAt} {order.expiresAt ? new Date(order.expiresAt).toLocaleTimeString('vi-VN') : 'N/A'}</span>
                  <button onClick={() => acceptOrder(order.id)} className="px-4 py-1.5 bg-orange-500 text-white text-sm rounded-lg font-medium hover:bg-orange-600">{t.shipper.accept}</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6">
        <h3 className="font-bold text-gray-700 dark:text-gray-200 mb-3">{t.shipper.recentDeliveries}</h3>
        <div className="space-y-2">
          {myOrders.filter(o => o.status === 'delivered').slice(0, 5).map((order) => (
            <div key={order.id} className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm text-sm flex justify-between"><span className="text-gray-600 dark:text-gray-300">{order.shop?.name} → {order.buyer?.username}</span><span className="text-green-600 font-medium">+{order.deliveryFee} {t.app.coins}</span></div>
          ))}
          {myOrders.filter(o => o.status === 'delivered').length === 0 && <p className="text-xs text-gray-400">{t.shipper.noDeliveries}</p>}
        </div>
      </div>
    </div>
  );
}
