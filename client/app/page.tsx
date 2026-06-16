'use client';

import { useState } from 'react';
import { useGame } from './game-context';
import { useT } from './i18n';
import { BuyerDashboard } from './buyer/page-content';
import { ShopDashboard } from './shop/page-content';
import { ShipperDashboard } from './shipper/page-content';

export default function Home() {
  const { user, loading, error, login, switchRole, logout } = useGame();
  const t = useT();
  const [username, setUsername] = useState('');

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="text-5xl mb-3">🍜</div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">{t.app.title}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t.app.subtitle}</p>
          </div>
          <form onSubmit={(e) => { e.preventDefault(); if (username.trim()) login(username.trim()); }} className="space-y-4">
            <input type="text" placeholder={t.app.loginPlaceholder} value={username} onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-400" autoFocus />
            <button type="submit" disabled={loading || !username.trim()} className="w-full py-3 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold hover:from-orange-600 hover:to-red-600 disabled:opacity-50 transition-all">
              {loading ? t.app.loggingIn : t.app.loginButton}
            </button>
          </form>
          {error && <p className="mt-4 text-center text-sm text-red-500">{error}</p>}
          <div className="mt-6 text-xs text-center text-gray-400">{t.app.noPassword}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🍜</span>
            <div>
              <h1 className="font-bold text-gray-800 dark:text-white">{t.app.title}</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">{user.username} · 💰 {user.balance.toFixed(0)} {t.app.coins} · ⭐ Cấp {user.level || 1}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1 gap-1">
              {(['buyer','shop','shipper'] as const).map((role) => {
                const lvl = user.level || 1;
                const unlocked = role === 'buyer' || (role === 'shipper' && lvl >= 3) || (role === 'shop' && lvl >= 5);
                return (
                <button key={role} onClick={() => unlocked && switchRole(role)} disabled={!unlocked}
                  title={!unlocked ? (role === 'shipper' ? 'Mở khóa ở Cấp 3' : 'Mở khóa ở Cấp 5') : ''}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${user.role === role ? 'bg-white dark:bg-gray-600 text-orange-600 dark:text-orange-400 shadow-sm' : unlocked ? 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200' : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'}`}>
                  {role === 'shop' ? t.header.roleShop : role === 'shipper' ? t.header.roleShipper : t.header.roleBuyer}
                  {!unlocked && <span className="ml-1 text-xs">🔒</span>}
                </button>
                );
              })}
            </div>
            <button onClick={logout} className="px-3 py-1.5 text-sm text-gray-500 hover:text-red-500 transition-colors">{t.header.exit}</button>
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto p-4">
        {user.role === 'buyer' && <BuyerDashboard />}
        {user.role === 'shop' && <ShopDashboard />}
        {user.role === 'shipper' && <ShipperDashboard />}
      </main>
    </div>
  );
}
