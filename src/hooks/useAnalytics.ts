import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { startOfMonth, endOfMonth, format, subDays } from 'date-fns';

export function useAnalytics() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalRings: 0,
    totalTeachers: 0,
    attendanceRate: 0,
  });
  const [attendanceTrend, setAttendanceTrend] = useState<any>({ labels: [], data: [] });
  const [topStudents, setTopStudents] = useState<any[]>([]);
  const [exportData, setExportData] = useState<any[]>([]);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      // 1. Basic Counts
      const [sRes, rRes, tRes] = await Promise.all([
        supabase.from('students').select('id', { count: 'exact' }),
        supabase.from('rings').select('id', { count: 'exact' }),
        supabase.from('teachers').select('id', { count: 'exact' })
      ]);

      // 2. Attendance Trend (Last 7 Days)
      const past7Days = Array.from({ length: 7 }, (_, i) => format(subDays(new Date(), 6 - i), 'yyyy-MM-dd'));
      const { data: attData } = await supabase
        .from('attendance_records')
        .select('record_date, attendance_status')
        .in('record_date', past7Days);

      const trendLabels = past7Days.map(d => d.slice(5)); // MM-DD
      const trendData = past7Days.map(date => {
        const dayRecords = attData?.filter(r => r.record_date === date) || [];
        const present = dayRecords.filter(r => r.attendance_status === 'حاضر' || r.attendance_status === 'متأخر').length;
        return dayRecords.length > 0 ? Math.round((present / dayRecords.length) * 100) : 0;
      });

      // Overall attendance rate for the period
      const totalRecords = attData?.length || 0;
      const totalPresent = attData?.filter(r => r.attendance_status === 'حاضر' || r.attendance_status === 'متأخر').length || 0;
      const overallRate = totalRecords > 0 ? Math.round((totalPresent / totalRecords) * 100) : 0;

      // 3. Top Students (by pages memorized in the current month)
      // For simplicity in this demo, we'll just fetch students with highest last_page_memorized
      const { data: topData } = await supabase
        .from('attendance_records')
        .select('student_id, last_page_memorized, students(full_name)')
        .order('last_page_memorized', { ascending: false })
        .limit(5);

      // Deduplicate top students (since they might have multiple records)
      const uniqueTop = [];
      const seen = new Set();
      for (const r of topData || []) {
        if (!seen.has(r.student_id) && r.students) {
          seen.add(r.student_id);
          uniqueTop.push({
            name: (r.students as any).full_name,
            pages: r.last_page_memorized
          });
        }
      }

      // 4. Export Data Prep (Students + Rings)
      const { data: allStudents } = await supabase
        .from('students')
        .select('*, student_rings(rings(ring_name))');

      setStats({
        totalStudents: sRes.count || 0,
        totalRings: rRes.count || 0,
        totalTeachers: tRes.count || 0,
        attendanceRate: overallRate,
      });
      
      setAttendanceTrend({ labels: trendLabels, data: trendData });
      setTopStudents(uniqueTop);
      setExportData(allStudents || []);

    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  return {
    stats,
    attendanceTrend,
    topStudents,
    exportData,
    loading,
    refetch: fetchAnalytics
  };
}
