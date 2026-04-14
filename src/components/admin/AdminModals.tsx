import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { supabase } from '../../lib/supabase';
import * as XLSX from 'xlsx';

// --- Teacher Modal ---
export function TeacherModal({ isOpen, onClose, teacher, rings, onSave }: any) {
  const [formData, setFormData] = useState({
    auth_user_id: '',
    full_name: '',
    phone_number: '',
    role: 'مدرس حلقة',
    marital_status: 'أعزب',
  });
  const [selectedRings, setSelectedRings] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (teacher) {
      setFormData({
        auth_user_id: teacher.auth_user_id || '',
        full_name: teacher.full_name || '',
        phone_number: teacher.phone_number || '',
        role: teacher.role || 'مدرس حلقة',
        marital_status: teacher.marital_status || 'أعزب',
      });
      // Fetch assigned rings
      supabase.from('teacher_rings').select('ring_id').eq('teacher_id', teacher.id)
        .then(({ data }) => setSelectedRings(data?.map(r => r.ring_id) || []));
    } else {
      setFormData({ auth_user_id: '', full_name: '', phone_number: '', role: 'مدرس حلقة', marital_status: 'أعزب' });
      setSelectedRings([]);
    }
  }, [teacher, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { ...formData };
      if (!payload.auth_user_id) delete payload.auth_user_id;

      let recordId = teacher?.id;
      if (teacher?.id) {
        await supabase.from('teachers').update(payload).eq('id', teacher.id);
      } else {
        const { data } = await supabase.from('teachers').insert(payload).select().single();
        recordId = data?.id;
      }

      if (recordId) {
        await supabase.from('teacher_rings').delete().eq('teacher_id', recordId);
        if (selectedRings.length > 0) {
          await supabase.from('teacher_rings').insert(
            selectedRings.map(rId => ({ teacher_id: recordId, ring_id: rId }))
          );
        }
      }
      onSave();
      onClose();
    } catch (err) {
      console.error(err);
      alert('خطأ في الحفظ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={teacher ? 'تعديل ذاتية الكادر' : 'إضافة كادر جديد'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-blue-500/10 p-3 rounded-xl border border-blue-500/20">
          <label className="text-[10px] text-blue-300 mb-1 block">معرف الدخول (Auth UID)</label>
          <input 
            type="text" 
            className="w-full bg-transparent border-none text-center font-mono text-xs text-blue-300 focus:ring-0" 
            placeholder="UID من Supabase Auth"
            value={formData.auth_user_id}
            onChange={e => setFormData({...formData, auth_user_id: e.target.value})}
          />
        </div>
        <input 
          type="text" 
          required 
          className="input-field p-3 text-sm" 
          placeholder="الاسم الثلاثي"
          value={formData.full_name}
          onChange={e => setFormData({...formData, full_name: e.target.value})}
        />
        <input 
          type="text" 
          className="input-field p-3 text-sm font-mono" 
          placeholder="رقم الواتساب" dir="ltr"
          value={formData.phone_number}
          onChange={e => setFormData({...formData, phone_number: e.target.value})}
        />
        <select 
          className="input-field p-3 text-sm"
          value={formData.role}
          onChange={e => setFormData({...formData, role: e.target.value})}
        >
          <option value="مدرس حلقة">مدرس حلقة</option>
          <option value="محرر إداري ثاني">مشرف تنفيذي</option>
          <option value="محرر إداري أول">محرر إداري أول</option>
          <option value="مشاهد للمنصة">مشاهد رقابي</option>
        </select>
        
        <div className="border-t border-white/5 pt-4 mt-2">
          <label className="text-[10px] text-emerald-400 font-bold block mb-2">تخصيص الحلقات</label>
          <div className="flex flex-wrap gap-2 bg-surface p-3 rounded-xl border border-white/5 max-h-32 overflow-y-auto custom-scrollbar">
            {rings.map((r: any) => (
              <label key={r.id} className="flex items-center gap-2 bg-container px-3 py-2 rounded-lg text-[10px] cursor-pointer hover:bg-white/5 transition-colors border border-white/5">
                <input 
                  type="checkbox" 
                  className="rounded text-primary-custom focus:ring-primary-custom bg-surface border-white/10"
                  checked={selectedRings.includes(r.id)}
                  onChange={(e) => {
                    if (e.target.checked) setSelectedRings([...selectedRings, r.id]);
                    else setSelectedRings(selectedRings.filter(id => id !== r.id));
                  }}
                /> 
                {r.ring_name}
              </label>
            ))}
          </div>
        </div>

        <button type="submit" disabled={loading} className="btn-primary w-full py-4 mt-4">
          {loading ? 'جاري الحفظ...' : 'تأكيد وحفظ'}
        </button>
      </form>
    </Modal>
  );
}

// --- Ring Modal ---
export function RingModal({ isOpen, onClose, ring, teachers, onSave }: any) {
  const [formData, setFormData] = useState({
    ring_name: '',
    teacher_id: '',
    ring_type: 'حفظ',
    point_value: '',
    attendance_points: '',
    start_date: '',
    end_date: ''
  });
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const daysList = ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];

  useEffect(() => {
    if (ring) {
      setFormData({
        ring_name: ring.ring_name || '',
        teacher_id: ring.teacher_id || '',
        ring_type: ring.ring_type || 'حفظ',
        point_value: ring.point_value || '',
        attendance_points: ring.attendance_points || '',
        start_date: ring.start_date || '',
        end_date: ring.end_date || ''
      });
      try {
        setSelectedDays(JSON.parse(ring.attendance_days || '[]'));
      } catch { setSelectedDays([]); }
    } else {
      setFormData({ ring_name: '', teacher_id: '', ring_type: 'حفظ', point_value: '', attendance_points: '', start_date: '', end_date: '' });
      setSelectedDays([]);
    }
  }, [ring, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { 
        ...formData, 
        attendance_days: JSON.stringify(selectedDays),
        point_value: formData.point_value ? Number(formData.point_value) : null,
        attendance_points: formData.attendance_points ? Number(formData.attendance_points) : null,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null
      };

      if (ring?.id) {
        await supabase.from('rings').update(payload).eq('id', ring.id);
      } else {
        await supabase.from('rings').insert(payload);
      }
      onSave();
      onClose();
    } catch (err) {
      console.error(err);
      alert('خطأ في الحفظ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={ring ? 'تعديل الحلقة' : 'إنشاء حلقة جديدة'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input 
          type="text" required className="input-field p-3 text-sm" placeholder="اسم الحلقة"
          value={formData.ring_name} onChange={e => setFormData({...formData, ring_name: e.target.value})}
        />
        <select required className="input-field p-3 text-sm" value={formData.teacher_id} onChange={e => setFormData({...formData, teacher_id: e.target.value})}>
          <option value="">اختر المدرس...</option>
          {teachers.map((t: any) => <option key={t.id} value={t.id}>{t.full_name}</option>)}
        </select>
        <select required className="input-field p-3 text-sm" value={formData.ring_type} onChange={e => setFormData({...formData, ring_type: e.target.value})}>
          <option value="حفظ">حلقة حفظ (تسميع ومراجعة)</option>
          <option value="نشاط">حلقة نشاط (نقاط وتفاعل)</option>
        </select>

        <div className="bg-surface p-4 rounded-xl border border-white/5 mt-2">
          <label className="text-[10px] text-emerald-400 font-bold block mb-2">أيام الدوام الرسمية لهذه الحلقة</label>
          <div className="flex flex-wrap gap-2">
            {daysList.map(day => (
              <label key={day} className="flex items-center gap-1 text-[10px] bg-container p-2 rounded-lg cursor-pointer border border-white/5 hover:bg-white/5">
                <input 
                  type="checkbox" className="rounded text-primary-custom focus:ring-primary-custom bg-surface border-white/10"
                  checked={selectedDays.includes(day)}
                  onChange={e => {
                    if (e.target.checked) setSelectedDays([...selectedDays, day]);
                    else setSelectedDays(selectedDays.filter(d => d !== day));
                  }}
                /> {day}
              </label>
            ))}
          </div>
        </div>

        {formData.ring_type === 'نشاط' && (
          <div className="space-y-4 bg-surface p-4 rounded-xl border border-white/5 mt-2 animate-in fade-in">
            <label className="text-[10px] text-emerald-400 font-bold block">إعدادات النشاط والصلاحية</label>
            <div className="flex gap-2">
              <input type="number" placeholder="قيمة النقطة" className="input-field p-3 w-1/2 text-xs" min="0" value={formData.point_value} onChange={e => setFormData({...formData, point_value: e.target.value})} />
              <input type="number" placeholder="نقاط الحضور" className="input-field p-3 w-1/2 text-xs" min="0" value={formData.attendance_points} onChange={e => setFormData({...formData, attendance_points: e.target.value})} />
            </div>
            <div className="flex gap-2">
              <div className="w-1/2">
                <label className="text-[10px] text-gray-400">تاريخ البدء</label>
                <input type="date" className="input-field p-3 mt-1 text-xs font-mono w-full" value={formData.start_date} onChange={e => setFormData({...formData, start_date: e.target.value})} />
              </div>
              <div className="w-1/2">
                <label className="text-[10px] text-gray-400">تاريخ الانتهاء</label>
                <input type="date" className="input-field p-3 mt-1 text-xs font-mono w-full" value={formData.end_date} onChange={e => setFormData({...formData, end_date: e.target.value})} />
              </div>
            </div>
          </div>
        )}

        <button type="submit" disabled={loading} className="btn-primary w-full py-4 mt-4">
          {loading ? 'جاري الحفظ...' : 'حفظ الحلقة'}
        </button>
      </form>
    </Modal>
  );
}

// --- Student Modal ---
export function StudentModal({ isOpen, onClose, student, rings, onSave }: any) {
  const [formData, setFormData] = useState({
    full_name: '',
    father_name: '',
    phone_number: '',
    admin_alert: ''
  });
  const [selectedRings, setSelectedRings] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (student) {
      setFormData({
        full_name: student.full_name || '',
        father_name: student.father_name || '',
        phone_number: student.phone_number || '',
        admin_alert: student.admin_alert || ''
      });
      supabase.from('student_rings').select('ring_id').eq('student_id', student.id)
        .then(({ data }) => setSelectedRings(data?.map(r => r.ring_id) || []));
    } else {
      setFormData({ full_name: '', father_name: '', phone_number: '', admin_alert: '' });
      setSelectedRings([]);
    }
  }, [student, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { ...formData };
      let recordId = student?.id;

      if (student?.id) {
        await supabase.from('students').update(payload).eq('id', student.id);
      } else {
        const { data } = await supabase.from('students').insert(payload).select().single();
        recordId = data?.id;
      }

      if (recordId) {
        await supabase.from('student_rings').delete().eq('student_id', recordId);
        if (selectedRings.length > 0) {
          await supabase.from('student_rings').insert(
            selectedRings.map(rId => ({ student_id: recordId, ring_id: rId }))
          );
        }
      }
      onSave();
      onClose();
    } catch (err) {
      console.error(err);
      alert('خطأ في الحفظ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={student ? 'ذاتية الطالب' : 'تسجيل طالب'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input type="text" required className="input-field p-3 text-sm" placeholder="الاسم الرباعي" value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} />
        <input type="text" className="input-field p-3 text-sm" placeholder="اسم الأب" value={formData.father_name} onChange={e => setFormData({...formData, father_name: e.target.value})} />
        <input type="text" className="input-field p-3 text-sm font-mono" placeholder="هاتف ولي الأمر" dir="ltr" value={formData.phone_number} onChange={e => setFormData({...formData, phone_number: e.target.value})} />
        
        <div className="bg-red-500/10 p-3 rounded-xl border border-red-500/20 mt-2">
          <label className="text-[10px] text-red-400 font-bold block mb-1">تنبيه إداري ملزم (يظهر للأستاذ فوراً)</label>
          <input type="text" className="w-full bg-transparent border-none text-xs text-red-300 placeholder-red-500/50 focus:ring-0 p-2" placeholder="مثال: مطلوب سرد من 20 إلى 50 غداً" value={formData.admin_alert} onChange={e => setFormData({...formData, admin_alert: e.target.value})} />
        </div>

        <div className="border-t border-white/5 pt-4 mt-2">
          <label className="text-[10px] text-emerald-400 font-bold block mb-2">الحلقات المسجل بها</label>
          <div className="flex flex-wrap gap-2 bg-surface p-3 rounded-xl border border-white/5 max-h-32 overflow-y-auto custom-scrollbar">
            {rings.map((r: any) => (
              <label key={r.id} className="flex items-center gap-2 bg-container px-3 py-2 rounded-lg text-[10px] cursor-pointer hover:bg-white/5 transition-colors border border-white/5">
                <input 
                  type="checkbox" className="rounded text-primary-custom focus:ring-primary-custom bg-surface border-white/10"
                  checked={selectedRings.includes(r.id)}
                  onChange={(e) => {
                    if (e.target.checked) setSelectedRings([...selectedRings, r.id]);
                    else setSelectedRings(selectedRings.filter(id => id !== r.id));
                  }}
                /> {r.ring_name}
              </label>
            ))}
          </div>
        </div>

        <button type="submit" disabled={loading} className="btn-primary w-full py-4 mt-4">
          {loading ? 'جاري الحفظ...' : 'حفظ الطالب'}
        </button>
      </form>
    </Modal>
  );
}

// --- Import Modal ---
export function ImportModal({ isOpen, onClose, rings, onSave }: any) {
  const [fileData, setFileData] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [colName, setColName] = useState('');
  const [colPhone, setColPhone] = useState('');
  const [targetRing, setTargetRing] = useState('');
  const [loading, setLoading] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws, { defval: "" });
      
      if (data.length > 0) {
        setFileData(data);
        setHeaders(Object.keys(data[0] as object));
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleImport = async () => {
    if (!colName) return alert('يجب تحديد عمود اسم الطالب');
    setLoading(true);

    try {
      const studentsToInsert = fileData.map(row => ({
        full_name: String(row[colName]).trim(),
        phone_number: colPhone && row[colPhone] ? String(row[colPhone]).replace(/\s+/g, '') : null
      })).filter(s => s.full_name !== "");

      if (studentsToInsert.length === 0) throw new Error("لم يتم العثور على أسماء صالحة");

      const { data: insertedStudents, error } = await supabase.from('students').insert(studentsToInsert).select('id');
      if (error) throw error;

      if (targetRing && insertedStudents && insertedStudents.length > 0) {
        const junctionData = insertedStudents.map(s => ({ student_id: s.id, ring_id: targetRing }));
        await supabase.from('student_rings').insert(junctionData);
      }

      alert(`تم استيراد ${insertedStudents?.length} طالب بنجاح`);
      onSave();
      onClose();
    } catch (err: any) {
      console.error(err);
      alert('خطأ: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="استيراد الطلاب جماعياً">
      <div className="space-y-4">
        <div className="bg-surface p-4 rounded-xl border border-white/5">
          <label className="text-[10px] text-gray-400 block mb-2">1. اختر ملف Excel أو CSV</label>
          <input 
            type="file" accept=".csv, .xlsx, .xls" 
            onChange={handleFileUpload}
            className="w-full text-xs text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:bg-primary-custom/20 file:text-primary-custom file:border-0 cursor-pointer"
          />
        </div>

        {headers.length > 0 && (
          <div className="bg-primary-custom/10 p-4 rounded-xl border border-primary-custom/20 animate-in fade-in">
            <label className="text-[10px] text-primary-custom block mb-2">2. مطابقة الأعمدة وتحديد الحلقة</label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-gray-400">عمود اسم الطالب</label>
                <select className="input-field p-2 mt-1 text-xs" value={colName} onChange={e => setColName(e.target.value)}>
                  <option value="">-- تجاهل --</option>
                  {headers.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-gray-400">عمود رقم الهاتف</label>
                <select className="input-field p-2 mt-1 text-xs" value={colPhone} onChange={e => setColPhone(e.target.value)}>
                  <option value="">-- تجاهل --</option>
                  {headers.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-[10px] text-gray-400">إضافة الطلاب إلى حلقة (اختياري)</label>
                <select className="input-field p-2 mt-1 text-xs" value={targetRing} onChange={e => setTargetRing(e.target.value)}>
                  <option value="">بدون حلقة (في المركز فقط)</option>
                  {rings.map((r: any) => <option key={r.id} value={r.id}>{r.ring_name}</option>)}
                </select>
              </div>
            </div>
            <button onClick={handleImport} disabled={loading} className="btn-primary w-full py-3 mt-4 text-xs">
              {loading ? 'جاري الاستيراد...' : 'بدء الاستيراد للدفعة'}
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}
