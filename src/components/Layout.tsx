import React, { useState } from 'react';
import { LayoutDashboard, Receipt, Repeat, Sparkles, Moon, Sun, Menu, X, Tags } from 'lucide-react';
import { Theme } from '../types';
import { TRANSLATIONS } from '../constants';
import { Link, useLocation } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
  theme: Theme;
  toggleTheme: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, theme, toggleTheme }) => {
  const t = (key: string) => TRANSLATIONS[key];
  const location = useLocation();
  // Desktop collapse state
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(false);
  // Mobile menu state (hidden by default)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { path: '/', icon: LayoutDashboard, label: t('dashboard') },
    { path: '/transactions', icon: Receipt, label: t('transactions') },
    { path: '/recurring', icon: Repeat, label: t('recurring') },
    { path: '/categories', icon: Tags, label: t('categories') },
    { path: '/insights', icon: Sparkles, label: t('insights') },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div dir="rtl" className={`min-h-screen flex bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-200 font-sans`}>
      
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 w-full bg-white dark:bg-gray-800 z-40 border-b dark:border-gray-700 flex justify-between items-center p-4 h-[60px]">
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 -mr-2 text-gray-600 dark:text-gray-300">
           {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
        <h1 className="text-xl font-bold bg-gradient-to-l from-blue-600 to-indigo-600 bg-clip-text text-transparent">
          FinTrack Pro
        </h1>
        <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
          {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
        </button>
      </div>

      {/* Sidebar Overlay for Mobile */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`
          fixed md:sticky top-0 right-0 h-screen z-50 bg-white dark:bg-gray-800 shadow-xl md:shadow-md flex flex-col transition-all duration-300 ease-in-out
          ${isMobileMenuOpen ? 'translate-x-0 w-64' : 'translate-x-full md:translate-x-0'}
          ${isDesktopCollapsed ? 'md:w-20' : 'md:w-64'}
        `}
      >
        {/* Sidebar Header (Desktop) */}
        <div className={`hidden md:flex p-6 items-center border-b dark:border-gray-700 h-[88px] ${isDesktopCollapsed ? 'justify-center' : 'justify-between'}`}>
          <h1 className={`text-2xl font-bold bg-gradient-to-l from-blue-600 to-indigo-600 bg-clip-text text-transparent whitespace-nowrap 
            ${isDesktopCollapsed ? 'hidden' : 'block'}
          `}>
            FinTrack Pro
          </h1>
          <button 
            onClick={() => setIsDesktopCollapsed(!isDesktopCollapsed)} 
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors"
          >
            <Menu size={20} />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto mt-[60px] md:mt-0">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setIsMobileMenuOpen(false)}
              title={isDesktopCollapsed ? item.label : ''}
              className={`flex items-center gap-3 py-3 rounded-xl transition-all duration-200 font-medium whitespace-nowrap
                ${isDesktopCollapsed ? 'justify-center px-2' : 'px-4'}
                ${isActive(item.path)
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
              }`}
            >
              <item.icon size={20} className="flex-shrink-0" />
              <span className={`transition-opacity duration-200 ${isDesktopCollapsed ? 'opacity-0 w-0 hidden md:hidden' : 'opacity-100'}`}>
                {item.label}
              </span>
            </Link>
          ))}
        </nav>

        {/* Desktop Toggles */}
        <div className="p-4 border-t dark:border-gray-700 hidden md:flex flex-col gap-3">
          <button
            onClick={toggleTheme}
            title={theme === 'light' ? t('darkMode') : t('lightMode')}
            className={`flex items-center gap-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-sm transition-colors whitespace-nowrap
              ${isDesktopCollapsed ? 'justify-center px-2' : 'px-4'}
            `}
          >
            {theme === 'light' ? <Moon size={18} className="flex-shrink-0" /> : <Sun size={18} className="flex-shrink-0" />}
            <span className={`transition-opacity duration-200 ${isDesktopCollapsed ? 'opacity-0 w-0 hidden' : 'opacity-100'}`}>
              {theme === 'light' ? t('darkMode') : t('lightMode')}
            </span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-4 md:p-8 mt-[60px] md:mt-0 transition-all duration-300 w-full">
        <div className="max-w-7xl mx-auto space-y-6">
          {children}
        </div>
      </main>
    </div>
  );
};