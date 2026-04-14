import React, { useState } from 'react';
import { useAnalytics } from '../hooks/useAnalytics';
import { 
  BarChart3, 
  Users, 
  BookOpen, 
  TrendingUp, 
  Download, 
  MessageCircle,
  RefreshCw,
  Award,
  Badge
} from 'lucide-react';
import { motion } from 'motion/react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import * as XLSX from 'xlsx';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function Analytics() {
  const { stats, attendanceTrend, topStudents, exportData, loading, refetch } = useAnalytics();
  const [activeTab, setActiveTab] = useState<'overview' | 'whatsapp'>('overview');

  const handleExportExcel = () => {
    const formattedData = exportData.map(s => {
      const rings = s.student_rings?.map((sr: any) => sr.rings?.ring_name).join('، ') || 'بدون حلقة';
      return {
        'اسم الطالب': s.full_name,
        'اسم الأب': s.father_name || '-',
        'رقم الهاتف': s.phone_number || '-',
        'الحلقات المسجل بها': rings,
        'تنبيه إداري': s.admin_alert || 'لا يوجد'
      };
    });

    const ws = XLSX.utils.json_to_sheet(formattedData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "الطلاب");
    XLSX.writeFile(wb, `تقرير_الطلاب_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const openWhatsApp = (phone: string, name: string) => {
    if (!phone) return alert('لا يوجد رقم هاتف مسجل لهذا الطالب');
    // Format phone number (remove leading zeros, add country code if needed - assuming local format for now, just stripping spaces)
    const cleanPhone = phone.replace(/\s+/g, '');
    const message = encodeURIComponent(`السلام عليكم ورحمة الله وبركاته،\nنود إعلامكم بخصوص الطالب ${name}...\n\nإدارة منصة راسخ`);
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
  };

  if (loading) {
    return <div className="flex justify-center items-center min-h-[50vh]"><RefreshCw className="animate-spin text-primary-custom" size={32} /></div>;
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#16223b',
        titleColor: '#10b981',
        bodyColor: '#fff',
        borderColor: '#ffffff1a',
        borderWidth: 1,
        padding: 10,
        displayColors: false,
        callbacks: {
          label: (context: any) => `نسبة الحضور: ${context.parsed.y}%`
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        grid: { color: '#ffffff0a' },
        ticks: { color: '#9ca3af', stepSize: 25 }
      },
      x: {
        grid: { display: false },
        ticks: { color: '#9ca3af' }
      }
    }
  };

  const chartData = {
    labels: attendanceTrend.labels,
    datasets: [
      {
        fill: true,
        label: 'نسبة الحضور',
        data: attendanceTrend.data,
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        tension: 0.4,
        borderWidth: 2,
        pointBackgroundColor: '#0b1326',
        pointBorderColor: '#10b981',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6
      }
    ]
  };

  return (
    <div className="space-y-8 pb-12">
      <header className="flex flex-wrap justify-between items-center gap-4">
        <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
          <BarChart3 className="text-primary-custom" size={32} />
          <span>ذكاء الأعمال والتقارير</span>
        </h1>
        
        <div className="flex gap-2">
          <button 
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'overview' ? 'bg-primary-custom text-surface' : 'bg-surface text-gray-400 border border-white/5 hover:text-white'}`}
          >
            نظرة عامة
          </button>
          <button 
            onClick={() => setActiveTab('whatsapp')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${activeTab === 'whatsapp' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-surface text-gray-400 border border-white/5 hover:text-emerald-400'}`}
          >
            <MessageCircle size={14} /> المراسلة
          </button>
        </div>
      </header>

      {activeTab === 'overview' && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass-card p-5 flex flex-col justify-between relative overflow-hidden group">
              <div className="absolute -left-4 -top-4 w-16 h-16 bg-blue-500/10 rounded-full blur-xl group-hover:bg-blue-500/20 transition-all" />
              <div className="flex justify-between items-start mb-4 relative z-10">
                <div className="bg-blue-500/20 p-2 rounded-lg border border-blue-500/30 text-blue-400">
                  <Users size={20} />
                </div>
              </div>
              <div className="relative z-10">
                <h3 className="text-[10px] font-bold text-gray-400 mb-1">إجمالي الطلاب</h3>
                <p className="text-3xl font-black text-white">{stats.totalStudents}</p>
              </div>
            </div>

            <div className="glass-card p-5 flex flex-col justify-between relative overflow-hidden group">
              <div className="absolute -left-4 -top-4 w-16 h-16 bg-emerald-500/10 rounded-full blur-xl group-hover:bg-emerald-500/20 transition-all" />
              <div className="flex justify-between items-start mb-4 relative z-10">
                <div className="bg-emerald-500/20 p-2 rounded-lg border border-emerald-500/30 text-emerald-400">
                  <BookOpen size={20} />
                </div>
              </div>
              <div className="relative z-10">
                <h3 className="text-[10px] font-bold text-gray-400 mb-1">الحلقات النشطة</h3>
                <p className="text-3xl font-black text-white">{stats.totalRings}</p>
              </div>
            </div>

            <div className="glass-card p-5 flex flex-col justify-between relative overflow-hidden group">
              <div className="absolute -left-4 -top-4 w-16 h-16 bg-purple-500/10 rounded-full blur-xl group-hover:bg-purple-500/20 transition-all" />
              <div className="flex justify-between items-start mb-4 relative z-10">
                <div className="bg-purple-500/20 p-2 rounded-lg border border-purple-500/30 text-purple-400">
                  <Badge size={20} />
                </div>
              </div>
              <div className="relative z-10">
                <h3 className="text-[10px] font-bold text-gray-400 mb-1">الكوادر التعليمية</h3>
                <p className="text-3xl font-black text-white">{stats.totalTeachers}</p>
              </div>
            </div>

            <div className="glass-card p-5 flex flex-col justify-between relative overflow-hidden group">
              <div className="absolute -left-4 -top-4 w-16 h-16 bg-amber-500/10 rounded-full blur-xl group-hover:bg-amber-500/20 transition-all" />
              <div className="flex justify-between items-start mb-4 relative z-10">
                <div className="bg-amber-500/20 p-2 rounded-lg border border-amber-500/30 text-amber-400">
                  <TrendingUp size={20} />
                </div>
              </div>
              <div className="relative z-10">
                <h3 className="text-[10px] font-bold text-gray-400 mb-1">متوسط الحضور (7 أيام)</h3>
                <p className="text-3xl font-black text-white">{stats.attendanceRate}%</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chart */}
            <div className="glass-card p-6 lg:col-span-2">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-sm font-bold text-white">مؤشر الحضور العام</h2>
                <button onClick={refetch} className="text-gray-400 hover:text-primary-custom transition-colors">
                  <RefreshCw size={16} />
                </button>
              </div>
              <div className="h-64 w-full">
                <Line data={chartData} options={chartOptions} />
              </div>
            </div>

            {/* Top Students */}
            <div className="glass-card p-6 flex flex-col">
              <h2 className="text-sm font-bold text-white mb-6 flex items-center gap-2">
                <Award className="text-amber-400" size={18} /> لوحة الشرف (الأكثر حفظاً)
              </h2>
              <div className="flex-1 space-y-4">
                {topStudents.length > 0 ? topStudents.map((s, i) => (
                  <div key={i} className="flex justify-between items-center bg-surface p-3 rounded-xl border border-white/5">
                    <div className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${i === 0 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : i === 1 ? 'bg-gray-300/20 text-gray-300 border border-gray-300/30' : i === 2 ? 'bg-orange-700/20 text-orange-400 border border-orange-700/30' : 'bg-white/5 text-gray-500'}`}>
                        {i + 1}
                      </div>
                      <span className="text-xs font-bold text-white">{s.name}</span>
                    </div>
                    <div className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">
                      ص {s.pages}
                    </div>
                  </div>
                )) : (
                  <div className="text-center text-gray-500 text-xs py-8">لا توجد بيانات كافية</div>
                )}
              </div>
            </div>
          </div>

          {/* Export Section */}
          <div className="glass-card p-6 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div>
              <h2 className="text-sm font-bold text-white mb-1">تصدير السجلات</h2>
              <p className="text-[10px] text-gray-400">تحميل قاعدة بيانات الطلاب والحلقات بصيغة Excel للطباعة أو الأرشفة.</p>
            </div>
            <button 
              onClick={handleExportExcel}
              className="btn-primary px-6 py-3 flex items-center gap-2 text-xs w-full sm:w-auto justify-center"
            >
              <Download size={16} /> تحميل التقرير (XLSX)
            </button>
          </div>
        </motion.div>
      )}

      {activeTab === 'whatsapp' && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6"
        >
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
                <MessageCircle size={18} /> مركز المراسلة السريعة
              </h2>
              <p className="text-[10px] text-gray-400 mt-1">إرسال رسائل واتساب مباشرة لأولياء الأمور بنقرة واحدة.</p>
            </div>
          </div>

          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-right text-xs">
              <thead className="text-gray-400 border-b border-white/5">
                <tr>
                  <th className="pb-3">اسم الطالب</th>
                  <th className="pb-3">رقم الهاتف</th>
                  <th className="pb-3">الحلقات</th>
                  <th className="pb-3 text-center">إجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {exportData.map(s => {
                  const rings = s.student_rings?.map((sr: any) => sr.rings?.ring_name).join('، ') || 'بدون حلقة';
                  return (
                    <tr key={s.id} className="hover:bg-white/5">
                      <td className="py-3 font-bold text-white">{s.full_name}</td>
                      <td className="py-3 font-mono text-gray-400">{s.phone_number || 'غير متوفر'}</td>
                      <td className="py-3 text-gray-500">{rings}</td>
                      <td className="py-3 text-center">
                        <button 
                          onClick={() => openWhatsApp(s.phone_number, s.full_name)}
                          disabled={!s.phone_number}
                          className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1.5 rounded-lg hover:bg-emerald-500 hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1 mx-auto"
                        >
                          <MessageCircle size={14} /> مراسلة
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
    </div>
  );
}
