/* ============================================================
   الموافي — إعدادات ودوال مشتركة لكل صفحات الداشبورد
   ============================================================ */

const SUPABASE_URL = 'https://pahapoquxmsthtnqdjox.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_0yl8DFyoos-myh9EiKCg_g_QjHRhuDF';
const EMAIL_DOMAIN = '@mowafy.local';
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const ROLE_NAMES = { owner: 'صاحب البيزنس', manager: 'مدير فرع', accountant: 'محاسب', field: 'مبيعات / سوشيال ميديا' };
const BRANCH_NAMES = {
  branch_main: 'فرع رئيسي', branch_sayouf: 'فرع السيوف', branch_malaha: 'فرع الملاحة',
  warehouse_main: 'مخزن رئيسي', warehouse_sub: 'مخزن فرعي'
};
const ACTION_NAMES = {
  login: 'تسجيل دخول', logout: 'تسجيل خروج', create_user: 'إنشاء حساب',
  reset_password: 'إعادة تعيين كلمة سر/PIN', change_password: 'تغيير كلمة السر بنفسه'
};

// ---- الوضع الليلي/النهاري ----
const THEME_KEY = 'mowafy_theme';
function getTheme() {
  try { return localStorage.getItem(THEME_KEY) || 'light'; } catch (e) { return 'light'; }
}
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme === 'dark' ? 'dark' : 'light');
}
applyTheme(getTheme());

function sunIcon() {
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4.5"/><path d="M12 2.5v2.5M12 19v2.5M4.2 4.2l1.8 1.8M18 18l1.8 1.8M2.5 12H5M19 12h2.5M4.2 19.8L6 18M18 6l1.8-1.8"/></svg>';
}
function moonIcon() {
  return '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a.75.75 0 0 0-.9-.9A9.5 9.5 0 1 0 21.4 15.4a.75.75 0 0 0-.9-.9z"/></svg>';
}
function toggleTheme() {
  const next = getTheme() === 'dark' ? 'light' : 'dark';
  try { localStorage.setItem(THEME_KEY, next); } catch (e) { /* ignore */ }
  applyTheme(next);
  const btn = document.getElementById('themeToggle');
  if (btn) btn.innerHTML = next === 'dark' ? sunIcon() : moonIcon();
}

function toEmail(name) {
  return String(name).trim().toLowerCase().replace(/\s+/g, '_') + EMAIL_DOMAIN;
}

function branchLabel(arr) {
  if (!arr || !arr.length) return 'كل الفروع';
  return arr.map(b => BRANCH_NAMES[b] || b).join('، ');
}

function fmtDateTime(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' });
  } catch (e) { return iso; }
}

function toast(msg, type) {
  type = type || 'info';
  let host = document.getElementById('toastHost');
  if (!host) {
    host = document.createElement('div');
    host.id = 'toastHost';
    host.className = 'toast-host';
    document.body.appendChild(host);
  }
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = msg;
  host.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 300);
  }, 3800);
}

async function logActivity(action, details) {
  try {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) return;
    await sb.from('activity_log').insert({
      actor_id: session.user.id,
      actor_name: (window.__profile && window.__profile.full_name) || null,
      action, details
    });
  } catch (e) { /* best effort, silent */ }
}

async function requireSession() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) { window.location.href = 'index.html'; return null; }
  return session;
}

async function loadProfile() {
  const session = await requireSession();
  if (!session) return null;
  const { data: profile, error } = await sb.from('profiles').select('*').eq('id', session.user.id).single();
  if (error || !profile) {
    toast('الحساب متسجّل دخول بس معملوش صلاحية (profile) لسه — كلم الإدارة', 'error');
    await sb.auth.signOut();
    setTimeout(() => window.location.href = 'index.html', 1500);
    return null;
  }
  window.__profile = profile;
  window.__session = session;
  renderNav(profile);
  return profile;
}

function renderNav(profile) {
  const nav = document.getElementById('appNav');
  if (!nav) return;
  const page = document.body.dataset.page || '';
  const links = [
    { id: 'dashboard', href: 'dashboard.html', label: 'لوحة التحكم' },
    { id: 'profile', href: 'profile.html', label: 'الملف الشخصي' }
  ];
  if (profile.is_admin) links.push({ id: 'admin', href: 'admin.html', label: 'لوحة الإدارة' });

  nav.innerHTML = `
    <a href="dashboard.html" class="brandmark">
      <span class="word">الموافي</span>
      <span class="brand-sub">DASHBOARD</span>
    </a>
    <div class="nav-links">
      ${links.map(l => `<a href="${l.href}" class="nav-link ${page === l.id ? 'active' : ''}">${l.label}</a>`).join('')}
    </div>
    <div class="user-box">
      <button class="btn btn-ghost theme-toggle" id="themeToggle" onclick="toggleTheme()" title="تبديل الوضع الليلي/النهاري" aria-label="تبديل الوضع الليلي/النهاري">${getTheme() === 'dark' ? sunIcon() : moonIcon()}</button>
      <div class="user-chip">
        <span class="avatar">${(profile.full_name || '?').trim().charAt(0)}</span>
        <span class="user-meta">
          <span class="user-name">${profile.full_name}</span>
          <span class="role-pill">${ROLE_NAMES[profile.role] || profile.role}${profile.is_admin ? ' · أدمن' : ''}</span>
        </span>
      </div>
      <button class="btn btn-ghost btn-sm" onclick="logout()">خروج</button>
    </div>
  `;
}

async function logout() {
  await logActivity('logout', 'تسجيل خروج');
  await sb.auth.signOut();
  window.location.href = 'index.html';
}

// ---- idle timeout: تسجيل خروج تلقائي بعد 15 دقيقة من غير أي تفاعل ----
let idleTimer;
function resetIdleTimer() {
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    toast('اتسجل خروجك تلقائي بسبب عدم النشاط', 'info');
    setTimeout(logout, 1200);
  }, 15 * 60 * 1000);
}
['mousemove', 'keydown', 'touchstart', 'click', 'scroll'].forEach(evt =>
  document.addEventListener(evt, resetIdleTimer, { passive: true })
);
resetIdleTimer();
