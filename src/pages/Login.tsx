import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { LogIn, Building2 } from 'lucide-react';
import { motion } from 'motion/react';
import { useAppStore } from '../store/useAppStore';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { settings } = useAppStore();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError('خطأ في البريد الإلكتروني أو كلمة المرور');
      setLoading(false);
    } else {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface p-4 flex-col relative overflow-hidden">
      {/* Background Decoration */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary-custom/5 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 rounded-full blur-[120px]" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-container p-10 rounded-[3rem] shadow-2xl text-center relative overflow-hidden border border-white/5"
      >
        <div className="mb-8 flex flex-col items-center justify-center">
          {settings?.mosque_logo ? (
            <img 
              src={settings.mosque_logo} 
              alt="شعار المسجد" 
              className="w-24 h-24 object-contain mb-3 rounded-full border-2 border-primary-custom/20 p-1 bg-surface"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-surface border-2 border-primary-custom/20 p-4 flex items-center justify-center mb-4 shadow-inner">
              <Building2 className="text-primary-custom" size={40} />
            </div>
          )}
          <h1 className="text-2xl font-black text-emerald-400 tracking-tight">
            {settings?.mosque_name ? `نظام ${settings.mosque_name}` : 'منصة راسخ'}
          </h1>
          <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-widest">
            نظام <span className="font-bold text-white">"راسخ"</span> المؤسسي لإدارة الحلقات
          </p>
        </div>
        
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="relative">
            <input 
              type="email" 
              required
              placeholder="البريد الإلكتروني المؤسسي" 
              className="w-full p-4 text-left rounded-2xl font-mono text-sm input-field border-none bg-surface/50 focus:bg-surface transition-all" 
              dir="ltr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          
          <div className="relative">
            <input 
              type="password" 
              required
              placeholder="كلمة المرور" 
              className="w-full p-4 text-center rounded-2xl text-lg tracking-[0.5em] font-mono input-field border-none bg-surface/50 focus:bg-surface transition-all" 
              dir="ltr"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <motion.p 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-red-400 text-[10px] font-bold"
            >
              {error}
            </motion.p>
          )}
          
          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-primary-custom text-surface font-black py-4 rounded-2xl mt-4 hover:scale-[1.02] active:scale-95 transition-all flex justify-center items-center gap-2 shadow-lg shadow-emerald-500/20 disabled:opacity-50"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-surface/30 border-t-surface rounded-full animate-spin" />
            ) : (
              <>
                <LogIn size={20} /> 
                <span>دخول آمن للمنصة</span>
              </>
            )}
          </button>
        </form>
      </motion.div>

      <div className="mt-8 text-[10px] text-gray-500 font-bold tracking-wider uppercase opacity-50">
        المطوّر: moh.moutazad@gmail.com
      </div>
    </div>
  );
}
