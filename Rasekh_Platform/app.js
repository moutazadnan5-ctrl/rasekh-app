// إعدادات الاتصال بـ Supabase (هذه هي البطاقة التعريفية للمنصة)
const SUPABASE_URL = 'https://yjsdvsbihsocrqampcjt.supabase.co';
const SUPABASE_KEY = 'sb_publishable_9eyNtsJDdognCatQCMJmNQ_WK0IlsOq';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
// ==========================================
// 1. الإشعارات والدوال المساعدة (Utilities)
// ==========================================
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    const bgColor = type === 'success' ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300' : 'bg-red-500/20 border-red-500/50 text-red-300';
    const icon = type === 'success' ? 'check_circle' : 'error';
    
    toast.className = `toast flex items-center gap-2 px-4 py-3 rounded-xl backdrop-blur-md shadow-lg border ${bgColor} mb-2`;
    toast.innerHTML = `<span class="material-symbols-outlined text-[18px]">${icon}</span> <span class="text-xs font-bold">${escapeHTML(message)}</span>`;
    
    container.appendChild(toast);
    setTimeout(() => { toast.classList.add('hide'); setTimeout(() => toast.remove(), 300); }, 3000);
}

function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/[&<>'"]/g, function(tag) {
        return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[tag] || tag;
    });
}

function getLocalDateStr(dateObj) {
    const offset = dateObj.getTimezoneOffset() * 60000;
    return (new Date(dateObj - offset)).toISOString().split('T')[0];
}

// ==========================================
// 2. المتغيرات العالمية (Global State)
// ==========================================
let currentUserSession = null;
let currentTeacherProfile = null;
let currentRole = 'مشاهد للمنصة'; 
let systemSettings = {};

let globalTeachers = [], globalRings = [], globalStudents = [];
let currentRingStudents = []; 
let saveTimers = {};

let sardStudentId = null, sStart = null, sEnd = null;
let currentExamStudentId = null;

// ==========================================
// 3. نظام التهيئة (Boot System)
// ==========================================
window.addEventListener('DOMContentLoaded', async () => {
    // تعيين تاريخ اليوم افتراضياً
    document.getElementById('attendance-date').valueAsDate = new Date();
    
    // جلب الإعدادات والتحقق من الجلسة
    await fetchSystemSettings(); 
    checkAuthSession();
    
    // تهيئة مستمعات الأحداث (سيتم كتابتها في الدفعات القادمة)
    setupEventListeners(); 
});

async function fetchSystemSettings() {
    try {
        const { data } = await supabaseClient.from('system_settings').select('*');
        if (data) { 
            data.forEach(s => systemSettings[s.setting_key] = s.setting_value); 
            applyBranding(); 
        }
    } catch (err) { 
        showToast("فشل تحميل إعدادات النظام", 'error'); 
    }
}

function applyBranding() {
    if (systemSettings.mosque_name) { 
        document.getElementById('login-mosque-name').innerText = "نظام " + escapeHTML(systemSettings.mosque_name); 
    }
    if (systemSettings.mosque_logo && systemSettings.mosque_logo.trim() !== '') {
        const logo = document.getElementById('login-mosque-logo');
        logo.src = systemSettings.mosque_logo; 
        logo.classList.remove('hidden');
        document.getElementById('login-default-icon').classList.add('hidden');
    }
}
// ==========================================
// 4. نظام المصادقة وتوزيع الصلاحيات (Auth & Roles)
// ==========================================
async function checkAuthSession() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) await handleSuccessfulLogin(session.user);
    else document.getElementById('login-overlay').style.display = 'flex';

    supabaseClient.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session) await handleSuccessfulLogin(session.user);
        else if (event === 'SIGNED_OUT') resetSystemState();
    });
}

async function loginUser() {
    const email = document.getElementById('auth-email').value.trim();
    const pass = document.getElementById('auth-password').value;
    const btn = document.getElementById('login-btn');

    if(!email || !pass) { showToast("الرجاء إدخال البريد وكلمة المرور", "error"); return; }
    
    const originalText = btn.innerHTML;
    btn.innerHTML = `<span class="material-symbols-outlined animate-spin">sync</span> جاري التحقق...`;
    
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password: pass });
    
    if (error) {
        showToast("بيانات الدخول غير صحيحة أو الحساب موقوف.", "error");
        btn.innerHTML = originalText;
    } else { 
        showToast('تم تسجيل الدخول بنجاح', 'success'); 
    }
}

async function logoutUser() { 
    if(confirm("هل تريد إنهاء الجلسة وإغلاق النظام؟")) {
        await supabaseClient.auth.signOut(); 
    }
}

function resetSystemState() {
    currentUserSession = null; currentTeacherProfile = null; currentRole = 'مشاهد للمنصة';
    globalTeachers = []; globalRings = []; globalStudents = []; currentRingStudents = [];
    document.getElementById('login-overlay').style.display = 'flex';
}

async function handleSuccessfulLogin(user) {
    currentUserSession = user; 
    document.getElementById('login-overlay').style.display = 'none';
    
    // جلب ملف المستخدم لمعرفة صلاحيته
    const { data: profile } = await supabaseClient.from('teachers').select('*').eq('auth_user_id', user.id).maybeSingle();
    
    if (profile) {
        currentTeacherProfile = profile; 
        currentRole = profile.role || 'مدرس حلقة';
        document.getElementById('user-profile-name').innerText = `أهلاً، ${escapeHTML(profile.full_name)}`;
    } else {
        // إذا لم يكن له ملف، فهو المدير العام السحري
        currentRole = 'محرر إداري أول'; 
        document.getElementById('user-profile-name').innerText = "المدير العام";
    }

    applyRolePermissions();
    
    // جلب البيانات الأساسية بعد الدخول (سيتم تعريف هذه الدالة في الدفعة القادمة)
    if(typeof loadInitialData === 'function') await loadInitialData(); 
}

// الجزء الثاني: تعريف الدالة (المانيفستو الخاص بالصلاحيات)
function applyRolePermissions() {
    const navA = document.getElementById('nav-admin');
    const navR = document.getElementById('nav-reports');
    const setB = document.getElementById('btn-settings-modal'); // زر الإعدادات
    const synB = document.getElementById('btn-sync-modal');     // زر المزامنة
    const arcB = document.getElementById('btn-archive-modal');  // زر الأرشيف
    
    // خطوة 1: إخفاء كل أدوات الإدارة والأزرار الحساسة للجميع كبداية
    [navA, navR, setB, synB, arcB].forEach(e => { if(e) e.classList.add('hidden'); });

    // خطوة 2: توزيع الصلاحيات بناءً على رتبة المستخدم
    if (currentRole === 'محرر إداري أول') { 
        // المدير العام: يرى كل شيء بدون استثناء
        [navA, navR, setB, synB, arcB].forEach(e => { if(e) e.classList.remove('hidden'); }); 
        
    } else if (currentRole === 'محرر إداري ثاني') { 
        // مدير الدورة (المشرف التنفيذي): يرى الإدارة والمحصلات، ولكن يُحرم من الإعدادات والأرشيف
        if(navA) navA.classList.remove('hidden');
        if(navR) navR.classList.remove('hidden');
        
    } else if (currentRole === 'مشاهد للمنصة') { 
        // المشاهد الرقابي: يرى واجهة ذكاء الأعمال (المحصلات) فقط
        if(navR) navR.classList.remove('hidden'); 
    }
}// ==========================================
// 5. ربط الأحداث وإدارة النوافذ المنبثقة (Event Listeners & Modals)
// ==========================================
function setupEventListeners() {
    // 1. أزرار تسجيل الدخول والخروج
    document.getElementById('login-btn')?.addEventListener('click', loginUser);
    document.getElementById('btn-logout-nav')?.addEventListener('click', logoutUser);
    document.getElementById('btn-force-logout')?.addEventListener('click', logoutUser);

    // 2. شريط التنقل السفلي
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const page = e.currentTarget.getAttribute('data-page');
            switchPage(page);
        });
    });

   // 3. فتح النوافذ المنبثقة (تعبئة ذكية للإعدادات)
    document.querySelectorAll('.btn-open-modal').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const targetId = e.currentTarget.getAttribute('data-target');
            
            // تعبئة البيانات تلقائياً قبل فتح واجهة الإعدادات
            if (targetId === 'settings-modal') {
                const elMosque = document.getElementById('set_mosque_name'); if(elMosque) elMosque.value = systemSettings.mosque_name || '';
                const elMode = document.getElementById('set_time_fence_mode'); if(elMode) elMode.value = systemSettings.time_fence_mode || 'always_open';
                const elWaT = document.getElementById('set_wa_teacher'); if(elWaT) elWaT.value = systemSettings.wa_teacher_template || '';
                const elWaS = document.getElementById('set_wa_student'); if(elWaS) elWaS.value = systemSettings.wa_student_template || '';
                
                const days = JSON.parse(systemSettings.attendance_days || '[]');
                document.querySelectorAll('#set_attendance_days input[type="checkbox"]').forEach(cb => {
                    cb.checked = days.includes(cb.value);
                });
            }
            
            openModal(targetId);
        });
    });

    // 4. إغلاق النوافذ المنبثقة
    document.querySelectorAll('.btn-close-modal').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const targetId = e.currentTarget.getAttribute('data-target');
            closeModal(targetId);
        });
    });

    // 5. تبويبات التفقد (طلاب / كوادر)
    document.getElementById('tab-att-students')?.addEventListener('click', () => switchAttTab('students'));
    document.getElementById('tab-att-teachers')?.addEventListener('click', () => switchAttTab('teachers'));

    // 6. فلتر الحلقات وتغيير التاريخ
    document.getElementById('attendance-date')?.addEventListener('change', () => {
        updateDayName();
        if(typeof renderAttendanceTable === 'function') renderAttendanceTable();
    });
    document.getElementById('ring-filter')?.addEventListener('change', () => {
        if(typeof renderAttendanceTable === 'function') renderAttendanceTable();
    });
}

function openModal(modalId) { 
    const el = document.getElementById(modalId); 
    if(el) { el.classList.remove('hidden'); el.classList.add('flex'); } 
}

function closeModal(modalId) { 
    const el = document.getElementById(modalId); 
    if(el) { el.classList.add('hidden'); el.classList.remove('flex'); } 
}

// ==========================================
// 6. التنقل وجلب البيانات الأولي (Navigation & Initial Data)
// ==========================================
async function loadInitialData() {
    try {
        const [resT, resR] = await Promise.all([
            supabaseClient.from('teachers').select('id, full_name, role, phone_number'),
            supabaseClient.from('rings').select('*')
        ]);
        globalTeachers = resT.data || []; 
        globalRings = resR.data || [];
        
        populateFilters(); 
        updateDayName(); 
        switchPage('attendance'); 
    } catch (e) { 
        showToast("فشل تحميل هيكل البيانات الأساسي", 'error'); 
    }
}

function switchPage(pageId) {
    document.querySelectorAll('.page-section').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    
    document.getElementById(pageId + '-page')?.classList.add('active');
    document.getElementById('nav-' + (pageId === 'attendance' ? 'att' : pageId))?.classList.add('active');
    
    if (pageId === 'attendance' && typeof renderAttendanceTable === 'function') renderAttendanceTable();
    if (pageId === 'reports' && typeof generateDashboard === 'function') generateDashboard();
    if (pageId === 'admin' && typeof loadAdminData === 'function') loadAdminData();
}

function populateFilters() {
    const rF = document.getElementById('ring-filter'); 
    if(!rF) return;
    
    rF.innerHTML = '';
    if (currentRole !== 'مدرس حلقة') {
        rF.innerHTML += '<option value="all">كل الحلقات</option>';
    }
    
    globalRings.forEach(r => { 
        rF.innerHTML += `<option value="${r.id}">${escapeHTML(r.ring_name)}</option>`; 
    });
    
    if(globalRings.length > 0 && currentRole === 'مدرس حلقة') {
        rF.value = globalRings[0].id;
    }
}

// ==========================================
// 7. مؤشرات الواجهة الزمنية وبوابة الإدخال (Time Fence)
// ==========================================
function updateDayName() {
    const dateInput = document.getElementById('attendance-date');
    if(!dateInput) return;
    
    const d = new Date(dateInput.value); 
    if (isNaN(d)) return;
    
    const dayNameAr = d.toLocaleDateString('ar-EG', { weekday: 'long' });
    document.getElementById('date-day-name').innerText = "يوم " + dayNameAr;
    
    const officialDays = JSON.parse(systemSettings.attendance_days || '[]');
    const badge = document.getElementById('date-day-badge');
    
    if(badge) {
        badge.classList.remove('hidden', 'bg-emerald-500', 'bg-orange-500');
        if (officialDays.includes(dayNameAr.replace('يوم ', '').trim())) { 
            badge.innerText = "دوام رسمي"; badge.classList.add('bg-emerald-500'); 
        } else { 
            badge.innerText = "عطلة"; badge.classList.add('bg-orange-500'); 
        }
    }
}

function checkClientTimeFence() {
    if (['محرر إداري أول', 'محرر إداري ثاني'].includes(currentRole)) return true; 
    
    const mode = systemSettings.time_fence_mode || 'always_open';
    if (mode === 'force_closed') {
        document.getElementById('time-fence-msg').innerHTML = "بوابة الإدخال مغلقة قسرياً من الإدارة.<br><span class='text-[10px] text-red-400 mt-2 block'>أي محاولة تعديل سيتم رفضها.</span>";
        document.getElementById('time-fence-overlay').classList.replace('hidden', 'flex');
        return false;
    }
    return true; 
}

function switchAttTab(type) {
    document.getElementById('att-students-area')?.classList.toggle('hidden', type !== 'students');
    document.getElementById('att-teachers-area')?.classList.toggle('hidden', type === 'students');
    document.getElementById('ring-filter')?.classList.toggle('hidden', type !== 'students');
    
    const tabStudents = document.getElementById('tab-att-students');
    const tabTeachers = document.getElementById('tab-att-teachers');
    
    if(tabStudents) tabStudents.className = type === 'students' ? "px-6 py-2 rounded-lg font-bold bg-primary text-surface text-xs shadow-md transition-all" : "px-6 py-2 rounded-lg font-bold text-gray-400 hover:text-white text-xs transition-all";
    if(tabTeachers) tabTeachers.className = type === 'teachers' ? "px-6 py-2 rounded-lg font-bold bg-primary text-surface text-xs shadow-md transition-all" : "px-6 py-2 rounded-lg font-bold text-gray-400 hover:text-white text-xs transition-all";
    
    if(type === 'students' && typeof renderAttendanceTable === 'function') renderAttendanceTable();
    if(type === 'teachers' && typeof renderTeacherAttendanceTable === 'function') renderTeacherAttendanceTable();
}
// ==========================================
// 8. محرك تفقد الطلاب والكوادر (Attendance Rendering)
// ==========================================
async function renderAttendanceTable() {
    if (!checkClientTimeFence()) return;
    
    const ringId = document.getElementById('ring-filter').value;
    const date = document.getElementById('attendance-date').value;
    const grid = document.getElementById('attendance-grid');
    const statusBox = document.getElementById('sync-status');
    
    statusBox.innerHTML = `<span class="material-symbols-outlined text-[14px] animate-spin">sync</span> جاري الجلب...`;

    // 1. جلب الطلاب حسب الفلتر
    let studentQuery = supabaseClient.from('students').select('id, full_name, ring_id, status').eq('status', 'فعال');
    if (ringId !== 'all') studentQuery = studentQuery.eq('ring_id', ringId);
    
    const { data: studentsData, error: sErr } = await studentQuery;
    if(sErr) { showToast("حدث خطأ في جلب الطلاب", "error"); return; }
    
    currentRingStudents = studentsData || [];

    if (currentRingStudents.length === 0) {
        grid.innerHTML = '<tr><td colspan="8" class="p-10 text-center text-gray-500 font-bold italic text-xs">لا يوجد طلاب مسجلين في هذا النطاق.</td></tr>';
        statusBox.innerHTML = `<span class="material-symbols-outlined text-[14px]">cloud_done</span> متصل`;
        return;
    }

    // 2. جلب سجلات التفقد لهذا اليوم
    const studentIds = currentRingStudents.map(s => s.id);
    const { data: recordsData } = await supabaseClient.from('attendance_records')
        .select('*')
        .eq('record_date', date)
        .in('student_id', studentIds);

    statusBox.innerHTML = `<span class="material-symbols-outlined text-[14px]">cloud_done</span> متصل`;
    const isReadOnly = currentRole === 'مشاهد للمنصة';

    // 3. بناء الجدول مع التنسيق الشرطي والكلمات الكاملة
    grid.innerHTML = currentRingStudents.map(s => {
        const rec = recordsData?.find(r => r.student_id === s.id) || {};
        const safeName = escapeHTML(s.full_name);
        
        const sardText = rec.sard_start_page ? `${rec.sard_start_page}-${rec.sard_end_page} (${rec.sard_matana||0}%)` : 'سرد';
        const sardColor = rec.sard_start_page ? 'bg-blue-500 text-surface font-bold border-none' : 'bg-surface text-blue-400 border border-blue-500/30';
        
        const examText = rec.tested_parts ? `أجزاء:${escapeHTML(rec.tested_parts)}` : 'اختبار';
        const examColor = rec.tested_parts ? 'bg-primary text-surface font-bold border-none' : 'bg-surface text-primary border border-primary/30';

        // التنسيق الشرطي للحضور
        let attClass = '';
        if (rec.attendance_status === 'حاضر') attClass = 'state-present';
        else if (rec.attendance_status === 'متأخر') attClass = 'state-late';
        else if (rec.attendance_status === 'غائب') attClass = 'state-absent';

        // التنسيق الشرطي للاختبار
        let resClass = '';
        if (rec.exam_result === 'ناجح') resClass = 'state-pass';
        else if (rec.exam_result === 'راسب') resClass = 'state-fail';

        return `
            <tr class="hover:bg-white/5 border-b border-white/5 transition-colors">
                <td class="p-3 font-bold text-white whitespace-nowrap text-[11px]">${safeName}</td>
                <td class="p-2 text-center">
                    <select ${isReadOnly ? 'disabled' : ''} onchange="debounceSave('students', '${s.id}', 'attendance_status', this.value); updateSelectColor(this);" class="p-1.5 text-[10px] rounded-lg font-bold w-full transition-colors ${attClass}">
                        <option value="" class="bg-surface text-white" ${!rec.attendance_status?'selected':''}>-</option>
                        <option value="حاضر" class="bg-surface text-emerald-400" ${rec.attendance_status==='حاضر'?'selected':''}>حاضر</option>
                        <option value="متأخر" class="bg-surface text-amber-400" ${rec.attendance_status==='متأخر'?'selected':''}>متأخر</option>
                        <option value="غائب" class="bg-surface text-red-400" ${rec.attendance_status==='غائب'?'selected':''}>غائب</option>
                    </select>
                </td>
                <td class="p-2 text-center"><input ${isReadOnly ? 'disabled' : ''} type="number" oninput="debounceSave('students', '${s.id}', 'pages_memorized', this.value)" value="${rec.pages_memorized||''}" class="p-1.5 text-center text-[10px] rounded-lg"></td>
                <td class="p-2 text-center"><input ${isReadOnly ? 'disabled' : ''} type="number" oninput="debounceSave('students', '${s.id}', 'last_page_memorized', this.value)" value="${rec.last_page_memorized||''}" class="p-1.5 text-center text-[10px] rounded-lg"></td>
                <td class="p-2 text-center"><button ${isReadOnly ? 'disabled' : ''} type="button" class="btn-sard-trigger ${sardColor} px-1 py-1.5 rounded-lg text-[9px] w-full truncate shadow-sm" data-id="${s.id}" data-start="${rec.sard_start_page||''}" data-end="${rec.sard_end_page||''}" data-n="${rec.sard_naqarat||0}" data-r="${rec.sard_raddat||0}">${sardText}</button></td>
                <td class="p-2 text-center"><button ${isReadOnly ? 'disabled' : ''} type="button" class="btn-exam-trigger ${examColor} px-1 py-1.5 rounded-lg text-[9px] w-full truncate shadow-sm" data-id="${s.id}" data-parts="${escapeHTML(rec.tested_parts||'')}">${examText}</button></td>
                <td class="p-2 text-center">
                    <select ${isReadOnly ? 'disabled' : ''} onchange="debounceSave('students', '${s.id}', 'exam_result', this.value); updateExamColor(this);" class="p-1.5 text-[10px] rounded-lg font-bold w-full transition-colors ${resClass}">
                        <option value="" class="bg-surface text-white" ${!rec.exam_result?'selected':''}>-</option>
                        <option value="ناجح" class="bg-surface text-emerald-400" ${rec.exam_result==='ناجح'?'selected':''}>ناجح</option>
                        <option value="راسب" class="bg-surface text-red-400" ${rec.exam_result==='راسب'?'selected':''}>راسب</option>
                    </select>
                </td>
                <td class="p-2"><input ${isReadOnly ? 'disabled' : ''} type="text" oninput="debounceSave('students', '${s.id}', 'notes', this.value)" value="${escapeHTML(rec.notes||'')}" class="p-1.5 text-[10px] rounded-lg w-full" placeholder="..."></td>
            </tr>`;
    }).join('');

    attachDynamicListeners();
}

async function renderTeacherAttendanceTable() {
    if (!checkClientTimeFence()) return;
    const date = document.getElementById('attendance-date').value;
    const grid = document.getElementById('attendance-teachers-grid');
    if(currentRole === 'مدرس حلقة') return;

    const { data: records } = await supabaseClient.from('teacher_attendance').select('*').eq('record_date', date);
    
    grid.innerHTML = globalTeachers.map(t => {
        const rec = records?.find(r => r.teacher_id === t.id) || {};
        
        let attClass = '';
        if (rec.attendance_status === 'حاضر') attClass = 'state-present';
        else if (rec.attendance_status === 'متأخر') attClass = 'state-late';
        else if (rec.attendance_status === 'غائب') attClass = 'state-absent';

        return `<tr class="border-b border-white/5">
            <td class="p-4 text-white text-xs font-bold">${escapeHTML(t.full_name)} <span class="text-[9px] text-gray-400 block">${escapeHTML(t.role)}</span></td>
            <td class="p-3">
                <select onchange="debounceSave('teachers', '${t.id}', 'attendance_status', this.value); updateSelectColor(this);" class="p-2 text-[10px] rounded-lg font-bold w-full transition-colors ${attClass}">
                    <option value="" class="bg-surface text-white" ${!rec.attendance_status?'selected':''}>-</option>
                    <option value="حاضر" class="bg-surface text-emerald-400" ${rec.attendance_status==='حاضر'?'selected':''}>حاضر</option>
                    <option value="متأخر" class="bg-surface text-amber-400" ${rec.attendance_status==='متأخر'?'selected':''}>متأخر</option>
                    <option value="غائب" class="bg-surface text-red-400" ${rec.attendance_status==='غائب'?'selected':''}>غائب</option>
                </select>
            </td>
            <td class="p-3"><input type="text" oninput="debounceSave('teachers', '${t.id}', 'notes', this.value)" value="${escapeHTML(rec.notes||'')}" class="p-2 text-[10px] rounded-lg w-full"></td>
        </tr>`;
    }).join('');
}

// التحديث اللحظي للألوان عند التغيير البصري
window.updateSelectColor = function(selectEl) {
    selectEl.classList.remove('state-present', 'state-late', 'state-absent');
    if (selectEl.value === 'حاضر') selectEl.classList.add('state-present');
    else if (selectEl.value === 'متأخر') selectEl.classList.add('state-late');
    else if (selectEl.value === 'غائب') selectEl.classList.add('state-absent');
};

window.updateExamColor = function(selectEl) {
    selectEl.classList.remove('state-pass', 'state-fail');
    if (selectEl.value === 'ناجح') selectEl.classList.add('state-pass');
    else if (selectEl.value === 'راسب') selectEl.classList.add('state-fail');
};
// ==========================================
// 9. خوارزمية الحفظ الذكي (Smart Auto-Save Engine)
// ==========================================
function debounceSave(type, id, field, val) { 
    clearTimeout(saveTimers[id+field]); 
    saveTimers[id+field] = setTimeout(async () => { await autoSave(id, field, val, type); }, 800); 
}

async function autoSave(recordId, field, value, type = 'students') {
    const date = document.getElementById('attendance-date').value;
    const statusBox = document.getElementById('sync-status');
    statusBox.innerHTML = `<span class="material-symbols-outlined text-[14px] animate-spin">sync</span> جاري الحفظ...`;
    
    const table = type === 'students' ? 'attendance_records' : 'teacher_attendance';
    const idColumn = type === 'students' ? 'student_id' : 'teacher_id';
    
    try {
        // الحل الجذري: جلب البيانات الحالية لهذا السجل أولاً لضمان عدم مسح الحقول الأخرى
        const { data: existing } = await supabaseClient.from(table).select('*').eq(idColumn, recordId).eq('record_date', date).maybeSingle();
        
        let payload = { [idColumn]: recordId, record_date: date };
        
        if (existing) {
            // ندمج التعديل الجديد مع السجل القديم
            payload = { ...existing, [field]: (value === "" ? null : value) };
            delete payload.id; // نحذف ID السجل لكي يعمل Upsert بشكل صحيح
        } else {
            payload[field] = (value === "" ? null : value);
        }

        const { error } = await supabaseClient.from(table).upsert(payload, { onConflict: `${idColumn},record_date` });
        if(error) throw error;
        
        statusBox.innerHTML = `<span class="material-symbols-outlined text-[14px] text-emerald-400">cloud_done</span> متصل`;
    } catch (err) {
        statusBox.innerHTML = `<span class="material-symbols-outlined text-[14px] text-red-500">error</span> خطأ`;
        showToast("فشل الحفظ: " + err.message, 'error'); 
    }
}

function attachDynamicListeners() {
    // ربط أزرار السرد
    document.querySelectorAll('.btn-sard-trigger').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const d = e.currentTarget.dataset;
            openSardModal(d.id, parseInt(d.start), parseInt(d.end), parseInt(d.n), parseInt(d.r));
        });
    });
    // ربط أزرار الاختبار
    document.querySelectorAll('.btn-exam-trigger').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const d = e.currentTarget.dataset;
            openExamModal(d.id, d.parts);
        });
    });
}// ==========================================
// 10. محرك تقييم السرد (Sard & Recitation Logic)
// ==========================================
function openSardModal(id, start, end, naq, rad) {
    sardStudentId = id; 
    sStart = start || null; 
    sEnd = end || null;
    
    document.getElementById('sard_n').value = naq || ''; 
    document.getElementById('sard_r').value = rad || '';
    
    renderSardPages();
    calcMatana();
    openModal('sard-modal');
}

function renderSardPages() {
    const container = document.getElementById('sard-parts-container');
    let html = '';
    for(let i=1; i<=604; i++) {
        let cls = '';
        if(sStart && i === sStart) cls = 'active';
        else if(sEnd && i === sEnd) cls = 'active';
        else if(sStart && sEnd && i > Math.min(sStart, sEnd) && i < Math.max(sStart, sEnd)) cls = 'range';
        html += `<button type="button" class="part-btn w-8 h-8 ${cls}" data-page="${i}">${i}</button>`;
    }
    container.innerHTML = html;

    // ربط الضغط على أرقام الصفحات
    container.querySelectorAll('.part-btn').forEach(btn => {
        btn.onclick = () => {
            const page = parseInt(btn.dataset.page);
            if(!sStart || (sStart && sEnd)) { sStart = page; sEnd = null; }
            else { sEnd = page; if(sEnd < sStart) { [sStart, sEnd] = [sEnd, sStart]; } }
            renderSardPages();
            calcMatana();
        };
    });
}

function calcMatana() {
    const n = parseInt(document.getElementById('sard_n').value) || 0; 
    const r = parseInt(document.getElementById('sard_r').value) || 0;
    const display = document.getElementById('sard_m_display');
    
    if(!sStart || !sEnd) { display.innerText = '-'; return null; }
    
    const totalPages = Math.abs(sEnd - sStart) + 1;
    const matana = Math.round(Math.max(0, ((totalPages * 100) - ((n * 10) + (r * 20))) / totalPages));
    display.innerText = matana + '%';
    return matana;
}

// ربط أزرار نافذة السرد
document.getElementById('btn-clear-sard')?.addEventListener('click', () => {
    sStart = null; sEnd = null;
    document.getElementById('sard_n').value = '';
    document.getElementById('sard_r').value = '';
    renderSardPages();
    calcMatana();
});

// تفعيل حساب المتانة فورياً بمجرد كتابة الرقم (Real-time Math)
document.getElementById('sard_n')?.addEventListener('input', calcMatana);
document.getElementById('sard_r')?.addEventListener('input', calcMatana);

// محرك الحفظ الصاروخي (طرد واحد بدلاً من 5 طلبات)
document.getElementById('btn-save-sard')?.addEventListener('click', async () => {
    if(!sardStudentId) return;
    
    const btn = document.getElementById('btn-save-sard');
    const origText = btn.innerHTML;
    btn.innerHTML = '<span class="material-symbols-outlined animate-spin">sync</span> جاري الحفظ...';
    btn.disabled = true;

    const matana = calcMatana();
    const n = parseInt(document.getElementById('sard_n').value) || 0;
    const r = parseInt(document.getElementById('sard_r').value) || 0;
    const date = document.getElementById('attendance-date').value;
    
    try {
        // جلب السجل الحالي لتجنب مسح الحضور
        const { data: existing } = await supabaseClient.from('attendance_records')
            .select('*').eq('student_id', sardStudentId).eq('record_date', date).maybeSingle();
        
        let payload = existing ? { ...existing } : { student_id: sardStudentId, record_date: date };
        delete payload.id; // نحذف الـ ID لكي تعمل الـ Upsert بشكل صحيح على المفاتيح

        payload.sard_start_page = sStart;
        payload.sard_end_page = sEnd;
        payload.sard_naqarat = n;
        payload.sard_raddat = r;
        payload.sard_matana = matana;

        const { error } = await supabaseClient.from('attendance_records').upsert(payload, { onConflict: 'student_id,record_date' });
        if (error) throw error;
        
        closeModal('sard-modal');
        renderAttendanceTable(); 
    } catch (e) {
        showToast("حدث خطأ أثناء حفظ السرد", "error");
    } finally {
        btn.innerHTML = origText;
        btn.disabled = false;
    }
});
// ==========================================
// 11. محرك الاختبارات (Exams Logic)
// ==========================================
function openExamModal(id, currentParts) {
    currentExamStudentId = id;
    const container = document.getElementById('exam-parts-container');
    const selected = currentParts ? currentParts.split(',') : [];
    
    container.innerHTML = Array.from({length: 30}, (_, i) => i+1).map(num => {
        const isActive = selected.includes(num.toString()) ? 'active' : '';
        return `<button type="button" class="part-btn w-10 h-10 ${isActive}" data-num="${num}">${num}</button>`;
    }).join('');

    container.querySelectorAll('.part-btn').forEach(btn => {
        btn.onclick = () => btn.classList.toggle('active');
    });
    
    openModal('exam-modal');
}

document.getElementById('btn-save-exam')?.addEventListener('click', async () => {
    if(!currentExamStudentId) return;
    const parts = Array.from(document.querySelectorAll('#exam-parts-container .part-btn.active'))
                       .map(b => b.dataset.num).join(',');
    
    await autoSave(currentExamStudentId, 'tested_parts', parts);
    closeModal('exam-modal');
    renderAttendanceTable();
});

// ==========================================
// 12. إدارة الكيانات (Admin CRUD Operations)
// ==========================================
async function loadAdminData() {
    const statusBox = document.getElementById('sync-status');
    statusBox.innerHTML = `جاري المزامنة...`;
    
    try {
        const [resT, resR, resS] = await Promise.all([
            supabaseClient.from('teachers').select('*').order('full_name'),
            supabaseClient.from('rings').select('*').order('ring_name'),
            supabaseClient.from('students').select('*').order('full_name')
        ]);

        globalTeachers = resT.data || [];
        globalRings = resR.data || [];
        globalStudents = resS.data || [];

        // تعبئة القوائم المنسدلة في النماذج
        const tOpts = globalTeachers.map(t => `<option value="${t.id}">${escapeHTML(t.full_name)}</option>`).join('');
        document.getElementById('r_teacher').innerHTML = tOpts;
        
        const rOpts = globalRings.map(r => `<option value="${r.id}">${escapeHTML(r.ring_name)}</option>`).join('');
        document.getElementById('s_ring').innerHTML = rOpts;
        document.getElementById('sd_ring').innerHTML = rOpts;

        // بناء الجداول الإدارية
        renderAdminTables();
        statusBox.innerHTML = `<span class="material-symbols-outlined text-[14px]">cloud_done</span> متصل`;
    } catch (e) { showToast("فشل تحديث بيانات الإدارة", 'error'); }
}

function renderAdminTables() {
    document.getElementById('admin-teachers-list').innerHTML = globalTeachers.map(t => `
        <tr class="border-b border-white/5 hover:bg-white/5">
            <td class="py-2 text-white font-bold">${escapeHTML(t.full_name)}</td>
            <td class="py-2 text-gray-400 text-[10px]">${escapeHTML(t.role)}</td>
            <td class="py-2 text-left"><button type="button" class="edit-teacher-btn text-primary bg-primary/10 px-2 py-1 rounded" data-id="${t.id}">تعديل</button></td>
        </tr>`).join('');

    document.getElementById('admin-rings-list').innerHTML = globalRings.map(r => `
        <tr class="border-b border-white/5 hover:bg-white/5">
            <td class="py-2 text-white font-bold">${escapeHTML(r.ring_name)}</td>
            <td class="py-2 text-gray-400 text-[10px]">${escapeHTML(globalTeachers.find(t=>t.id===r.teacher_id)?.full_name || '-')}</td>
            <td class="py-2 text-left"><button type="button" class="edit-ring-btn text-primary bg-primary/10 px-2 py-1 rounded" data-id="${r.id}">تعديل</button></td>
        </tr>`).join('');

    document.getElementById('admin-students-list').innerHTML = globalStudents.map(s => `
        <tr class="border-b border-white/5 hover:bg-white/5">
            <td class="py-2 text-white font-bold">${escapeHTML(s.full_name)}</td>
            <td class="py-2 text-gray-400 text-[10px]">${escapeHTML(globalRings.find(r=>r.id===s.ring_id)?.ring_name || '-')}</td>
            <td class="py-2 text-left"><button type="button" class="edit-student-btn text-primary bg-primary/10 px-2 py-1 rounded" data-id="${s.id}">تعديل</button></td>
        </tr>`).join('');

    // ربط أزرار التعديل
    attachAdminEditListeners();
}

// ==========================================
// 13. مستمعات التعديل الإداري وإعدادات النظام
// ==========================================
function attachAdminEditListeners() {
    document.querySelectorAll('.edit-teacher-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.id;
            const t = globalTeachers.find(x => x.id === id);
            if(!t) return;
            const form = document.getElementById('teacher-details-form');
            for(let key in t) { if(form.elements[key]) form.elements[key].value = t[key] || ''; }
            openModal('teacher-details-modal');
        });
    });

    document.querySelectorAll('.edit-ring-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.id;
            const r = globalRings.find(x => x.id === id);
            if(!r) return;
            const form = document.getElementById('ring-form');
            for(let key in r) { if(form.elements[key]) form.elements[key].value = r[key] || ''; }
            openModal('ring-modal');
        });
    });

    document.querySelectorAll('.edit-student-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.id;
            const s = globalStudents.find(x => x.id === id);
            if(!s) return;
            const form = document.getElementById('student-details-form');
            for(let key in s) { if(form.elements[key]) form.elements[key].value = s[key] || ''; }
            openModal('student-details-modal');
        });
    });
}

// استبدل الجزء القديم بهذا الكود المطور
// التعديل في ملف app.js - قسم حفظ الإعدادات
// ==========================================
// حفظ إعدادات النظام (محرك صلب يتجاوز أخطاء onConflict)
// ==========================================
// ==========================================
// حفظ إعدادات النظام (محرك صلب يتجاوز أخطاء onConflict)
// ==========================================
document.getElementById('btn-save-settings')?.addEventListener('click', async () => {
    const btn = document.getElementById('btn-save-settings');
    btn.disabled = true;
    btn.innerHTML = `<span class="material-symbols-outlined animate-spin text-sm">sync</span> جاري الرفع للسيرفر...`;
    
    try {
        const updates = [ 
            { setting_key: 'mosque_name', setting_value: document.getElementById('set_mosque_name')?.value || "" }, 
            { setting_key: 'time_fence_mode', setting_value: document.getElementById('set_time_fence_mode')?.value || "" }, 
            { setting_key: 'wa_teacher_template', setting_value: document.getElementById('set_wa_teacher')?.value || "" }, 
            { setting_key: 'wa_student_template', setting_value: document.getElementById('set_wa_student')?.value || "" },
            { setting_key: 'attendance_days', setting_value: JSON.stringify(Array.from(document.querySelectorAll('#set_attendance_days input:checked')).map(cb => cb.value)) }
        ];
        
        let hasError = false;

        for (const item of updates) {
            // التصحيح هنا: نطلب 'setting_key' بدلاً من 'id' لأن الجدول لا يحتوي على id
            const { data: existing } = await supabaseClient.from('system_settings').select('setting_key').eq('setting_key', item.setting_key).maybeSingle();
            
            let res;
            if (existing) {
                // إذا وجده، يقوم بالتحديث
                res = await supabaseClient.from('system_settings').update({ setting_value: item.setting_value }).eq('setting_key', item.setting_key);
            } else {
                // إذا لم يجده، يقوم بالإضافة
                res = await supabaseClient.from('system_settings').insert([item]);
            }

            if (res.error) {
                console.error(`خطأ في ${item.setting_key}:`, res.error);
                hasError = true;
            }
        }
        
        if(hasError) throw new Error("فشل رفع بعض الإعدادات، راجع الكونسول");

        showToast('تم مزامنة الإعدادات مع السيرفر بنجاح');
        setTimeout(() => location.reload(), 1000); // تحديث الصفحة لتفعيل الإعدادات فوراً
        
    } catch (err) {
        console.error("خطأ المزامنة:", err);
        showToast('فشل المزامنة: ' + err.message, 'error');
        btn.disabled = false;
        btn.innerHTML = 'حفظ الإعدادات وتحديث السيرفر';
    }
});// 14. ذكاء الأعمال والمحصلات (BI Dashboard)
// ==========================================
let statusChart, trendChart, ringCompChart;

document.getElementById('report-scope')?.addEventListener('change', (e) => {
    document.getElementById('report-ring-filter').style.display = e.target.value === 'ring' ? 'block' : 'none';
});
// ==========================================
// تحديث التواريخ وزر التصدير السريع
// ==========================================
document.getElementById('report-timeframe')?.addEventListener('change', (e) => {
    // لا نمسح التواريخ إذا اختار المستخدم "مخصص"
    if (e.target.value !== 'custom') {
        let start = new Date(), end = new Date();
        if(e.target.value === 'week') start.setDate(start.getDate() - 7);
        else if(e.target.value === 'month') start.setDate(1);
        
        document.getElementById('rep-start').value = getLocalDateStr(start);
        document.getElementById('rep-end').value = getLocalDateStr(end);
    }
    
    document.getElementById('custom-date-range').style.display = e.target.value === 'custom' ? 'flex' : 'none';
});

// ربط زر التصدير الجديد في واجهة المحصلات
document.getElementById('btn-export-excel-direct')?.addEventListener('click', () => {
    // محاكاة الضغط على زر التصدير المخفي في الأرشيف
    document.getElementById('btn-execute-export')?.click(); 
});document.getElementById('btn-generate-report')?.addEventListener('click', generateDashboard);
// تم حذف أمر الطباعة القديم من هنا لأنه يسبب تضارباً

async function generateDashboard() {
    // نعتمد على محرك التواريخ الموحد لضمان الدقة وتجنب الأصفار
    const { s: sStr, e: eStr } = getSmartDates();
    showToast("جاري تحليل البيانات واستخراج المحصلات...", 'success');;

    // جلب الطلاب إذا كانوا فارغين
    if(globalStudents.length === 0) {
        const { data } = await supabaseClient.from('students').select('*');
        globalStudents = data || [];
    }

    const { data: records, error } = await supabaseClient.from('attendance_records').select('*').gte('record_date', sStr).lte('record_date', eStr);
    if(error) { showToast("حدث خطأ في جلب بيانات المحصلات", 'error'); return; }

    const officialDaysList = JSON.parse(systemSettings.attendance_days || '[]');
    let activeOfficialDates = [...new Set(records.map(r => r.record_date))].filter(date => {
        const dName = new Date(date).toLocaleDateString('ar-EG', { weekday: 'long' }).replace('يوم ', '').trim();
        return officialDaysList.includes(dName);
    });
    
    let activeOfficialDaysCount = activeOfficialDates.length || 1;
    let expectedRecs = globalStudents.length * activeOfficialDaysCount;

    let pres = records.filter(r => r.attendance_status === 'حاضر' || r.attendance_status === 'متأخر').length;
    let achieversList = [...new Set(records.filter(r => r.pages_memorized > 0 || r.sard_start_page > 0 || r.exam_result === 'ناجح').map(r => r.student_id))];
    let uniquePresent = [...new Set(records.filter(r => r.attendance_status === 'حاضر' || r.attendance_status === 'متأخر').map(r => r.student_id))].length;

    let attRate = expectedRecs === 0 ? 0 : Math.min(100, Math.round((pres / expectedRecs) * 100));
    let achRate = uniquePresent === 0 ? 0 : Math.round((achieversList.length / uniquePresent) * 100);

// حقن الأرقام مع نظام حماية (If exists) لمنع انهيار المنصة
    const elPres = document.getElementById('kpi-present'); if(elPres) elPres.innerText = pres;
    const elAtt = document.getElementById('kpi-att-rate'); if(elAtt) elAtt.innerText = attRate + '%';
    const elAch = document.getElementById('kpi-achievers'); if(elAch) elAch.innerText = achieversList.length;
    const elAchRate = document.getElementById('kpi-achieve-rate'); if(elAchRate) elAchRate.innerText = achRate + '%';

    updateAdvancedCharts(records, pres, expectedRecs);
    renderReportTables(records);
    
    // تشغيل محرك الرؤى الذكية (بشكل مستقل عن نطاق التاريخ المختار)
    generateSmartInsights(records);
}

// ==========================================
// محرك الرؤى الذكية (الإنذارات الدائمة ولوحة الشرف) - المطوّر
// ==========================================
// ==========================================
// محرك الرؤى الذكية (الإنذارات الدائمة ولوحة الشرف) - المطوّر
// ==========================================
async function generateSmartInsights(currentRecords) {
    const container = document.getElementById('smart-alerts-container');
    if (!container) return;
    
    let alertsHtml = '';
    
    // --- 1. الأوسمة ولوحة الشرف (تعتمد على التاريخ المحدد في الشاشة) ---
    let topStudentName = 'لا يوجد إنجاز';
    let maxPages = 0;
    const studentPages = {};
    
    currentRecords.forEach(r => {
        if (r.pages_memorized > 0) studentPages[r.student_id] = (studentPages[r.student_id] || 0) + r.pages_memorized;
    });
    
    const topId = Object.keys(studentPages).sort((a,b) => studentPages[b] - studentPages[a])[0];
    if (topId) {
        maxPages = studentPages[topId];
        topStudentName = globalStudents.find(s => s.id === topId)?.full_name || 'غير معروف';
    }

    // --- 2. محرك الإنذارات الجذري والمستقل (محصن ومضمون 100%) ---
    // نجلب آخر 30 يوماً لضمان وجود مساحة كافية للبحث، ونطلب من السيرفر ترتيبها تنازلياً
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { data: recentRecords, error } = await supabaseClient
        .from('attendance_records')
        .select('*')
        .gte('record_date', getLocalDateStr(thirtyDaysAgo))
        .order('record_date', { ascending: false }); // الترتيب من قاعدة البيانات مباشرة يمنع أي خطأ

    let warnedList = [];
    globalStudents.forEach(s => {
        // بما أن السجلات مرتبة من الأحدث للأقدم، نقوم بتصفيتها للطالب الحالي فقط
        const sRecs = (recentRecords || []).filter(r => r.student_id === s.id);
        
        let consecutiveAbsences = 0;
        for (let rec of sRecs) {
            if (rec.attendance_status === 'غائب') {
                consecutiveAbsences++;
            } else if (rec.attendance_status === 'حاضر' || rec.attendance_status === 'متأخر') {
                break; // أول حضور يكسر سلسلة الغياب، فنتوقف عن العد
            }
        }

        // إذا وجد 3 غيابات متتالية أو أكثر، نطلق الإنذار
        if (consecutiveAbsences >= 3) {
            const ringName = globalRings.find(r => r.id === s.ring_id)?.ring_name || 'بدون حلقة';
            warnedList.push({ name: s.full_name, ring: ringName, phone: s.phone_number, days: consecutiveAbsences });
        }
    });

    // بناء واجهة الإنذارات
    if (warnedList.length > 0) {
        const warningsHtml = warnedList.map(w => `
            <div class="flex items-center justify-between bg-red-500/10 border border-red-500/30 p-2 rounded-lg mt-2">
                <div class="text-[11px] text-red-200">الطالب <b>${w.name}</b> (حلقة ${w.ring}) منقطع لـ <span class="font-bold text-red-400">${w.days} أيام متتالية</span>.</div>
                <button onclick="sendWarningWA('${w.phone}', '${w.name}')" class="bg-red-600 text-white px-3 py-1 rounded text-[10px] hover:bg-red-500 flex items-center gap-1 shadow-md"><span class="material-symbols-outlined text-[12px]">warning</span> إرسال إنذار</button>
            </div>
        `).join('');

        alertsHtml = `<div class="bg-surface-container border border-red-500/30 p-4 rounded-2xl shadow-lg mb-4">
            <h3 class="text-sm font-bold text-red-400 flex items-center gap-1 mb-2"><span class="material-symbols-outlined text-[18px]">emergency_home</span> حالات انقطاع تتطلب تدخلاً عاجلاً</h3>
            ${warningsHtml}
        </div>`;
    }

    // --- 3. بناء الواجهة البصرية ---
    container.innerHTML = alertsHtml + `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div class="bg-gradient-to-r from-emerald-600/20 to-emerald-900/10 border border-emerald-500/20 p-4 rounded-xl flex items-center gap-4">
                <div class="bg-emerald-500/20 p-2 rounded-full border border-emerald-500/30"><span class="material-symbols-outlined text-3xl text-emerald-400">workspace_premium</span></div>
                <div><p class="text-[10px] text-gray-400 mb-1">بطل الحفظ (ضمن النطاق المحدد)</p><p class="font-bold text-white">${topStudentName} <span class="text-emerald-400 text-[10px]">(${maxPages} صفحة)</span></p></div>
            </div>
            <div class="bg-gradient-to-r from-amber-600/20 to-amber-900/10 border border-amber-500/20 p-4 rounded-xl flex items-center gap-4">
                <div class="bg-amber-500/20 p-2 rounded-full border border-amber-500/30"><span class="material-symbols-outlined text-3xl text-amber-400">verified_user</span></div>
                <div><p class="text-[10px] text-gray-400 mb-1">مؤشر الانضباط العام للمسجد</p><p class="font-bold text-white text-[11px]">${warnedList.length === 0 ? 'استقرار ممتاز - لا يوجد انقطاعات' : 'يرجى معالجة حالات الانقطاع أعلاه'}</p></div>
            </div>
        </div>
    `;
}// ==========================================
// محرك الرسوم البيانية (مزود بحماية ضد الأخطاء)
// ==========================================
function updateAdvancedCharts(records, p, expected) {
    Chart.defaults.color = '#acb8d8'; 
    Chart.defaults.font.family = 'Tajawal';
    
    const l = records.filter(r => r.attendance_status === 'متأخر').length;
    const a = Math.max(0, expected - p);

    // حماية 1: رسم مخطط الدائرة فقط إذا كانت اللوحة موجودة في HTML
    const doughnutCanvas = document.getElementById('statusDoughnutChart');
    if (doughnutCanvas) {
        if(statusChart) statusChart.destroy();
        statusChart = new Chart(doughnutCanvas, { 
            type: 'doughnut', 
            data: { labels: ['حاضر', 'متأخر', 'غائب'], datasets: [{ data: [p-l, l, a], backgroundColor: ['#10b981', '#f59e0b', '#ef4444'], borderWidth: 0 }] }, 
            options: { plugins: { legend: { position: 'bottom' } }, cutout: '75%' } 
        });
    }

    // حماية 2: رسم مخطط الأداء الزمني فقط إذا كانت اللوحة موجودة في HTML
    const trendCanvas = document.getElementById('trendAreaChart');
    if (trendCanvas) {
        if(trendChart) trendChart.destroy();
        const dMap = {};
        records.forEach(r => { 
            if(!dMap[r.record_date]) dMap[r.record_date] = {p:0, ach:0}; 
            if(r.attendance_status==='حاضر'||r.attendance_status==='متأخر') dMap[r.record_date].p++; 
            if(r.pages_memorized>0||r.sard_start_page>0||r.exam_result==='ناجح') dMap[r.record_date].ach++; 
        });
        const sDates = Object.keys(dMap).sort();
        
        trendChart = new Chart(trendCanvas, { 
            type: 'line', 
            data: { 
                labels: sDates, 
                datasets: [
                    { label: 'الحضور', data: sDates.map(d=>dMap[d].p), borderColor: '#3b82f6', backgroundColor: 'rgba(59, 130, 246, 0.1)', fill: true, tension: 0.4 }, 
                    { label: 'الإنجاز', data: sDates.map(d=>dMap[d].ach), borderColor: '#10b981', borderDash: [5,5], fill: false, tension: 0.4 }
                ] 
            }, 
            options: { scales: { y: { beginAtZero: true } }, plugins: { legend: { display: false } }, maintainAspectRatio: false } 
        });
    }

    // إضافة مخطط الأعمدة المزدوجة (مقارنة الحلقات)
    const ringCanvas = document.getElementById('ringComparisonChart');
    if (ringCanvas && globalRings.length > 0) {
        if(ringCompChart) ringCompChart.destroy();
        
        const labels = []; const attData = []; const achData = [];
        
        globalRings.forEach(r => {
            labels.push(r.ring_name.substring(0, 15)); // اختصار الاسم الطويل
            let rStudents = globalStudents.filter(s => s.ring_id === r.id).map(s=>s.id);
            let recs = records.filter(rc => rStudents.includes(rc.student_id));
            
            let p = recs.filter(rc => rc.attendance_status === 'حاضر' || rc.attendance_status === 'متأخر').length;
            let ach = [...new Set(recs.filter(rc => rc.pages_memorized > 0 || rc.sard_start_page > 0 || rc.exam_result === 'ناجح').map(rc => rc.student_id))].length;
            
            attData.push(p);
            achData.push(ach);
        });

        ringCompChart = new Chart(ringCanvas, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    { label: 'الحضور', data: attData, backgroundColor: '#3b82f6', borderRadius: 4 },
                    { label: 'الإنجاز (حفظ/سرد/اختبار)', data: achData, backgroundColor: '#10b981', borderRadius: 4 }
                ]
            },
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }
        });
    }
}
function renderReportTables(records) {
    window.ringStatsData = {};
    const ringsHtml = globalRings.map(r => {
        let rStudents = globalStudents.filter(s => s.ring_id === r.id);
        let recs = records.filter(rc => rStudents.map(s => s.id).includes(rc.student_id));
        let p = recs.filter(rc => rc.attendance_status === 'حاضر' || rc.attendance_status === 'متأخر').length;
        let ach = [...new Set(recs.filter(rc => rc.pages_memorized > 0 || rc.sard_start_page > 0 || rc.exam_result === 'ناجح').map(rc => rc.student_id))].length;
        
        window.ringStatsData[r.id] = { name: r.ring_name, aR: p, achR: ach }; // تخزين للواتساب

        return `<tr class="border-b border-white/10">
            <td class="py-3 text-white font-bold">${escapeHTML(r.ring_name)}</td>
            <td class="py-3 text-center text-gray-400 text-[10px]">(${p} حضور / ${ach} أنجزوا)</td>
            <td class="py-3 text-center"><button onclick="sendWA_Teacher('${r.id}')" class="bg-primary/20 text-primary border border-primary/50 px-3 py-1 rounded text-[10px]">تقرير</button></td>
        </tr>`;
    }).join('');
    document.getElementById('rep-rings-table').innerHTML = ringsHtml;

    const studentsHtml = globalStudents.map(s => {
        let sRecs = records.filter(r => r.student_id === s.id);
        let lst = sRecs.sort((a,b) => new Date(b.record_date) - new Date(a.record_date))[0] || {};
        let dStr = lst.pages_memorized ? `حفظ ${lst.pages_memorized}` : 'لا يوجد إنجاز حديث';
        return `<tr class="border-b border-white/5">
            <td class="py-3 text-white font-bold">${escapeHTML(s.full_name)}</td>
            <td class="py-3 text-[10px] ${lst.attendance_status === 'حاضر' ? 'text-emerald-400' : 'text-red-400'}">${lst.attendance_status || 'غائب'}</td>
            <td class="py-3 text-gray-400 text-[10px]">${dStr}</td>
            <td class="py-3 text-center"><button onclick="sendWA_Student('${s.phone_number}', '${escapeHTML(s.full_name)}', '${lst.attendance_status}', '${dStr}')" class="bg-emerald-600 text-white px-2 py-1 rounded text-[10px]">واتساب</button></td>
        </tr>`;
    }).join('');
    document.getElementById('rep-students-table').innerHTML = studentsHtml;
}

// ==========================================
// الوصلة المفقودة: ربط نماذج الإضافة (Forms)
// ==========================================
// ==========================================
// 15. أتمتة المراسلات (WhatsApp)
// ==========================================
window.sendWA_Teacher = function(rId) {
    let d = window.ringStatsData[rId];
    if(!d) return showToast('بيانات الحلقة غير متوفرة', 'error');
    let tmpl = systemSettings.wa_teacher_template || `تقرير حلقة {الحلقة}: حضور {نسبة_الحضور}، إنجاز {نسبة_الإنجاز}`;
    let msg = tmpl.replace(/{الحلقة}/g, d.name).replace(/{نسبة_الحضور}/g, d.aR).replace(/{نسبة_الإنجاز}/g, d.achR);
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
}

window.sendWA_Student = function(phone, name, status, details) {
    if(!phone) return showToast('رقم الهاتف غير مسجل', 'error');
    let tmpl = systemSettings.wa_student_template || `*تقرير منصة راسخ*\n👤 الطالب: *{الاسم}*\n📊 الحالة: {الحالة}\n📝 التفاصيل: {التفاصيل}\n\n_تم التوليد تلقائياً_`;
    let msg = tmpl.replace(/{الاسم}/g, name).replace(/{الحالة}/g, status).replace(/{التفاصيل}/g, details);
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
}

// دالة إرسال إنذار الغياب المباشر
window.sendWarningWA = function(phone, name) {
    if(!phone) return showToast('لا يوجد رقم هاتف مسجل لهذا الطالب', 'error');
    let msg = `🚨 *تنبيه غياب متكرر*\nولي أمر الطالب *${name}* المحترم،\nنلفت انتباهكم إلى أن الطالب قد تغيب عن الحلقة لعدة أيام متتالية.\nيرجى متابعة الأمر والتواصل مع الإدارة حرصاً على مستواه.\n\n_إدارة المسجد_`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
}

// ==========================================
// ==========================================
// 16. محرك التقارير المؤسسية (Reporting & Export Engine)
// ==========================================

// وظيفة تجميع المحصلات الشاملة (تدمج الحضور، السرد، والاختبارات في سطر واحد)
// ==========================================
// محرك التقارير المؤسسية (تحديث السرد)
// ==========================================
// ==========================================
// محرك التواريخ الذكي (لمنع ظهور جداول فارغة)
// ==========================================
// ==========================================
// محرك التواريخ الذكي (لمنع ظهور جداول فارغة)
// ==========================================
function getSmartDates() {
    const timeframe = document.getElementById('report-timeframe').value;
    if (timeframe === 'custom') {
        let s = document.getElementById('rep-start').value || getLocalDateStr(new Date());
        let e = document.getElementById('rep-end').value || getLocalDateStr(new Date());
        // حماية قصوى: إذا كان تاريخ البداية بعد النهاية بالخطأ، قم بتبديلهما لمنع ظهور أصفار
        if (s > e) { const temp = s; s = e; e = temp; }
        return { s, e };
    }
    let startD = new Date(), endD = new Date();
    if(timeframe === 'week') startD.setDate(startD.getDate() - 7);
    else if(timeframe === 'month') startD.setDate(1);
    return { s: getLocalDateStr(startD), e: getLocalDateStr(endD) };
}
async function getFullAchievementData(startDate, endDate) {
    const { data: records, error } = await supabaseClient
        .from('attendance_records')
        .select('*')
        .gte('record_date', startDate)
        .lte('record_date', endDate);

    if (error) throw error;

    return globalStudents.map(student => {
        const sRecs = records.filter(r => r.student_id === student.id).sort((a,b) => new Date(a.record_date) - new Date(b.record_date));
        const ring = globalRings.find(r => r.id === student.ring_id);
        
        const attCount = sRecs.filter(r => r.attendance_status === 'حاضر').length;
        const lateCount = sRecs.filter(r => r.attendance_status === 'متأخر').length;
        
        // التنسيق المؤسسي الجديد للسرد
        const sardPages = sRecs.filter(r => r.sard_start_page);
        const totalSardPages = sardPages.reduce((sum, r) => sum + (Math.abs(r.sard_end_page - r.sard_start_page) + 1), 0);
        const ranges = sardPages.map(r => `${r.sard_start_page}-${r.sard_end_page}`).join(' ، ');
        const avgMatana = sardPages.length > 0 ? Math.round(sardPages.reduce((sum, r) => sum + (r.sard_matana || 0), 0) / sardPages.length) : 0;
        const sardFormatted = sardPages.length > 0 ? `${totalSardPages} صفحة (${ranges}) المتانة: ${avgMatana}%` : '-';

        const examList = sRecs.filter(r => r.tested_parts)
            .map(r => `[${r.record_date}: أجزاء ${r.tested_parts} (${r.exam_result})]`)
            .join(' ، ');

        return {
            'الطالب': student.full_name,
            'الحلقة': ring ? ring.ring_name : '-',
            'الحضور': attCount,
            'التأخر': lateCount,
            'إجمالي الحفظ (ص)': sRecs.reduce((sum, r) => sum + (r.pages_memorized || 0), 0),
            'آخر صفحة': Math.max(...sRecs.map(r => r.last_page_memorized || 0), 0),
            'سجل السرد': sardFormatted,
            'سجل الاختبارات': examList || '-'
        };
    });
}
// تشغيل التصدير عند ضغط الزر
document.getElementById('btn-execute-export')?.addEventListener('click', async () => {
    const btn = document.getElementById('btn-execute-export');
    
    // جلب التواريخ إما من نافذة الأرشيف أو من المنظم الذكي السريع
    let start = document.getElementById('exp_start_date').value;
    let end = document.getElementById('exp_end_date').value;
    
    if(!start || !end) {
        const smart = getSmartDates();
        start = smart.s;
        end = smart.e;
    }

    btn.innerHTML = '<span class="material-symbols-outlined animate-spin">sync</span> جاري معالجة البيانات...';
    
    try {
        const reportData = await getFullAchievementData(start, end);
        
        // تصدير الإكسل المطور
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(reportData);
        
        // ضبط عرض الأعمدة ليكون مريحاً للعين (بناءً على ذوقك كمصمم)
        ws['!cols'] = [{wch:25}, {wch:15}, {wch:8}, {wch:8}, {wch:12}, {wch:10}, {wch:40}, {wch:50}];
        
        XLSX.utils.book_append_sheet(wb, ws, "المحصلات");
        XLSX.writeFile(wb, `Rasekh_Report_${start}_to_${end}.xlsx`);
        
        showToast("تم تصدير ملف المحصلات بنجاح");
        closeModal('archive-modal');
    } catch (e) {
        showToast("فشل التصدير: " + e.message, "error");
    } finally {
        btn.innerHTML = '<span class="material-symbols-outlined">download</span> بدء التصدير';
    }
});
// وظيفة الطباعة المؤسسية (تعبئة القالب ثم طباعته)
document.getElementById('btn-print-report')?.addEventListener('click', async () => {
    
    // استخدام التواريخ الذكية مباشرة لمنع ظهور التقرير فارغاً
    const { s: start, e: end } = getSmartDates();

    try {
        // 1. جلب البيانات المجمعة
        const reportData = await getFullAchievementData(start, end);
        
        // 2. تعبئة ترويسة التقرير
        document.getElementById('print-header-mosque').innerText = systemSettings.mosque_name || "منصة راسخ";
        document.getElementById('print-range-display').innerText = `${start} إلى ${end}`;
        document.getElementById('print-current-date').innerText = new Date().toLocaleDateString('ar-EG');

        // 3. بناء صفوف الجدول
        const tableBody = document.getElementById('print-report-body');
        tableBody.innerHTML = reportData.map(row => `
            <tr>
                <td class="p-2 border border-black font-bold">${row['الطالب']}</td>
                <td class="p-2 border border-black">${row['الحلقة']}</td>
                <td class="p-2 border border-black text-center">${row['الحضور']}</td>
                <td class="p-2 border border-black text-center">${row['التأخر']}</td>
                <td class="p-2 border border-black text-center">${row['إجمالي الحفظ (ص)']}</td>
                <td class="p-2 border border-black text-right text-[8px]">${row['سجل السرد']}</td>
                <td class="p-2 border border-black text-right text-[8px]">${row['سجل الاختبارات']}</td>
            </tr>
        `).join('');

        // 4. إطلاق أمر الطباعة
        window.print();

    } catch (e) {
        showToast("فشل تجميع بيانات الطباعة", "error");
        console.error(e);
    }
});
// ==========================================
// 17. المزامنة الذكية (JSON Backup & Restore)
// ==========================================
let syncParsedData = null;

document.getElementById('btn-download-backup')?.addEventListener('click', async () => {
    try {
        const [t, r, s, a] = await Promise.all([
            supabaseClient.from('teachers').select('*'), supabaseClient.from('rings').select('*'),
            supabaseClient.from('students').select('*'), supabaseClient.from('attendance_records').select('*')
        ]);
        const dump = { date: new Date().toISOString(), teachers: t.data, rings: r.data, students: s.data, attendance: a.data };
        const link = document.createElement('a');
        link.href = URL.createObjectURL(new Blob([JSON.stringify(dump)], { type: 'application/json' }));
        link.download = `Rasekh_Backup_${getLocalDateStr(new Date())}.json`;
        link.click();
        showToast('تم سحب النسخة الاحتياطية', 'success');
    } catch(e) { showToast("حدث خطأ أثناء سحب النسخة", 'error'); }
});

document.getElementById('backup_file_input')?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
        try {
            syncParsedData = JSON.parse(ev.target.result);
            document.getElementById('sync_analysis_result').innerHTML = `<p>✅ ملف صالح: ${syncParsedData.attendance?.length || 0} سجل تفقد.</p>`;
            document.getElementById('sync_analysis_result').classList.remove('hidden');
            document.getElementById('sync_conflict_resolution').classList.remove('hidden');
            document.getElementById('btn_execute_sync').classList.remove('hidden');
        } catch(err) { showToast("الملف تالف", 'error'); }
    };
    reader.readAsText(file);
});

document.getElementById('btn_execute_sync')?.addEventListener('click', async () => {
    if(!syncParsedData) return;
    const resolution = document.getElementById('sync_resolution_choice').value;
    const btn = document.getElementById('btn_execute_sync');
    btn.innerHTML = '<span class="material-symbols-outlined animate-spin">sync</span> جاري الدمج...';
    try {
        const opt = resolution === 'keep_current' ? { ignoreDuplicates: true } : { onConflict: 'id' };
        if(syncParsedData.teachers) await supabaseClient.from('teachers').upsert(syncParsedData.teachers, opt);
        if(syncParsedData.rings) await supabaseClient.from('rings').upsert(syncParsedData.rings, opt);
        if(syncParsedData.students) await supabaseClient.from('students').upsert(syncParsedData.students, opt);
        if(syncParsedData.attendance) {
            const attOpt = resolution === 'keep_current' ? { ignoreDuplicates: true, onConflict: 'student_id,record_date' } : { onConflict: 'student_id,record_date' };
            await supabaseClient.from('attendance_records').upsert(syncParsedData.attendance, attOpt);
        }
        showToast("تمت الاستعادة بنجاح!", 'success');
        setTimeout(() => location.reload(), 1500);
    } catch(e) { showToast("حدث خطأ أثناء الدمج", 'error'); btn.innerHTML = 'تنفيذ الاستعادة'; }
});
// ==========================================
// استبدل نهاية ملف app.js بهذا الكود (من سطر 580 للنهاية)
async function handleFormSubmit(e, table, modalId) {
    e.preventDefault();
    const form = e.target;
    const btn = form.querySelector('button[type="submit"]');
    
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<span class="material-symbols-outlined animate-spin text-sm">sync</span> جاري الحفظ...`;
    }

    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    if (!data.id || data.id === "") delete data.id;

    try {
        const { error } = await supabaseClient.from(table).upsert(data);
        if (error) throw error;
        showToast("تم حفظ البيانات بنجاح");
        closeModal(modalId);
        if (typeof loadAdminData === 'function') await loadAdminData();
    } catch (err) {
        showToast("خطأ في الحفظ: " + err.message, 'error');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = 'تأكيد وحفظ';
        }
    }
}

function initializeAllForms() {
    const config = [
        { id: 'teacher-form', table: 'teachers', modal: 'teacher-modal' },
        { id: 'ring-form', table: 'rings', modal: 'ring-modal' },
        { id: 'student-form', table: 'students', modal: 'student-modal' },
        { id: 'teacher-details-form', table: 'teachers', modal: 'teacher-details-modal' },
        { id: 'student-details-form', table: 'students', modal: 'student-details-modal' }
    ];
    config.forEach(cfg => {
        const el = document.getElementById(cfg.id);
        if (el) { el.onsubmit = (e) => handleFormSubmit(e, cfg.table, cfg.modal); }
    });
}

// تشغيل الربط النهائي
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAllForms);
} else {
    initializeAllForms();
}