import React from 'react';
import useAppStore from '../store';
import { translations } from '../translations';
import { LogOut, Globe, Sparkles, Building2 } from 'lucide-react';
import EmployeeAvatar from './EmployeeAvatar';

export default function Navbar() {
  const { currentLanguage, setLanguage, activeEmployee, logout, currentTheme } = useAppStore();
  const t = translations[currentLanguage];

  const getThemeClass = () => {
    switch (currentTheme) {
      case 'quantum': return 'bg-cyan-950 text-cyan-100 border-cyan-800';
      case 'xp': return 'bg-purple-950 text-purple-100 border-purple-800';
      case 'deco': return 'bg-amber-950/95 text-amber-100 border-amber-900';
      case 'inferno': return 'bg-orange-950 text-orange-100 border-orange-900';
      case 'arctic': return 'bg-sky-950 text-sky-100 border-sky-800';
      case 'carbon': return 'bg-neutral-900 text-neutral-100 border-neutral-800';
      default: return 'bg-slate-900 text-slate-100 border-slate-800';
    }
  };

  const getBadgeClass = () => {
    switch (currentTheme) {
      case 'quantum': return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30';
      case 'xp': return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'deco': return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'inferno': return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
      case 'arctic': return 'bg-teal-500/20 text-teal-300 border-teal-500/30';
      case 'carbon': return 'bg-zinc-500/20 text-zinc-300 border-zinc-500/30';
      default: return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
    }
  };

  return (
    <nav 
      id="top-navbar-main"
      className={`fixed top-0 left-0 right-0 h-16 border-b z-40 px-4 flex items-center justify-between shadow-md transition-colors duration-300 ${getThemeClass()}`}
    >
      {/* Brand & Logo */}
      <div id="brand-container" className="flex items-center gap-2">
        <div id="brand-icon-wrapper" className="p-2 rounded-lg bg-white/5 border border-white/10">
          <Building2 className="h-5 w-5 text-amber-500 animate-pulse" />
        </div>
        <div id="brand-text" className="flex flex-col">
          <span className="font-mono text-xs tracking-wider text-neutral-400 uppercase leading-none">
            {t.companyPrefix}
          </span>
          <span className="font-sans font-bold text-base leading-tight tracking-tight">
            {t.appName}
          </span>
        </div>
      </div>

      {/* Right Side Options */}
      <div id="navbar-actions" className="flex items-center gap-3">
        {/* FR/EN Toggle */}
        <button
          id="btn-language-toggle"
          onClick={() => setLanguage(currentLanguage === 'FR' ? 'EN' : 'FR')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 active:scale-95 transition text-xs font-medium cursor-pointer"
        >
          <Globe className="h-3.5 w-3.5" />
          <span>{currentLanguage}</span>
        </button>

        {/* User Badge & Logout */}
        {activeEmployee && (
          <div id="navbar-user-profile" className="flex items-center gap-2">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-xs font-semibold leading-none">{activeEmployee.name}</span>
              <span className={`text-[10px] uppercase font-mono px-1.5 py-0.5 rounded border mt-1 leading-none ${getBadgeClass()}`}>
                {activeEmployee.role === 'admin' ? t.roleAdmin : t.roleEmployee}
              </span>
            </div>
            
            <EmployeeAvatar
              src={activeEmployee.avatar}
              name={activeEmployee.name}
              className="h-10 w-10 rounded-full object-cover border border-white/20"
            />

            <button
              id="btn-navbar-logout"
              onClick={logout}
              title={t.logoutBtn}
              className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 active:scale-95 transition cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
