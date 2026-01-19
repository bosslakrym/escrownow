
import React from 'react';
import { APP_NAME } from '../constants';
import { Link } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
  user: any;
  onLogout: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, user, onLogout }) => {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-50 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-emerald-500/20 shadow-lg group-hover:scale-105 transition-transform">
              <span className="text-slate-900 font-black text-xl">E</span>
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-white">{APP_NAME}</h1>
              <p className="text-[10px] text-emerald-400 font-bold tracking-widest uppercase">Verified Secure</p>
            </div>
          </Link>
          
          {user && (
            <div className="flex items-center gap-6">
              <div className="hidden md:block text-right">
                <p className="text-xs text-slate-400 font-medium">Account</p>
                <p className="text-sm font-bold text-white">{user.name}</p>
              </div>
              <button 
                onClick={onLogout}
                className="bg-slate-800 hover:bg-red-600/20 hover:text-red-400 text-slate-300 px-4 py-2 rounded-lg text-sm font-semibold border border-slate-700 transition-all"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-10 sm:px-6 lg:px-8">
        {children}
      </main>

      <footer className="bg-white border-t border-slate-200 py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-center md:text-left">
              <h3 className="text-lg font-bold text-slate-800">{APP_NAME}</h3>
              <p className="text-slate-500 text-sm mt-1">Nigeria's premier escrow solution for social commerce.</p>
            </div>
            <div className="flex gap-8 text-sm font-medium">
              <a href="#" className="text-slate-500 hover:text-emerald-600 transition">Security</a>
              <a href="#" className="text-slate-500 hover:text-emerald-600 transition">Fees</a>
              <a href="#" className="text-slate-500 hover:text-emerald-600 transition">Support</a>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-slate-400 text-xs">© 2024 {APP_NAME} Technology Ltd. All rights reserved.</p>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">System Online</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
