'use client';

import { useState, useEffect, useCallback } from 'react';
import { useGame, Order, API_URL } from '../game-context';
import { useT } from '../i18n';
import { Zone } from '../zones';
import dynamic from 'next/dynamic';

const ZoneMapPicker = dynamic(() => import('../components/zone-map-picker'), { ssr: false });

export function ShopDashboard() {
  const { user, socket } = useGame();
  const t = useT();
  const [shop, setShop] = useState<any>(null);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [editing, setEditing] = useState<any>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showZonePicker, setShowZonePicker] = useState(false);

  const [form, setForm] = useState<{name:string;description:string;price:string;category:string;imageUrl:string}>({ name: '', description: '', price: '', category: 'Chung', imageUrl: '' });

  const loadShop = useCallback(async () => {
    if (!user?.shop?.id) return;
    const res = await fetch(`${API_URL}/api/shops/${user.shop.id}`);
    if (res.ok) { const data = await res.json(); setShop(data); setMenuItems(data.menuItems || []); }
  }, [user?.shop?.id]);
  const loadOrders = useCallback(async () => {
    if (!user?.shop?.id) return;
    const res = await fetch(`${API_URL}/api/orders?shopId=${user.shop.id}`);
    if (res.ok) setOrders(await res.json());
  }, [user?.shop?.id]);

  useEffect(() => { loadShop(); loadOrders(); }, [loadShop, loadOrders]);

  // Real-time updates via WebSocket
  useEffect(() => {
    if (!socket) return;
    socket.on('order:updated', () => loadOrders());
    return () => { socket.off('order:updated'); };
  }, [socket, loadOrders]);

  useEffect(() => { if (shop && !shop.zoneId) setShowZonePicker(true); }, [shop?.id, shop?.zoneId]);

  const setShopZone = async (zone: Zone) => {
    if (!shop) return;
    await fetch(`${API_URL}/api/shops/${shop.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ zoneId: zone.id }) });
    setShowZonePicker(false); loadShop();
  };

  const addItem = async () => {
    if (!shop || !form.name || !form.price) return;
    await fetch(`${API_URL}/api/shops/${shop.id}/menu`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, price: parseFloat(form.price) }) });
    setForm({ name: '', description: '', price: '', category: t.shop.categories[0], imageUrl: '' });
    setShowAddForm(false); loadShop();
  };
  const updateItem = async (itemId: string, updates: any) => {
    await fetch(`${API_URL}/api/shops/${shop.id}/menu/${itemId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updates) });
    setEditing(null); loadShop();
  };
  const deleteItem = async (itemId: string) => {
    if (!confirm(t.shop.deleteConfirm)) return;
    await fetch(`${API_URL}/api/shops/${shop.id}/menu/${itemId}`, { method: 'DELETE' }); loadShop();
  };
  const toggleAvailable = async (itemId: string, current: boolean) => { await updateItem(itemId, { isAvailable: !current }); };

  const confirmOrder = async (orderId: string) => {
    if (!shop) return;
    await fetch(`${API_URL}/api/shops/${shop.id}/confirm-order`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderId }) });
    loadOrders();
  };
  const rejectOrder = async (orderId: string) => {
    if (!shop || !confirm('Từ chối đơn hàng này?')) return;
    await fetch(`${API_URL}/api/shops/${shop.id}/reject-order`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderId }) });
    loadOrders();
  };

  const statusLabel = (s: string) => (t.orderStatus as any)[s] || s;

  if (!shop) return <div className="text-center py-12"><div className="text-5xl mb-4">🍳</div><p className="text-gray-500 dark:text-gray-400">{t.shop.loading}</p><button onClick={loadShop} className="mt-4 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm">{t.shop.reload}</button></div>;

  if (showZonePicker || !shop.zoneId) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-md mb-4 text-center">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">{t.shop.chooseLocation}</h2>
          <p className="text-sm text-gray-500">{t.shop.chooseLocationDesc(shop.name)}</p>
        </div>
        <ZoneMapPicker zoneType="commercial" selectedZoneId={shop.zoneId} onSelect={setShopZone} height="400px" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-md mb-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-800 dark:text-white">{shop.name}</h2>
              <p className="text-sm text-gray-500">{shop.description}</p>
              <p className="text-xs text-gray-400">📍 {shop.address}</p>
              <button onClick={() => setShowZonePicker(true)} className="text-xs text-orange-500 hover:text-orange-600 mt-1 underline">{t.shop.changeLocation}</button>
            </div>
            <span className="text-3xl">🍳</span>
          </div>
        </div>

        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-700 dark:text-gray-200">{t.shop.menu(menuItems.length)}</h3>
          <button onClick={() => setShowAddForm(!showAddForm)} className="px-3 py-1.5 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600">{t.shop.addItem}</button>
        </div>

        {showAddForm && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-md mb-4 space-y-2 border border-orange-200 dark:border-orange-800">
            <input placeholder={t.shop.itemName} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm" />
            <input placeholder={t.shop.desc} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm" />
            <div className="flex gap-2">
              <input placeholder={t.shop.price} type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm" />
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm">
                {t.shop.categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="flex gap-2">
              <button onClick={addItem} className="flex-1 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600">{t.shop.save}</button>
              <button onClick={() => setShowAddForm(false)} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-sm">{t.shop.cancel}</button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {menuItems.map((item: any) => (
            <div key={item.id} className={`bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border ${item.isAvailable ? 'border-gray-100 dark:border-gray-700' : 'border-red-200 dark:border-red-800 opacity-60'}`}>
              {editing === item.id ? (
                <div className="space-y-2">
                  <input defaultValue={item.name} onChange={(e) => item.name = e.target.value} className="w-full px-2 py-1 rounded border text-sm" />
                  <input defaultValue={item.price} type="number" onChange={(e) => item.price = e.target.value} className="w-full px-2 py-1 rounded border text-sm" />
                  <div className="flex gap-2">
                    <button onClick={() => updateItem(item.id, { name: item.name, price: parseFloat(item.price) })} className="px-3 py-1 bg-green-500 text-white text-xs rounded">{t.shop.save}</button>
                    <button onClick={() => setEditing(null)} className="px-3 py-1 bg-gray-300 text-xs rounded">{t.shop.cancel}</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2"><span className="text-lg">{item.imageUrl || '🍽️'}</span><div><span className="font-medium text-sm text-gray-800 dark:text-white">{item.name}</span><span className="text-xs text-gray-400 ml-1">{item.category}</span><p className="text-xs font-bold text-orange-600">{item.price} {t.app.coins}</p></div></div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => toggleAvailable(item.id, item.isAvailable)} className={`px-2 py-1 text-xs rounded ${item.isAvailable ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{item.isAvailable ? '✓' : '✗'}</button>
                    <button onClick={() => setEditing(item.id)} className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-600 rounded hover:bg-gray-200">{t.shop.edit}</button>
                    <button onClick={() => deleteItem(item.id)} className="px-2 py-1 text-xs bg-red-100 dark:bg-red-900/30 text-red-600 rounded hover:bg-red-200">{t.shop.delete}</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="font-bold text-gray-700 dark:text-gray-200 mb-4">{t.shop.incomingOrders(orders.length)}</h3>
        {orders.length === 0 && <p className="text-gray-400 text-center py-8">{t.shop.noOrders}</p>}
        <div className="space-y-3">
          {orders.map((order) => (
            <div key={order.id} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase ${order.status === 'delivered' ? 'bg-green-100 text-green-700' : order.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'}`}>{statusLabel(order.status)}</span>
                <span className="text-sm text-gray-500">{order.buyer?.username} · 💰 {order.totalAmount} {t.app.coins}</span>
              </div>
              <div className="text-xs text-gray-400">{order.items?.map((oi) => <span key={oi.id} className="mr-2">• {oi.quantity}x {oi.menuItem?.name}</span>)}</div>
              {order.status === 'pending' && (
                <div className="flex gap-2 mt-2">
                  <button onClick={() => confirmOrder(order.id)} className="px-3 py-1 bg-green-500 text-white text-xs rounded-lg hover:bg-green-600 font-medium">✅ Xác nhận</button>
                  <button onClick={() => rejectOrder(order.id)} className="px-3 py-1 bg-red-500 text-white text-xs rounded-lg hover:bg-red-600 font-medium">✕ Từ chối</button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
