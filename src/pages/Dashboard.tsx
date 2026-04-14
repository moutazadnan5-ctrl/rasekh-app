import React from 'react';
import { useAppStore } from '../store/useAppStore';
import { useAnalytics } from '../hooks/useAnalytics';
import { Link } from 'react-router-dom';
import { 
  CheckSquare, 
  BarChart3, 
  Settings, 
  Users,
  BookOpen,
  ArrowLeft
} from 'lucide-react';
import { motion } from 'motion/react';

export default function Dashboard() {
  const { profile, role, settings } = useAppStore();
  const { stats, loading } = useAnalytics();

  const quickLinks = [
    { path: '/attendance', icon: CheckSquare, label: 'مساحة التفقد', desc: 'تسجيل الحضور والسرد', roles: ['محرر إداري أول', 'محرر إداري ثاني', 'مدرس حلقة'], color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
    { path: '/analytics', icon: BarChart3, label: 'ذكاء الأعمال', desc: 'التقارير والمؤشرات', roles: ['محرر إداري أول', 'محرر إداري ثاني', 'مشاهد للمنصة'], color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
    { path: '/admin', icon: Settings, label: 'لوحة الإدارة', desc: 'إدارة الكوادر والطلاب', roles: ['محرر إداري أول'], color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
  ];

  const visibleLinks = quickLinks.filter(link => link.roles.includes(role));

  return (
    <div className="space-y-8 pb-12">
      <motion.header 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-container p-8 rounded-[2rem] border border-white/5 shadow-2xl relative overflow-hidden"
      >
        <div className="absolute -left-20 -top-20 w-64 h-64 bg-primary-custom/10 rounded-full blur-3xl" />
        <div className="relative z-10">
          <h1 className="text-3xl font-black text-white mb-2">
            مرحباً بك، <span className="text-primary-custom">{profile?.full_name || 'مستخدم'}</span>
          </h1>
          <p className="text-sm text-gray-400">
            أنت مسجل الدخول بصلاحية: <span className="font-bold text-white bg-white/10 px-2 py-0.5 rounded ml-1">{role}</span>
            في {settings?.mosque_name ? `نظام ${settings.mosque_name}` : 'منصة راسخ'}
          </p>
        </div>
      </motion.header>

      {!loading && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          <div className="glass-card p-4 flex items-center gap-4">
            <div className="bg-blue-500/20 p-3 rounded-xl text-blue-400">
              <Users size={24} />
            </div>
            <div>
              <p className="text-[10px] text-gray-400 font-bold">الطلاب</p>
              <p className="text-2xl font-black text-white">{stats.totalStudents}</p>
            </div>
          </div>
          <div className="glass-card p-4 flex items-center gap-4">
            <div className="bg-emerald-500/20 p-3 rounded-xl text-emerald-400">
              <BookOpen size={24} />
            </div>
            <div>
              <p className="text-[10px] text-gray-400 font-bold">الحلقات</p>
              <p className="text-2xl font-black text-white">{stats.totalRings}</p>
            </div>
          </div>
        </motion.div>
      )}

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h2 className="text-sm font-bold text-gray-400 mb-4">الوصول السريع</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {visibleLinks.map((link, idx) => (
            <Link 
              key={idx} 
              to={link.path}
              className="glass-card p-6 group hover:bg-white/5 transition-all flex flex-col justify-between min-h-[160px]"
            >
              <div className={`${link.bg} ${link.color} w-12 h-12 rounded-xl flex items-center justify-center border ${link.border} mb-4 group-hover:scale-110 transition-transform`}>
                <link.icon size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-1 flex items-center justify-between">
                  {link.label}
                  <ArrowLeft size={16} className="opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-gray-400" />
                </h3>
                <p className="text-xs text-gray-500">{link.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
