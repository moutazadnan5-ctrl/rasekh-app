import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../store/useAppStore';
import debounce from 'lodash.debounce';

export function useAttendance(date: string) {
  const { profile, role } = useAppStore();
  const [rings, setRings] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [studentRings, setStudentRings] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [teacherRecords, setTeacherRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'error'>('idle');

  // Fetch base data (Rings, Students, Teachers)
  useEffect(() => {
    const fetchBaseData = async () => {
      const [rRes, sRes, srRes, tRes] = await Promise.all([
        supabase.from('rings').select('*'),
        supabase.from('students').select('*'),
        supabase.from('student_rings').select('*'),
        supabase.from('teachers').select('*')
      ]);

      let availableRings = rRes.data || [];
      
      // If teacher, only show their rings
      if (role === 'مدرس حلقة' && profile?.id) {
        availableRings = availableRings.filter(r => r.teacher_id === profile.id);
      }

      setRings(availableRings);
      setStudents(sRes.data || []);
      setStudentRings(srRes.data || []);
      setTeachers(tRes.data || []);
    };

    fetchBaseData();
  }, [role, profile]);

  // Fetch records for the specific date
  useEffect(() => {
    const fetchRecords = async () => {
      if (!date) return;
      setLoading(true);
      try {
        const [recRes, tRecRes] = await Promise.all([
          supabase.from('attendance_records').select('*').eq('record_date', date),
          supabase.from('teacher_attendance').select('*').eq('record_date', date)
        ]);
        setRecords(recRes.data || []);
        setTeacherRecords(tRecRes.data || []);
      } catch (err) {
        console.error('Error fetching records:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRecords();
  }, [date]);

  // Debounced save function
  const debouncedSave = useRef(
    debounce(async (table: string, payload: any, matchKeys: Record<string, any>) => {
      setSyncStatus('syncing');
      try {
        const { error } = await supabase
          .from(table)
          .upsert(payload, { onConflict: Object.keys(matchKeys).join(',') });
        
        if (error) throw error;
        setSyncStatus('idle');
      } catch (err) {
        console.error('Save error:', err);
        setSyncStatus('error');
      }
    }, 1000)
  ).current;

  const updateRecord = (
    type: 'student' | 'teacher',
    id: string,
    field: string,
    value: any,
    extraFields?: Record<string, any>
  ) => {
    const table = type === 'student' ? 'attendance_records' : 'teacher_attendance';
    const idField = type === 'student' ? 'student_id' : 'teacher_id';
    
    // Optimistic UI update
    if (type === 'student') {
      setRecords(prev => {
        const existing = prev.find(r => r[idField] === id);
        if (existing) {
          return prev.map(r => r[idField] === id ? { ...r, [field]: value, ...extraFields } : r);
        }
        return [...prev, { [idField]: id, record_date: date, [field]: value, ...extraFields }];
      });
    } else {
      setTeacherRecords(prev => {
        const existing = prev.find(r => r[idField] === id);
        if (existing) {
          return prev.map(r => r[idField] === id ? { ...r, [field]: value, ...extraFields } : r);
        }
        return [...prev, { [idField]: id, record_date: date, [field]: value, ...extraFields }];
      });
    }

    // Prepare payload for DB
    const payload = {
      [idField]: id,
      record_date: date,
      [field]: value === '' ? null : value,
      ...extraFields
    };

    debouncedSave(table, payload, { [idField]: id, record_date: date });
  };

  return {
    rings,
    students,
    studentRings,
    teachers,
    records,
    teacherRecords,
    loading,
    syncStatus,
    updateRecord,
    setRecords
  };
}
