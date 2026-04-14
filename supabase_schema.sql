-- ==========================================
-- 1. مسح الجداول القديمة (إن وجدت) لتجنب التعارض
-- ==========================================
DROP TABLE IF EXISTS teacher_attendance CASCADE;
DROP TABLE IF EXISTS attendance_records CASCADE;
DROP TABLE IF EXISTS teacher_rings CASCADE;
DROP TABLE IF EXISTS student_rings CASCADE;
DROP TABLE IF EXISTS students CASCADE;
DROP TABLE IF EXISTS rings CASCADE;
DROP TABLE IF EXISTS teachers CASCADE;
DROP TABLE IF EXISTS system_settings CASCADE;

-- ==========================================
-- 2. إنشاء الجداول الجديدة
-- ==========================================

-- جدول إعدادات النظام
CREATE TABLE system_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- جدول الكوادر (المعلمين والإداريين)
CREATE TABLE teachers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID, -- يربط مع جدول المستخدمين في Supabase Auth
    full_name TEXT NOT NULL,
    phone_number TEXT,
    role TEXT DEFAULT 'مدرس حلقة', -- مدرس حلقة, محرر إداري ثاني, محرر إداري أول, مشاهد للمنصة
    marital_status TEXT DEFAULT 'أعزب',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- جدول الحلقات
CREATE TABLE rings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ring_name TEXT NOT NULL,
    teacher_id UUID REFERENCES teachers(id) ON DELETE SET NULL,
    ring_type TEXT DEFAULT 'حفظ', -- حفظ, نشاط
    point_value NUMERIC,
    attendance_points NUMERIC,
    start_date DATE,
    end_date DATE,
    attendance_days JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- جدول الطلاب
CREATE TABLE students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    father_name TEXT,
    phone_number TEXT,
    admin_alert TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- جدول ربط الطلاب بالحلقات (طالب واحد يمكن أن يكون في عدة حلقات)
CREATE TABLE student_rings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    ring_id UUID REFERENCES rings(id) ON DELETE CASCADE,
    UNIQUE(student_id, ring_id)
);

-- جدول ربط المعلمين بالحلقات (معلم واحد يمكن أن يشرف على عدة حلقات)
CREATE TABLE teacher_rings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID REFERENCES teachers(id) ON DELETE CASCADE,
    ring_id UUID REFERENCES rings(id) ON DELETE CASCADE,
    UNIQUE(teacher_id, ring_id)
);

-- جدول سجلات حضور وتسميع الطلاب
CREATE TABLE attendance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    record_date DATE NOT NULL,
    attendance_status TEXT, -- حاضر, متأخر, غائب
    pages_memorized NUMERIC DEFAULT 0,
    last_page_memorized NUMERIC DEFAULT 0,
    sard_start_page NUMERIC,
    sard_end_page NUMERIC,
    sard_naqarat NUMERIC DEFAULT 0,
    sard_raddat NUMERIC DEFAULT 0,
    sard_matana NUMERIC,
    tested_parts TEXT,
    exam_result TEXT, -- ناجح, راسب
    activity_points NUMERIC DEFAULT 0,
    total_result NUMERIC DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    UNIQUE(student_id, record_date)
);

-- جدول سجلات حضور الكوادر
CREATE TABLE teacher_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID REFERENCES teachers(id) ON DELETE CASCADE,
    record_date DATE NOT NULL,
    attendance_status TEXT, -- حاضر, متأخر, غائب, مجاز
    hours NUMERIC DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    UNIQUE(teacher_id, record_date)
);

-- ==========================================
-- 3. إعدادات الأمان (Row Level Security - RLS)
-- ==========================================

-- تفعيل RLS على جميع الجداول
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE rings ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_rings ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_rings ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_attendance ENABLE ROW LEVEL SECURITY;

-- إنشاء سياسات تسمح للمستخدمين المسجلين (Authenticated) بقراءة وكتابة البيانات
-- (ملاحظة: في بيئة الإنتاج الحقيقية، يجب تخصيص هذه السياسات لتكون أكثر صرامة بناءً على الـ Role)

CREATE POLICY "Allow authenticated users full access to system_settings" ON system_settings FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users full access to teachers" ON teachers FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users full access to rings" ON rings FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users full access to students" ON students FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users full access to student_rings" ON student_rings FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users full access to teacher_rings" ON teacher_rings FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users full access to attendance_records" ON attendance_records FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users full access to teacher_attendance" ON teacher_attendance FOR ALL USING (auth.role() = 'authenticated');

-- إدخال إعدادات افتراضية للنظام
INSERT INTO system_settings (key, value) VALUES 
('mosque_name', '"مسجد النور"'),
('time_fence_mode', '"open"'),
('attendance_days', '["السبت", "الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة"]');
