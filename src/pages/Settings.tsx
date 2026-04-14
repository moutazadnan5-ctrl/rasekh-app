import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Save, Shield, Clock, MessageSquare, Building } from 'lucide-react';

export default function Settings() {
  const [settings, setSettings] = useState<any>({
    mosque_name: 'جامع الراجحي',
    time_fence: { start_hour: 15, end_hour: 21, enabled: true },
    whatsapp_templates: {
      attendance: 'تحية طيبة، نفيدكم بحضور ابنكم {name} لحلقة اليوم.',
      absence: 'نحيطكم علماً بغياب ابنكم {name} عن حلقة اليوم، نرجو المتابعة.',
    }
  });

  const handleSave = async () => {
    // In a real app, save each key to system_settings table
    alert('تم حفظ الإعدادات بنجاح');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <header>
        <h2 className="text-3xl font-black">إعدادات النظام</h2>
        <p className="text-white/40 mt-1">تخصيص المنصة وفقاً لاحتياجات المركز</p>
      </header>

      <div className="space-y-6">
        {/* General Settings */}
        <section className="glass-card p-8 space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <Building className="text-primary-custom" size={20} />
            <h3 className="text-xl font-bold">إعدادات عامة</h3>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-white/60 mb-2">اسم المسجد / المركز</label>
            <input 
              type="text" 
              className="w-full input-field"
              value={settings.mosque_name}
              onChange={(e) => setSettings({...settings, mosque_name: e.target.value})}
            />
          </div>
        </section>

        {/* Time Fence */}
        <section className="glass-card p-8 space-y-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <Clock className="text-amber-400" size={20} />
              <h3 className="text-xl font-bold">نظام الفترة الزمنية (Time Fence)</h3>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer"
                checked={settings.time_fence.enabled}
                onChange={(e) => setSettings({...settings, time_fence: {...settings.time_fence, enabled: e.target.checked}})}
              />
              <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-custom"></div>
            </label>
          </div>
          
          <p className="text-sm text-white/40">يحدد هذا النظام الساعات التي يسمح فيها للمعلمين بإدخال البيانات اليومية.</p>
          
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-white/60 mb-2">وقت البدء (ساعة)</label>
              <input 
                type="number" 
                className="w-full input-field"
                value={settings.time_fence.start_hour}
                onChange={(e) => setSettings({...settings, time_fence: {...settings.time_fence, start_hour: parseInt(e.target.value)}})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/60 mb-2">وقت الإغلاق (ساعة)</label>
              <input 
                type="number" 
                className="w-full input-field"
                value={settings.time_fence.end_hour}
                onChange={(e) => setSettings({...settings, time_fence: {...settings.time_fence, end_hour: parseInt(e.target.value)}})}
              />
            </div>
          </div>
        </section>

        {/* WhatsApp Templates */}
        <section className="glass-card p-8 space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <MessageSquare className="text-emerald-400" size={20} />
            <h3 className="text-xl font-bold">قوالب رسائل واتساب</h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white/60 mb-2">قالب الحضور</label>
              <textarea 
                className="w-full input-field h-24 resize-none"
                value={settings.whatsapp_templates.attendance}
                onChange={(e) => setSettings({...settings, whatsapp_templates: {...settings.whatsapp_templates, attendance: e.target.value}})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/60 mb-2">قالب الغياب</label>
              <textarea 
                className="w-full input-field h-24 resize-none"
                value={settings.whatsapp_templates.absence}
                onChange={(e) => setSettings({...settings, whatsapp_templates: {...settings.whatsapp_templates, absence: e.target.value}})}
              />
            </div>
          </div>
        </section>

        <div className="flex justify-end">
          <button 
            onClick={handleSave}
            className="btn-primary flex items-center gap-2 px-12 py-4 text-lg"
          >
            <Save size={24} />
            <span>حفظ كافة التغييرات</span>
          </button>
        </div>
      </div>
    </div>
  );
}
