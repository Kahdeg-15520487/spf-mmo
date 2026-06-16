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
  const [refreshKey, setRefreshKey] = useState(0);

  const activeOrders = myOrders.filter(o => ['accepted', 'picked_up', 'in_transit'].includes(o.status));

  const loadShipper = useCallback(async () => {
    if (!user?.shipper?.id) return;
    const shippers = await fetch(`${API_URL}/api/shippers`);
    if (shippers.ok) { const data = await shippers.json(); const me = data.find((s: any) => s.userId === user.id); if (me) { setShipper(me); setIsOnline(me.isOnline); } }
  }, [user?.shipper?.id, user?.id]);

  const loadAvailableOrders = useCallback(async () => {
    const res = await fetch(`${API_URL}/api/orders/available`);
    if (res.ok) setAvailableOrders(await res.json());
  }, []);

  const loadMyOrders = useCallback(async () => {
    if (!shipper?.id) return;
    const res = await fetch(`${API_URL}/api/shippers/${shipper.id}/orders`);
    if (res.ok) setMyOrders(await res.json());
  }, [shipper?.id]);

  useEffect(() => { loadShipper(); }, [loadShipper]);
  useEffect(() => { loadAvailableOrders(); loadMyOrders(); }, [loadAvailableOrders, loadMyOrders, refreshKey]);
  useEffect(() => {
    if (!socket) return;
    socket.on('order:updated', () => { loadAvailableOrders(); loadMyOrders(); });
    return () => { socket.off('order:updated'); };
  }, [socket, loadAvailableOrders, loadMyOrders]);

  const toggleOnline = async () => {
    if (!shipper) return;
    await fetch(`${API_URL}/api/shippers/${shipper.id}/toggle-online`, { method: 'POST' });
    loadShipper();
  };

  const acceptOrder = async (orderId: string) => {
    if (!shipper) return;
    const res = await fetch(`${API_URL}/api/shippers/${shipper.id}/accept-order`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderId }),
    });
    if (res.ok) {
      if (socket) socket.emit('order:status-changed', { orderId, status: 'accepted' });
      setRefreshKey(k => k + 1);
    } else {
      const err = await res.json();
      alert(err.error || t.general.acceptFailed);
    }
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    if (!shipper) return;
    const endpoint = status === 'picked_up' ? 'pickup' : status === 'in_transit' ? 'in-transit' : status === 'delivered' ? 'deliver' : '';
    if (!endpoint) return;
    await fetch(`${API_URL}/api/shippers/${shipper.id}/${endpoint}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderId }),
    });
    if (socket) socket.emit('order:status-changed', { orderId, status });
    setRefreshKey(k => k + 1);
  };

  const statusLabel = (s: string) => (t.orderStatus as any)[s] || s;

  if (!shipper) {
    return (
      <div className="text-center py-12">
        <div className="text-5xl mb-4">🛵</div>
        <p className="text-gray-500 dark:text-gray-400">{t.shipper.loading}</p>
        <button onClick={loadShipper} className="mt-4 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm">{t.shipper.reload}</button>
      </div>
    );
  }

  return (
    <div>
      {/* Status Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-md mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🛵</span>
          <div>
            <h2 className="font-bold text-gray-800 dark:text-white">{user?.username} · {shipper.vehicle}</h2>
            <p className="text-sm text-gray-500">⭐ {shipper.rating?.toFixed(1)} · 📦 {shipper.totalDeliveries} đơn · {activeOrders.length} đang giao</p>
          </div>
        </div>
        <button onClick={toggleOnline} className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${isOnline ? 'bg-green-500 text-white shadow-md hover:bg-green-600' : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-300'}`}>
          {isOnline ? t.shipper.online : t.shipper.offline}
        </button>
      </div>

      {/* Map with active orders + joystick */}
      {activeOrders.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden mb-4" style={{ height: '450px' }}>
          <ShipperMap shipperId={shipper.id} orders={activeOrders} socket={socket} />
        </div>
      )}

      {/* Active Order Cards */}
      {activeOrders.length > 0 && (
        <div className="space-y-2 mb-4">
          {activeOrders.map(order => (
            <div key={order.id} className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${order.status === 'accepted' ? 'bg-yellow-100 text-yellow-700' : order.status === 'picked_up' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                    {statusLabel(order.status)}
                  </span>
                  <span className="ml-2 text-sm font-medium">{order.shop?.name} → {order.deliveryAddress}</span>
                </div>
                <span className="text-sm font-bold text-green-600">+{order.deliveryFee} xu</span>
              </div>
              <div className="flex gap-2 mt-2">
                {order.status === 'accepted' && (
                  <button onClick={() => updateOrderStatus(order.id, 'picked_up')} className="px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600">{t.shipper.pickedUp}</button>
                )}
                {order.status === 'picked_up' && (
                  <button onClick={() => updateOrderStatus(order.id, 'in_transit')} className="px-3 py-1 bg-yellow-500 text-white text-xs rounded hover:bg-yellow-600">{t.shipper.startDelivery}</button>
                )}
                {(order.status === 'picked_up' || order.status === 'in_transit') && (
                  <button onClick={() => updateOrderStatus(order.id, 'delivered')} className="px-3 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600">{t.shipper.delivered}</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Available Orders */}
      {isOnline && (
        <div>
          <h3 className="font-bold text-gray-700 dark:text-gray-200 mb-3">{t.shipper.availableOrders(availableOrders.length)}</h3>
          {availableOrders.length === 0 && <p className="text-gray-400 text-center py-8">{t.shipper.noOrders}</p>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {availableOrders.map(order => {
              // Suggest stacking: same shop as any active order
              const isStackable = activeOrders.some(a => a.shopId === order.shopId);
              return (
                <div key={order.id} className={`bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border ${isStackable ? 'border-green-300 dark:border-green-700' : 'border-gray-100 dark:border-gray-700'}`}>
                  <div className="flex items-center justify-between mb-1">
                    <div>
                      <span className="text-sm font-medium">{order.shop?.name}</span>
                      {isStackable && <span className="ml-1 text-xs text-green-600 font-bold">📦 Cùng shop</span>}
                    </div>
                    <span className="text-sm font-bold text-green-600">+{order.deliveryFee} xu</span>
                  </div>
                  <p className="text-xs text-gray-400">{order.pickupAddress} → {order.deliveryAddress}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-gray-400">🛒 {order.buyer?.username}</span>
                    <button onClick={() => acceptOrder(order.id)} className="px-3 py-1 bg-orange-500 text-white text-xs rounded-lg font-medium hover:bg-orange-600">{t.shipper.accept}</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* History */}
      <div className="mt-6">
        <h3 className="font-bold text-gray-700 dark:text-gray-200 mb-3">{t.shipper.recentDeliveries}</h3>
        <div className="space-y-2">
          {myOrders.filter(o => o.status === 'delivered').slice(0, 5).map(order => (
            <div key={order.id} className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm text-sm flex justify-between">
              <span className="text-gray-600 dark:text-gray-300">{order.shop?.name} → {order.buyer?.username}</span>
              <span className="text-green-600 font-medium">+{order.deliveryFee} xu</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
