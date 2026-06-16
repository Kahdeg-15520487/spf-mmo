'use client';

import { useState, useEffect, useCallback } from 'react';
import { useGame, Shop, MenuItem, Order, API_URL } from '../game-context';
import { useT } from '../i18n';
import { Zone } from '../zones';
import dynamic from 'next/dynamic';
const OrderTracker = dynamic(() => import('./order-tracker').then(m => ({ default: m.OrderTracker })), { ssr: false });
import { OrderEta } from './order-eta';

const ZoneMapPicker = dynamic(() => import('../components/zone-map-picker'), { ssr: false });

export function BuyerDashboard() {
  const { user, socket, refreshUser } = useGame();
  const t = useT();

  // Always refresh user data on mount
  useEffect(() => { refreshUser(); }, []);
  const [shops, setShops] = useState<Shop[]>([]);
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<Map<string, number>>(new Map());
  const [myOrders, setMyOrders] = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState<'browse' | 'orders'>('browse');
  const [loading, setLoading] = useState(false);
  const [showHomePicker, setShowHomePicker] = useState(false);

  const loadShops = useCallback(async () => {
    const res = await fetch(`${API_URL}/api/shops`);
    if (res.ok) setShops(await res.json());
  }, []);
  const loadOrders = useCallback(async () => {
    if (!user) return;
    const res = await fetch(`${API_URL}/api/orders?buyerId=${user.id}`);
    if (res.ok) setMyOrders(await res.json());
  }, [user]);

  useEffect(() => { loadShops(); loadOrders(); }, [loadShops, loadOrders]);

  // Real-time shop list refresh
  useEffect(() => {
    if (!socket) return;
    socket.on('shops:updated', loadShops);
    return () => { socket.off('shops:updated', loadShops); };
  }, [socket, loadShops]);

  // Poll shops every 30s as fallback
  useEffect(() => {
    const i = setInterval(loadShops, 30000);
    return () => clearInterval(i);
  }, [loadShops]);

  useEffect(() => {
    if (!socket) return;
    socket.on('order:updated', loadOrders);
    socket.on('order:shipper-assigned', loadOrders);
    return () => { socket.off('order:updated', loadOrders); socket.off('order:shipper-assigned', loadOrders); };
  }, [socket, loadOrders]);

  const selectShop = async (shop: Shop) => {
    setSelectedShop(shop);
    const res = await fetch(`${API_URL}/api/shops/${shop.id}`);
    if (res.ok) { const data = await res.json(); setMenuItems(data.menuItems || []); }
  };

  const addToCart = (item: MenuItem) => setCart((prev) => { const next = new Map(prev); next.set(item.id, (next.get(item.id) || 0) + 1); return next; });
  const removeFromCart = (itemId: string) => setCart((prev) => { const next = new Map(prev); const qty = next.get(itemId) || 0; if (qty <= 1) next.delete(itemId); else next.set(itemId, qty - 1); return next; });

  const cartTotal = Array.from(cart.entries()).reduce((total, [itemId, qty]) => { const item = menuItems.find((i) => i.id === itemId); return total + (item?.price || 0) * qty; }, 0);

  const placeOrder = async () => {
    if (!user || !selectedShop || cart.size === 0) return;
    setLoading(true);
    const items = Array.from(cart.entries()).map(([menuItemId, quantity]) => ({ menuItemId, quantity }));
    const res = await fetch(`${API_URL}/api/orders`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ buyerId: user.id, shopId: selectedShop.id, items }) });
    if (res.ok) { setCart(new Map()); setSelectedShop(null); setActiveTab('orders'); loadOrders(); loadShops(); refreshUser(); } else { const err = await res.json(); alert(err.error || t.general.orderFailed); }
    setLoading(false);
  };

  const cancelOrder = async (orderId: string) => { await fetch(`${API_URL}/api/orders/${orderId}/cancel`, { method: 'POST' }); loadOrders(); refreshUser(); };

  const setHomeZone = async (zone: Zone) => {
    if (!user) return;
    await fetch(`${API_URL}/api/auth/set-home-zone`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user.id, zoneId: zone.id }) });
    setShowHomePicker(false);
    const res = await fetch(`${API_URL}/api/auth/me/${user.id}`);
    if (res.ok) { const data = await res.json(); localStorage.setItem('spf-user', JSON.stringify(data)); window.location.reload(); }
  };

  useEffect(() => { if (user && !user.homeZoneId) setShowHomePicker(true); }, [user?.id, user?.homeZoneId]);

  const statusLabel = (s: string) => (t.orderStatus as any)[s] || s;

  // XP progress
  const lvl = user?.level || 1;
  const xp = user?.xp || 0;
  const xpForNext = lvl * lvl * 50;
  const xpForCurrent = (lvl - 1) * (lvl - 1) * 50;
  const xpProgress = Math.min(100, Math.round(((xp - xpForCurrent) / (xpForNext - xpForCurrent)) * 100));

  return (
    <div>
      {/* XP Progress Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-3 mb-4 shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-gray-600 dark:text-gray-300">⭐ Cấp {lvl}</span>
          <span className="text-xs text-gray-400">{xp} / {xpForNext} XP</span>
        </div>
        <div className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full transition-all" style={{ width: `${xpProgress}%` }} />
        </div>
        <div className="flex gap-3 mt-2 text-xs text-gray-400 flex-wrap">
          <span>🛒 Đặt hàng: +5 XP</span>
          <span>⭐ Đánh giá: +10 XP +5 xu</span>
          <span>📅 Điểm danh: +10 XP +500 xu</span>
        </div>
      </div>

      {user?.homeZoneId && (
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 mb-4 flex items-center border border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-2">
            <span className="text-lg">🏠</span>
            <div><p className="text-sm font-medium text-blue-800 dark:text-blue-200">{t.buyer.homeBanner}</p><p className="text-xs text-blue-600 dark:text-blue-400">{user.homeAddress}</p></div>
          </div>
        </div>
      )}

      {showHomePicker && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-auto">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="font-bold text-gray-800 dark:text-white">{t.buyer.chooseHomeTitle}</h3>
              <button onClick={() => setShowHomePicker(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div className="p-4"><ZoneMapPicker zoneType="residential" selectedZoneId={user?.homeZoneId} onSelect={setHomeZone} height="350px" /></div>
          </div>
        </div>
      )}

      {!user?.homeZoneId && !showHomePicker && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md text-center mb-6">
          <div className="text-4xl mb-3">🏠</div>
          <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-2">{t.buyer.welcomeHome}</h2>
          <p className="text-sm text-gray-500 mb-4">{t.buyer.welcomeHomeDesc}</p>
          <button onClick={() => setShowHomePicker(true)} className="px-6 py-2 bg-blue-500 text-white rounded-xl font-bold hover:bg-blue-600">{t.buyer.chooseHome}</button>
        </div>
      )}

      <div className="flex gap-4 mb-6">
        <button onClick={() => setActiveTab('browse')} className={`px-4 py-2 rounded-lg font-medium transition-all ${activeTab === 'browse' ? 'bg-orange-500 text-white shadow-md' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>{t.buyer.browse}</button>
        <button onClick={() => { setActiveTab('orders'); loadOrders(); }} className={`px-4 py-2 rounded-lg font-medium transition-all ${activeTab === 'orders' ? 'bg-orange-500 text-white shadow-md' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>{t.buyer.orders} ({myOrders.length})</button>
      </div>

      {activeTab === 'browse' && (
        <>
          {!selectedShop ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {shops.map((shop) => (
                <button key={shop.id} onClick={() => selectShop(shop)} className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-md hover:shadow-lg transition-all text-left border border-gray-100 dark:border-gray-700">
                  <div className="flex items-start gap-3"><span className="text-3xl">{shop.imageUrl || '🏪'}</span><div><h3 className="font-bold text-lg text-gray-800 dark:text-white">{shop.name}</h3><p className="text-sm text-gray-500 dark:text-gray-400">{shop.description}</p><p className="text-xs text-gray-400 mt-1">📍 {shop.address}</p></div></div>
                </button>
              ))}
              {shops.length === 0 && <p className="text-gray-400 col-span-2 text-center py-12">{t.buyer.noShops}</p>}
            </div>
          ) : (
            <div>
              <button onClick={() => { setSelectedShop(null); setMenuItems([]); setCart(new Map()); }} className="mb-4 text-sm text-orange-500 hover:text-orange-600 flex items-center gap-1">{t.buyer.backToShops}</button>
              <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-md mb-4">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2"><span>{selectedShop.imageUrl || '🏪'}</span> {selectedShop.name}</h2>
                <p className="text-sm text-gray-500">{selectedShop.description}</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {menuItems.map((item) => (
                  <div key={item.id} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 flex items-center justify-between">
                    <div><div className="flex items-center gap-2"><span className="text-xl">{item.imageUrl || '🍽️'}</span><div><h4 className="font-semibold text-gray-800 dark:text-white">{item.name}</h4><p className="text-xs text-gray-400">{item.description}</p></div></div><p className="text-sm font-bold text-orange-600 mt-1">{item.price} {t.app.coins}</p></div>
                    <div className="flex items-center gap-2">
                      {cart.has(item.id) && (<><button onClick={() => removeFromCart(item.id)} className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center font-bold hover:bg-gray-300">-</button><span className="font-bold w-6 text-center">{cart.get(item.id)}</span></>)}
                      <button onClick={() => addToCart(item)} className="w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center font-bold hover:bg-orange-600">+</button>
                    </div>
                  </div>
                ))}
              </div>
              {cart.size > 0 && (
                <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4 shadow-2xl z-40">
                  <div className="max-w-6xl mx-auto flex items-center justify-between">
                    <div><span className="text-sm text-gray-500">{t.buyer.cartItems(cart.size)}</span><p className="font-bold text-lg text-gray-800 dark:text-white">{t.buyer.cartTotal}: {cartTotal} + 5 {t.buyer.delivery} = {cartTotal + 5} {t.app.coins}</p></div>
                    <button onClick={placeOrder} disabled={loading} className="px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold rounded-xl hover:from-orange-600 hover:to-red-600 disabled:opacity-50 shadow-lg">{loading ? t.buyer.placing : t.buyer.placeOrder}</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {activeTab === 'orders' && (
        <div className="space-y-4">
          {myOrders.length === 0 && <p className="text-gray-400 text-center py-12">{t.buyer.noOrders}</p>}
          {myOrders.map((order) => (
            <div key={order.id} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-md border border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <div><span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase ${order.status === 'delivered' ? 'bg-green-100 text-green-700' : order.status === 'cancelled' || order.status === 'expired' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{statusLabel(order.status)}</span><span className="ml-2 text-sm text-gray-500">{order.shop?.name || 'Shop'}</span></div>
                <span className="font-bold text-gray-800 dark:text-white">{order.totalAmount} {t.app.coins}</span>
              </div>
              <div className="text-sm text-gray-500 mb-2">{order.items?.map((oi) => <span key={oi.id} className="mr-2">• {oi.quantity}x {oi.menuItem?.name}</span>)}</div>
              {(order.status === 'accepted' || order.status === 'picked_up' || order.status === 'in_transit') && (
                <OrderEta orderId={order.id} status={order.status} />
              )}
              {['confirmed','accepted','picked_up','in_transit'].includes(order.status) && <OrderTracker order={order} />}
              {(order.status === 'pending' || order.status === 'confirmed') && <button onClick={() => cancelOrder(order.id)} className="mt-2 text-xs text-red-500 hover:text-red-700 underline">{t.buyer.cancelOrder}</button>}
              {order.status === 'delivered' && !order.review && <ReviewForm order={order} onDone={loadOrders} />}
              {order.review && <div className="mt-2 text-xs text-gray-400">{t.buyer.reviewed(order.review.shipperRating||0, order.review.shopRating||0)}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ReviewForm({ order, onDone }: { order: Order; onDone: () => void }) {
  const { user } = useGame();
  const t = useT();
  const [shipperRating, setShipperRating] = useState(5);
  const [shopRating, setShopRating] = useState(5);
  const [shipperComment, setShipperComment] = useState('');
  const [shopComment, setShopComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [expanded, setExpanded] = useState(false);

  if (!expanded) return <button onClick={() => setExpanded(true)} className="mt-2 text-xs text-orange-500 hover:text-orange-600 font-medium">{t.buyer.review}</button>;

  const submit = async () => {
    if (!user) return; setSubmitting(true);
    await fetch(`${API_URL}/api/reviews`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderId: order.id, buyerId: user.id, shipperRating, shopRating, shipperComment, shopComment }) });
    setSubmitting(false); onDone();
  };

  return (
    <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg space-y-2">
      <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">{t.buyer.reviewTitle}</p>
      <div className="flex gap-4">
        <div><label className="text-xs text-gray-500">{t.buyer.shipper} ⭐</label><div className="flex gap-1 mt-1">{[1,2,3,4,5].map((n) => <button key={n} onClick={() => setShipperRating(n)} className={`text-lg ${n <= shipperRating ? 'text-yellow-400' : 'text-gray-300'}`}>★</button>)}</div></div>
        <div><label className="text-xs text-gray-500">{t.buyer.foodRating} ⭐</label><div className="flex gap-1 mt-1">{[1,2,3,4,5].map((n) => <button key={n} onClick={() => setShopRating(n)} className={`text-lg ${n <= shopRating ? 'text-yellow-400' : 'text-gray-300'}`}>★</button>)}</div></div>
      </div>
      <div className="flex gap-2">
        <input placeholder={t.buyer.shipperComment} value={shipperComment} onChange={(e) => setShipperComment(e.target.value)} className="flex-1 px-2 py-1 text-xs rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-200" />
        <input placeholder={t.buyer.foodComment} value={shopComment} onChange={(e) => setShopComment(e.target.value)} className="flex-1 px-2 py-1 text-xs rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-200" />
      </div>
      <button onClick={submit} disabled={submitting} className="px-4 py-1 bg-orange-500 text-white text-sm rounded-lg hover:bg-orange-600 disabled:opacity-50">{submitting ? t.buyer.submitting : t.buyer.submitReview}</button>
    </div>
  );
}
