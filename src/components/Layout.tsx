import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { supabase } from '../lib/supabase';
import { 
  CheckSquare, 
  LayoutDashboard, 
  BarChart3, 
  Settings, 
  LogOut 
} from 'lucide-react';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { role, profile } = useAppStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    if (window.confirm('هل تريد إنهاء الجلسة وإغلاق النظام؟')) {
      await supabase.auth.signOut();
      navigate('/login');
    }
  };

  const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'الرئيسية', roles: ['محرر إداري أول', 'محرر إداري ثاني', 'مدرس حلقة', 'مشاهد للمنصة'] },
    { path: '/attendance', icon: CheckSquare, label: 'التفقد اليومي', roles: ['محرر إداري أول', 'محرر إداري ثاني', 'مدرس حلقة'] },
    { path: '/analytics', icon: BarChart3, label: 'ذكاء الأعمال', roles: ['محرر إداري أول', 'محرر إداري ثاني', 'مشاهد للمنصة'] },
    { path: '/admin', icon: Settings, label: 'لوحة الإدارة', roles: ['محرر إداري أول'] },
  ];

  const visibleNavItems = navItems.filter(item => item.roles.includes(role));

  return (
    <div className="min-h-screen bg-surface pb-24">
      {/* Top Header (Optional, for branding) */}
      <header className="fixed top-0 w-full bg-surface/80 backdrop-blur-md border-b border-white/5 z-40 px-4 py-3 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary-custom/20 rounded-full flex items-center justify-center border border-primary-custom/30">
            <span className="text-primary-custom font-bold text-xs">ر</span>
          </div>
          <span className="font-bold text-sm tracking-wide">منصة راسخ</span>
        </div>
        <div className="text-[10px] text-gray-400">
          أهلاً، <span className="text-emerald-400 font-bold">{profile?.full_name || 'مستخدم'}</span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="container mx-auto px-4 pt-20">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 w-full bg-container/95 backdrop-blur-3xl border-t border-white/5 px-4 py-3 flex justify-between items-center rounded-t-[2rem] z-50 shadow-[0_-10px_40px_rgba(0,0,0,0.3)]">
        <div className="flex gap-6 md:gap-16 mx-auto">
          {visibleNavItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 transition-colors ${
                  isActive ? 'text-primary-custom' : 'text-gray-400 hover:text-emerald-300'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className={`p-2 rounded-full transition-all duration-300 ${isActive ? 'bg-primary-custom/10' : ''}`}>
                    <item.icon size={22} />
                  </div>
                  <span className="text-[10px] font-bold">{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
        
        <button 
          onClick={handleLogout}
          className="absolute left-6 text-red-400 flex flex-col items-center gap-1 hover:text-red-300 transition-colors"
          title="إغلاق الجلسة"
        >
          <div className="bg-red-500/10 p-2 rounded-full border border-red-500/20 hover:scale-110 transition-transform">
            <LogOut size={18} />
          </div>
        </button>
      </nav>
    </div>
  );
}
