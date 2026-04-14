import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function useAdminData() {
  const [teachers, setTeachers] = useState<any[]>([]);
  const [rings, setRings] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [studentRings, setStudentRings] = useState<any[]>([]);
  const [teacherRings, setTeacherRings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tRes, rRes, sRes, srRes, trRes] = await Promise.all([
        supabase.from('teachers').select('*').order('full_name'),
        supabase.from('rings').select('*').order('ring_name'),
        supabase.from('students').select('*').order('full_name'),
        supabase.from('student_rings').select('*'),
        supabase.from('teacher_rings').select('*')
      ]);

      if (tRes.data) setTeachers(tRes.data);
      if (rRes.data) setRings(rRes.data);
      if (sRes.data) setStudents(sRes.data);
      if (srRes.data) setStudentRings(srRes.data);
      if (trRes.data) setTeacherRings(trRes.data);
    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const deleteStudent = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من حذف الطالب وسجلاته نهائياً؟')) return;
    try {
      const { error } = await supabase.from('students').delete().eq('id', id);
      if (error) throw error;
      await fetchData();
    } catch (error) {
      console.error('Error deleting student:', error);
      alert('حدث خطأ أثناء الحذف');
    }
  };

  return {
    teachers,
    rings,
    students,
    studentRings,
    teacherRings,
    loading,
    refetch: fetchData,
    deleteStudent
  };
}
