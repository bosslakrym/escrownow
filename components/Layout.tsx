
import React from 'react';
import { APP_NAME } from '../constants';

interface LayoutProps {
  children: React.ReactNode;
  user: any;
  onLogout: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, user, onLogout }) => {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-green-600 rounded flex items-center justify-center">
              <span className="text-white font-bold">E</span>
            </div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">{APP_NAME}</h1>
          </div>
          
          {user && (
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-500 hidden sm:inline">Hello, {user.name}</span>
              <button 
                onClick={onLogout}
                className="text-sm font-medium text-red-600 hover:text-red-700 transition"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>

      <footer className="bg-white border-t border-slate-200 py-8">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-slate-500 text-sm">© 2024 {APP_NAME}. Built for Nigerian Commerce.</p>
          <div className="flex justify-center gap-6 mt-4">
            <a href="#" className="text-slate-400 hover:text-green-600 text-sm">Terms</a>
            <a href="#" className="text-slate-400 hover:text-green-600 text-sm">Privacy</a>
            <a href="#" className="text-slate-400 hover:text-green-600 text-sm">Help</a>
          </div>
        </div>
      </footer>
    </div>
  );
};
