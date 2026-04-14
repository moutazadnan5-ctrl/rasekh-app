import React, { useState, useEffect } from 'react';
import { useAttendance } from '../hooks/useAttendance';
import { useAppStore } from '../store/useAppStore';
import { SardModal, ExamModal } from '../components/attendance/AttendanceModals';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { 
  Cloud, 
  CloudOff, 
  RefreshCw, 
  BookOpen, 
  Flame, 
  Badge, 
  Lock,
  Megaphone,
  CheckCircle2
} from 'lucide-react';

export default function Attendance() {
  const { role, settings } = useAppStore();
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [activeTab, setActiveTab] = useState<'hifz' | 'activity' | 'teachers'>('hifz');
  const [selectedRingHifz, setSelectedRingHifz] = useState<string>('all');
  const [selectedRingActivity, setSelectedRingActivity] = useState<string>('all');
  
  const { 
    rings, students, studentRings, teachers, records, teacherRecords, 
    loading, syncStatus, updateRecord 
  } = useAttendance(date);

  // Modals state
  const [sardModal, setSardModal] = useState({ isOpen: false, studentId: null as string | null, start: null as number | null, end: null as number | null, n: 0, r: 0 });
  const [examModal, setExamModal] = useState({ isOpen: false, studentId: null as string | null, parts: '' });

  const hifzRings = rings.filter(r => r.ring_type !== 'نشاط');
  const activityRings = rings.filter(r => r.ring_type === 'نشاط');

  // Time Fence Logic
  const isTimeFenceClosed = () => {
    if (['محرر إداري أول', 'محرر إداري ثاني'].includes(role)) return false;
    return settings?.time_fence_mode === 'force_closed';
  };

  const dayName = format(new Date(date), 'EEEE', { locale: ar });
  const officialDays = JSON.parse(settings?.attendance_days || '[]');
  const isOfficialDay = officialDays.includes(dayName);

  const getFilteredStudents = (ringId: string, isHifz: boolean) => {
    if (ringId === 'all') {
      const relevantRings = isHifz ? hifzRings : activityRings;
      const relevantRingIds = relevantRings.map(r => r.id);
      const relevantStudentIds = studentRings.filter(sr => relevantRingIds.includes(sr.ring_id)).map(sr => sr.student_id);
      return students.filter(s => relevantStudentIds.includes(s.id));
    } else {
      const studentIdsInRing = studentRings.filter(sr => sr.ring_id === ringId).map(sr => sr.student_id);
      return students.filter(s => studentIdsInRing.includes(s.id));
    }
  };

  const handleSardSave = (start: number | null, end: number | null, n: number, r: number, matana: number) => {
    if (!sardModal.studentId) return;
    updateRecord('student', sardModal.studentId, 'sard_start_page', start, {
      sard_end_page: end,
      sard_naqarat: n,
      sard_raddat: r,
      sard_matana: matana
    });
  };

  const handleExamSave = (parts: string) => {
    if (!examModal.studentId) return;
    updateRecord('student', examModal.studentId, 'tested_parts', parts);
  };

  const getAlertHtml = (studentId: string, adminAlert: string) => {
    if (adminAlert) {
      return <span className="text-[10px] text-red-400 font-bold bg-red-500/10 px-2 py-1 rounded border border-red-500/20">🔴 {adminAlert}</span>;
    }
    // Simple alert logic for now
    const rec = records.find(r => r.student_id === studentId);
    if (rec?.last_page_memorized > 0 && (!rec?.sard_end_page || rec.last_page_memorized - rec.sard_end_page >= 10)) {
      return <span className="text-[10px] text-amber-400 font-bold bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20">🔄 سرد للـ {rec.last_page_memorized}</span>;
    }
    return <span className="text-gray-500">-</span>;
  };

  if (isTimeFenceClosed()) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <Lock className="text-red-500 mb-4" size={64} />
        <h2 className="text-2xl font-bold text-white mb-2">بوابة الإدخال مغلقة</h2>
        <p className="text-gray-400 max-w-md leading-relaxed">
          انتهى وقت الدوام المخصص للإدخال بتوقيت دمشق.<br/>
          <span className="text-[10px] text-red-400 mt-2 block">(أي محاولة تعديل سيتم رفضها برمجياً من قاعدة البيانات)</span>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {settings?.global_announcement && (
        <div className="bg-gradient-to-r from-amber-600/20 to-orange-600/20 border border-amber-500/30 p-3 rounded-2xl flex items-center gap-3 shadow-lg">
          <div className="bg-amber-500/20 p-2 rounded-full border border-amber-500/40 flex-shrink-0">
            <Megaphone className="text-amber-400 animate-pulse" size={20} />
          </div>
          <div>
            <h4 className="text-[10px] text-amber-500/80 font-black mb-0.5">تعميم إداري</h4>
            <p className="text-amber-100 text-xs font-bold leading-relaxed">{settings.global_announcement}</p>
          </div>
        </div>
      )}

      <header className="flex flex-col md:flex-row justify-between items-center gap-4 bg-container p-4 rounded-2xl border border-white/5 shadow-xl">
        <div className="text-center md:text-right">
          <h1 className="text-xl font-extrabold text-white">مساحة التفقد</h1>
          <div className="text-[10px] text-gray-500 mt-1 flex justify-center md:justify-start items-center gap-1">
            {syncStatus === 'syncing' ? (
              <span className="text-amber-400 flex items-center gap-1"><RefreshCw size={12} className="animate-spin" /> جاري الحفظ...</span>
            ) : syncStatus === 'error' ? (
              <span className="text-red-400 flex items-center gap-1"><CloudOff size={12} /> خطأ في الاتصال</span>
            ) : (
              <span className="text-primary-custom flex items-center gap-1"><CheckCircle2 size={12} /> متصل</span>
            )}
          </div>
        </div>

        <div className="flex gap-1 bg-surface p-1 rounded-xl border border-white/5 overflow-x-auto custom-scrollbar max-w-full">
          <button 
            onClick={() => setActiveTab('hifz')}
            className={`px-4 py-2 rounded-lg font-bold text-xs transition-all flex items-center gap-1 whitespace-nowrap ${activeTab === 'hifz' ? 'bg-primary-custom text-surface shadow-md' : 'text-gray-400 hover:text-white'}`}
          >
            <BookOpen size={14} /> حلقات الحفظ
          </button>
          <button 
            onClick={() => setActiveTab('activity')}
            className={`px-4 py-2 rounded-lg font-bold text-xs transition-all flex items-center gap-1 whitespace-nowrap ${activeTab === 'activity' ? 'bg-primary-custom text-surface shadow-md' : 'text-gray-400 hover:text-white'}`}
          >
            <Flame size={14} /> حلقات النشاط
          </button>
          {['محرر إداري أول', 'محرر إداري ثاني'].includes(role) && (
            <button 
              onClick={() => setActiveTab('teachers')}
              className={`px-4 py-2 rounded-lg font-bold text-xs transition-all flex items-center gap-1 whitespace-nowrap ${activeTab === 'teachers' ? 'bg-primary-custom text-surface shadow-md' : 'text-gray-400 hover:text-white'}`}
            >
              <Badge size={14} /> الكوادر
            </button>
          )}
        </div>

        <div className="flex gap-2">
          <div className="bg-surface flex items-center px-2 rounded-xl relative border border-white/5">
            <span className="text-[10px] font-bold ml-1 whitespace-nowrap">يوم {dayName}</span>
            <span className={`absolute -top-2 -right-2 text-[8px] px-2 py-0.5 rounded-full text-white shadow-md ${isOfficialDay ? 'bg-emerald-500' : 'bg-orange-500'}`}>
              {isOfficialDay ? 'دوام رسمي' : 'عطلة'}
            </span>
            <input 
              type="date" 
              className="p-2 text-xs bg-transparent border-none w-28 md:w-32 font-mono text-center cursor-pointer focus:ring-0 text-white"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          
          {activeTab === 'hifz' && (
            <select 
              className="input-field p-2 text-xs w-32 md:w-36 rounded-xl bg-surface border border-white/5"
              value={selectedRingHifz}
              onChange={(e) => setSelectedRingHifz(e.target.value)}
            >
              <option value="all">كل الطلاب</option>
              {hifzRings.map(r => <option key={r.id} value={r.id}>{r.ring_name}</option>)}
            </select>
          )}
          
          {activeTab === 'activity' && (
            <select 
              className="input-field p-2 text-xs w-32 md:w-36 rounded-xl bg-surface border border-white/5"
              value={selectedRingActivity}
              onChange={(e) => setSelectedRingActivity(e.target.value)}
            >
              <option value="all">كل الطلاب</option>
              {activityRings.map(r => <option key={r.id} value={r.id}>{r.ring_name}</option>)}
            </select>
          )}
        </div>
      </header>

      {/* Tables Area */}
      <div className="bg-container rounded-[1.5rem] overflow-x-auto border border-white/5 shadow-xl pb-2">
        {loading ? (
          <div className="p-10 text-center flex flex-col items-center">
            <RefreshCw className="animate-spin text-primary-custom mb-2" size={32} />
            <span className="text-xs text-gray-400">جاري جلب البيانات الذكية...</span>
          </div>
        ) : (
          <>
            {/* Hifz Table */}
            {activeTab === 'hifz' && (
              <table className="w-full text-right min-w-[800px]">
                <thead className="bg-surface/80 text-gray-400 text-[10px] border-b border-white/5 uppercase">
                  <tr>
                    <th className="p-3 w-1/5">الطالب</th>
                    <th className="p-3 text-center w-32 text-amber-400">واجبات وتنبيهات</th>
                    <th className="p-3 text-center w-16">ح/غ</th>
                    <th className="p-3 text-center w-12">ص</th>
                    <th className="p-3 text-center w-12">آخر</th>
                    <th className="p-3 text-center w-24">سرد</th>
                    <th className="p-3 text-center w-16">اختبار</th>
                    <th className="p-3 text-center w-16">النتيجة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {getFilteredStudents(selectedRingHifz, true).map(s => {
                    const rec = records.find(r => r.student_id === s.id) || {};
                    const sardText = rec.sard_start_page ? `${rec.sard_start_page} إلى ${rec.sard_end_page} (${rec.sard_matana}%)` : '-';
                    
                    return (
                      <tr key={s.id} className="hover:bg-white/5 transition-colors">
                        <td className="p-3 font-bold text-white text-[11px]">{s.full_name}</td>
                        <td className="p-3 text-center">{getAlertHtml(s.id, s.admin_alert)}</td>
                        <td className="p-3 text-center">
                          <select 
                            className={`w-16 p-1 text-[10px] rounded bg-surface border border-white/10 focus:ring-0 ${rec.attendance_status === 'حاضر' ? 'text-emerald-400' : rec.attendance_status === 'غائب' ? 'text-red-400' : ''}`}
                            value={rec.attendance_status || ''}
                            onChange={(e) => updateRecord('student', s.id, 'attendance_status', e.target.value)}
                          >
                            <option value="">-</option>
                            <option value="حاضر">حاضر</option>
                            <option value="متأخر">متأخر</option>
                            <option value="غائب">غائب</option>
                          </select>
                        </td>
                        <td className="p-3">
                          <input 
                            type="number" 
                            className="w-12 p-1 text-[10px] text-center rounded bg-surface border border-white/10 focus:ring-0 text-white"
                            value={rec.pages_memorized || ''}
                            onChange={(e) => updateRecord('student', s.id, 'pages_memorized', e.target.value)}
                          />
                        </td>
                        <td className="p-3">
                          <input 
                            type="number" 
                            className="w-12 p-1 text-[10px] text-center rounded bg-surface border border-white/10 text-emerald-400 font-bold focus:ring-0"
                            value={rec.last_page_memorized || ''}
                            onChange={(e) => updateRecord('student', s.id, 'last_page_memorized', e.target.value)}
                          />
                        </td>
                        <td 
                          className="p-3 text-center text-[9px] cursor-pointer hover:text-emerald-400 transition-colors"
                          onClick={() => setSardModal({ isOpen: true, studentId: s.id, start: rec.sard_start_page, end: rec.sard_end_page, n: rec.sard_naqarat, r: rec.sard_raddat })}
                        >
                          {sardText}
                        </td>
                        <td className="p-3 text-center">
                          <button 
                            className="px-2 py-1 rounded bg-surface border border-white/10 text-[9px] hover:bg-primary-custom/20 transition-colors"
                            onClick={() => setExamModal({ isOpen: true, studentId: s.id, parts: rec.tested_parts || '' })}
                          >
                            {rec.tested_parts || 'اختبار'}
                          </button>
                        </td>
                        <td className="p-3 text-center">
                          <select 
                            className="w-16 p-1 text-[10px] rounded bg-surface border border-white/10 focus:ring-0"
                            value={rec.exam_result || ''}
                            onChange={(e) => updateRecord('student', s.id, 'exam_result', e.target.value)}
                          >
                            <option value="">-</option>
                            <option value="ناجح">ناجح</option>
                            <option value="راسب">راسب</option>
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

            {/* Activity Table */}
            {activeTab === 'activity' && (
              <table className="w-full text-right min-w-[500px]">
                <thead className="bg-surface/80 text-gray-400 text-[10px] border-b border-white/5 uppercase">
                  <tr>
                    <th className="p-3 w-1/3">الطالب</th>
                    <th className="p-3 text-center w-24">الحضور</th>
                    <th className="p-3 text-center w-24 text-emerald-400">نقاط النشاط</th>
                    <th className="p-3 text-center w-24 text-purple-400">النتيجة</th>
                    <th className="p-3 w-1/4">ملاحظات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {getFilteredStudents(selectedRingActivity, false).map(s => {
                    const rec = records.find(r => r.student_id === s.id) || {};
                    const ring = activityRings.find(r => r.id === selectedRingActivity) || activityRings[0]; // Simplified for now
                    
                    const handleActivityUpdate = (field: string, val: string) => {
                      const status = field === 'attendance_status' ? val : rec.attendance_status;
                      const points = field === 'activity_points' ? parseFloat(val || '0') : parseFloat(rec.activity_points || '0');
                      
                      const pVal = parseFloat(ring?.point_value || '0');
                      const attPts = parseFloat(ring?.attendance_points || '0');
                      const isPresent = (status === 'حاضر' || status === 'متأخر');
                      const total = (points + (isPresent ? attPts : 0)) * pVal;

                      updateRecord('student', s.id, field, val, { total_result: total });
                    };

                    return (
                      <tr key={s.id} className="hover:bg-white/5 transition-colors">
                        <td className="p-3 font-bold text-white text-[11px]">{s.full_name}</td>
                        <td className="p-3 text-center">
                          <select 
                            className="w-20 p-1.5 text-[10px] rounded bg-surface border border-white/10 focus:ring-0"
                            value={rec.attendance_status || ''}
                            onChange={(e) => handleActivityUpdate('attendance_status', e.target.value)}
                          >
                            <option value="">-</option>
                            <option value="حاضر">حاضر</option>
                            <option value="متأخر">متأخر</option>
                            <option value="غائب">غائب</option>
                          </select>
                        </td>
                        <td className="p-3 text-center">
                          <input 
                            type="number" 
                            className="w-16 p-1.5 text-[11px] text-center rounded bg-primary-custom/10 border border-primary-custom/30 text-emerald-300 font-bold focus:ring-0"
                            value={rec.activity_points || ''}
                            onChange={(e) => handleActivityUpdate('activity_points', e.target.value)}
                          />
                        </td>
                        <td className="p-3 text-center font-black text-purple-400 text-sm">{rec.total_result || 0}</td>
                        <td className="p-3">
                          <input 
                            type="text" 
                            className="w-full p-1.5 text-[10px] rounded bg-surface border border-white/10 focus:ring-0 text-white"
                            placeholder="ملاحظات..."
                            value={rec.notes || ''}
                            onChange={(e) => updateRecord('student', s.id, 'notes', e.target.value)}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

            {/* Teachers Table */}
            {activeTab === 'teachers' && (
              <table className="w-full text-right min-w-[600px]">
                <thead className="bg-surface/80 text-gray-400 text-[10px] border-b border-white/5 uppercase">
                  <tr>
                    <th className="p-4 w-1/3">الكادر</th>
                    <th className="p-3 text-center w-24">الحضور</th>
                    <th className="p-3 text-center w-20 text-blue-400">الساعات</th>
                    <th className="p-4">ملاحظات والتزام</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {teachers.map(t => {
                    const rec = teacherRecords.find(r => r.teacher_id === t.id) || {};
                    return (
                      <tr key={t.id} className="hover:bg-white/5 transition-colors">
                        <td className="p-4 font-bold text-white text-[11px]">
                          {t.full_name} <span className="text-[9px] text-gray-500 block">{t.role}</span>
                        </td>
                        <td className="p-3 text-center">
                          <select 
                            className="w-20 p-2 text-[10px] rounded bg-surface border border-white/10 focus:ring-0"
                            value={rec.attendance_status || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              const extra = (val === 'حاضر' || val === 'متأخر') && !rec.hours ? { hours: 1 } : {};
                              updateRecord('teacher', t.id, 'attendance_status', val, extra);
                            }}
                          >
                            <option value="">-</option>
                            <option value="حاضر">حاضر</option>
                            <option value="متأخر">متأخر</option>
                            <option value="غائب">غائب</option>
                            <option value="مجاز">مجاز</option>
                          </select>
                        </td>
                        <td className="p-3 text-center">
                          <input 
                            type="number" step="0.5"
                            className="w-16 p-2 text-[11px] text-center rounded bg-blue-500/10 border border-blue-500/30 text-blue-300 font-bold focus:ring-0"
                            value={rec.hours || ''}
                            onChange={(e) => updateRecord('teacher', t.id, 'hours', e.target.value)}
                          />
                        </td>
                        <td className="p-4">
                          <input 
                            type="text" 
                            className="w-full p-2 text-[10px] rounded bg-surface border border-white/10 focus:ring-0 text-white"
                            placeholder="تقييم الالتزام..."
                            value={rec.notes || ''}
                            onChange={(e) => updateRecord('teacher', t.id, 'notes', e.target.value)}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </>
        )}
      </div>

      <SardModal 
        isOpen={sardModal.isOpen}
        onClose={() => setSardModal({ ...sardModal, isOpen: false })}
        studentId={sardModal.studentId}
        initialStart={sardModal.start}
        initialEnd={sardModal.end}
        initialN={sardModal.n}
        initialR={sardModal.r}
        onSave={handleSardSave}
      />

      <ExamModal 
        isOpen={examModal.isOpen}
        onClose={() => setExamModal({ ...examModal, isOpen: false })}
        studentId={examModal.studentId}
        initialParts={examModal.parts}
        onSave={handleExamSave}
      />
    </div>
  );
}
