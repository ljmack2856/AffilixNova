/* =========================================================
   AfflixNova — nav-auth.js
   Include on every page:  <script type="module" src="nav-auth.js"></script>
   Same assumption as signup.js: ./firebase.js exports `auth`,
   and the Firebase CDN version below matches yours.
   ========================================================= */
import { auth } from './firebase.js';
import { onAuthStateChanged, signOut }
  from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';

const root = document.documentElement;

function toInfo(user) {
  if (!user) return null;
  const name = (user.displayName || user.email || 'Account').trim();
  const parts = name.split(/\s+/).filter(Boolean);
  const initials = (
    (parts[0] ? parts[0][0] : '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')
  ).toUpperCase() || '?';
  return { name, firstName: parts[0] || name, initials, email: user.email || '' };
}

function paint(info) {
  root.dataset.auth = info ? 'in' : 'out';
  document.querySelectorAll('[data-user-initials]').forEach((el) => { el.textContent = info ? info.initials : ''; });
  document.querySelectorAll('[data-user-name]').forEach((el) => { el.textContent = info ? info.name : ''; });
}

onAuthStateChanged(auth, (user) => {
  const info = toInfo(user);
  window.afxUser = info;                                            // null = signed out
  paint(info);
  window.dispatchEvent(new CustomEvent('afx-auth', { detail: info })); // the mobile menu listens for this
});

window.afxLogout = async () => {
  try { await signOut(auth); } finally { location.href = 'index.html'; }
};

/* ---------- desktop profile dropdown ---------- */
const btn = document.getElementById('profile-btn');
const menu = document.getElementById('profile-menu');

function setOpen(open) {
  if (!btn || !menu) return;
  menu.hidden = !open;
  btn.setAttribute('aria-expanded', String(open));
}
if (btn && menu) {
  btn.addEventListener('click', (e) => { e.stopPropagation(); setOpen(menu.hidden); });
  document.addEventListener('click', (e) => { if (!menu.hidden && !menu.contains(e.target)) setOpen(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { setOpen(false); btn.focus(); } });
}
const logout = document.getElementById('logout-btn');
if (logout) logout.addEventListener('click', () => window.afxLogout());