import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAdminData } from '../hooks/useAdminData';
import { TeacherModal, RingModal, StudentModal, ImportModal } from '../components/admin/AdminModals';
import { 
  ShieldCheck, 
  RefreshCw, 
  Archive, 
  Settings as SettingsIcon,
  Megaphone,
  Send,
  Users,
  BookOpen,
  UserPlus,
  Plus,
  FileUp,
  Trash2,
  Edit3
} from 'lucide-react';
import { motion } from 'motion/react';

export default function Admin() {
  const { teachers, rings, students, studentRings, loading, refetch, deleteStudent } = useAdminData();
  const [announcement, setAnnouncement] = useState('');
  
  // Modal states
  const [teacherModal, setTeacherModal] = useState({ isOpen: false, data: null });
  const [ringModal, setRingModal] = useState({ isOpen: false, data: null });
  const [studentModal, setStudentModal] = useState({ isOpen: false, data: null });
  const [importModalOpen, setImportModalOpen] = useState(false);

  useEffect(() => {
    supabase.from('system_settings').select('value').eq('key', 'global_announcement').single()
      .then(({ data }) => setAnnouncement(data?.value?.text || ''));
  }, []);

  const handlePublishAnnouncement = async () => {
    await supabase
      .from('system_settings')
      .upsert({ key: 'global_announcement', value: { text: announcement } });
    alert('تم نشر التعميم بنجاح');
  };

  if (loading) {
    return <div className="flex justify-center items-center min-h-[50vh]"><RefreshCw className="animate-spin text-primary-custom" size={32} /></div>;
  }

  return (
    <div className="space-y-8 pb-12">
      <header className="flex flex-wrap justify-between items-center gap-4">
        <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
          <ShieldCheck className="text-primary-custom" size={32} />
          <span>الإدارة والتحكم</span>
        </h1>
        
        <div className="flex gap-2 flex-wrap">
          <button onClick={refetch} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500 hover:text-white transition-all text-xs font-bold">
            <RefreshCw size={16} /> المزامنة
          </button>
          <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500 hover:text-white transition-all text-xs font-bold">
            <Archive size={16} /> الأرشيف
          </button>
          <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all text-xs font-bold">
            <SettingsIcon size={16} /> الإعدادات
          </button>
        </div>
      </header>

      <div className="space-y-6">
        {/* Global Announcement */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-container p-6 rounded-3xl border border-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.1)]"
        >
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm font-bold text-amber-400 flex items-center gap-2">
              <Megaphone size={18} /> التعميم الإداري العام (يظهر للجميع)
            </h2>
            <button 
              onClick={handlePublishAnnouncement}
              className="bg-amber-600/20 text-amber-400 border border-amber-500/30 px-4 py-2 rounded-xl text-xs font-bold hover:bg-amber-600/40 transition-all flex items-center gap-2 shadow-md"
            >
              <Send size={14} /> نشر التعميم
            </button>
          </div>
          <textarea 
            className="w-full input-field bg-surface border-white/5 h-24 resize-none text-xs text-amber-100"
            placeholder="اكتب التعميم هنا ليظهر كشريط في أعلى واجهة الحضور..."
            value={announcement}
            onChange={(e) => setAnnouncement(e.target.value)}
          />
        </motion.div>

        {/* Management Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Teachers Section */}
          <section className="glass-card p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-sm font-bold text-primary-custom flex items-center gap-2">
                <Users size={18} /> الكوادر التعليمية
              </h2>
              <button 
                onClick={() => setTeacherModal({ isOpen: true, data: null })}
                className="p-2 rounded-lg bg-primary-custom/20 text-primary-custom hover:bg-primary-custom hover:text-surface transition-all"
              >
                <Plus size={16} />
              </button>
            </div>
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-right text-xs">
                <thead className="text-gray-400 border-b border-white/5">
                  <tr>
                    <th className="pb-3">الاسم</th>
                    <th className="pb-3">الدور</th>
                    <th className="pb-3 text-center">إجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {teachers.map(t => (
                    <tr key={t.id} className="hover:bg-white/5">
                      <td className="py-3 font-bold">{t.full_name}</td>
                      <td className="py-3 text-white/40">{t.role}</td>
                      <td className="py-3 text-center">
                        <button 
                          onClick={() => setTeacherModal({ isOpen: true, data: t })}
                          className="p-1.5 text-white/20 hover:text-white"
                        >
                          <Edit3 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Rings Section */}
          <section className="glass-card p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-sm font-bold text-primary-custom flex items-center gap-2">
                <BookOpen size={18} /> الحلقات القرآنية
              </h2>
              <button 
                onClick={() => setRingModal({ isOpen: true, data: null })}
                className="p-2 rounded-lg bg-primary-custom/20 text-primary-custom hover:bg-primary-custom hover:text-surface transition-all"
              >
                <Plus size={16} />
              </button>
            </div>
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-right text-xs">
                <thead className="text-gray-400 border-b border-white/5">
                  <tr>
                    <th className="pb-3">الحلقة</th>
                    <th className="pb-3">المدرس</th>
                    <th className="pb-3 text-center">إجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {rings.map(r => (
                    <tr key={r.id} className="hover:bg-white/5">
                      <td className="py-3 font-bold">{r.ring_name}</td>
                      <td className="py-3 text-white/40">{teachers.find(t => t.id === r.teacher_id)?.full_name || 'غير محدد'}</td>
                      <td className="py-3 text-center">
                        <button 
                          onClick={() => setRingModal({ isOpen: true, data: r })}
                          className="p-1.5 text-white/20 hover:text-white"
                        >
                          <Edit3 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        {/* Students Section */}
        <section className="glass-card p-6">
          <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
            <h2 className="text-sm font-bold text-primary-custom flex items-center gap-2">
              <UserPlus size={18} /> إدارة الطلاب
            </h2>
            <div className="flex gap-2">
              <button 
                onClick={() => setImportModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold hover:bg-emerald-600/40 transition-all"
              >
                <FileUp size={16} /> استيراد Excel
              </button>
              <button 
                onClick={() => setStudentModal({ isOpen: true, data: null })}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-custom text-surface text-xs font-black hover:scale-105 transition-all"
              >
                <Plus size={16} /> تسجيل طالب
              </button>
            </div>
          </div>
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-right text-xs">
              <thead className="text-gray-400 border-b border-white/5">
                <tr>
                  <th className="pb-3">اسم الطالب</th>
                  <th className="pb-3">الحلقة</th>
                  <th className="pb-3">الهاتف</th>
                  <th className="pb-3">تنبيه إداري</th>
                  <th className="pb-3 text-center">إجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {students.map(s => {
                  const sRings = studentRings.filter(sr => sr.student_id === s.id).map(sr => sr.ring_id);
                  const ringNames = rings.filter(r => sRings.includes(r.id)).map(r => r.ring_name).join('، ') || 'بدون حلقة';
                  
                  return (
                    <tr key={s.id} className="hover:bg-white/5">
                      <td className="py-3 font-bold">{s.full_name}</td>
                      <td className="py-3 text-white/40">{ringNames}</td>
                      <td className="py-3 font-mono text-white/40">{s.phone_number || '-'}</td>
                      <td className="py-3">
                        {s.admin_alert ? (
                          <span className="text-[10px] text-red-400 bg-red-400/10 px-2 py-0.5 rounded border border-red-400/20">نشط</span>
                        ) : '-'}
                      </td>
                      <td className="py-3 text-center flex justify-center gap-1">
                        <button 
                          onClick={() => setStudentModal({ isOpen: true, data: s })}
                          className="p-1.5 text-white/20 hover:text-white"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button 
                          onClick={() => deleteStudent(s.id)}
                          className="p-1.5 text-white/20 hover:text-red-400"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* Modals */}
      <TeacherModal 
        isOpen={teacherModal.isOpen} 
        onClose={() => setTeacherModal({ isOpen: false, data: null })} 
        teacher={teacherModal.data} 
        rings={rings} 
        onSave={refetch} 
      />
      <RingModal 
        isOpen={ringModal.isOpen} 
        onClose={() => setRingModal({ isOpen: false, data: null })} 
        ring={ringModal.data} 
        teachers={teachers} 
        onSave={refetch} 
      />
      <StudentModal 
        isOpen={studentModal.isOpen} 
        onClose={() => setStudentModal({ isOpen: false, data: null })} 
        student={studentModal.data} 
        rings={rings} 
        onSave={refetch} 
      />
      <ImportModal 
        isOpen={importModalOpen} 
        onClose={() => setImportModalOpen(false)} 
        rings={rings} 
        onSave={refetch} 
      />
    </div>
  );
}
