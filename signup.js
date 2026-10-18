/* =========================================================
   AfflixNova — signup.js

   ASSUMES your ./firebase.js exports:
     export const auth = getAuth(app);
     export const db   = getFirestore(app);
   and that it loads Firebase from the same CDN version used in the
   two imports below (change FB_VERSION in BOTH files if you differ).
   ========================================================= */
import { auth, db } from './firebase.js';
import {
  createUserWithEmailAndPassword, updateProfile, sendEmailVerification, onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import { doc, runTransaction, serverTimestamp }
  from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

const TERMS_VERSION = '2026-10';   // bump when you publish new Terms / Privacy text
const NEXT_PAGE = 'index.html';    // change to 'dashboard.html' once that page exists

const COUNTIES = [
  'Baringo','Bomet','Bungoma','Busia','Elgeyo-Marakwet','Embu','Garissa','Homa Bay','Isiolo','Kajiado',
  'Kakamega','Kericho','Kiambu','Kilifi','Kirinyaga','Kisii','Kisumu','Kitui','Kwale','Laikipia','Lamu',
  'Machakos','Makueni','Mandera','Marsabit','Meru','Migori','Mombasa',"Murang'a",'Nairobi','Nakuru','Nandi',
  'Narok','Nyamira','Nyandarua','Nyeri','Samburu','Siaya','Taita-Taveta','Tana River','Tharaka-Nithi',
  'Trans Nzoia','Turkana','Uasin Gishu','Vihiga','Wajir','West Pokot'
];

const form = document.getElementById('signup-form');
const submitBtn = document.getElementById('submit');
const formError = document.getElementById('form-error');
let submitting = false;

/* ---------- county list ---------- */
const countySelect = document.getElementById('county');
COUNTIES.forEach((c) => countySelect.add(new Option(c, c)));

/* ---------- password show / hide ---------- */
const pw = document.getElementById('password');
const pwToggle = document.getElementById('pw-toggle');
pwToggle.addEventListener('click', () => {
  const show = pw.type === 'password';
  pw.type = show ? 'text' : 'password';
  pwToggle.textContent = show ? 'Hide' : 'Show';
  pwToggle.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
  pwToggle.setAttribute('aria-pressed', String(show));
});

/* ---------- helpers ---------- */
// Accepts 07XX XXX XXX, 01XX XXX XXX, +2547XXXXXXXX, 2547XXXXXXXX. Returns 2547XXXXXXXX or null.
function normalizeMpesa(raw) {
  const s = String(raw).replace(/[\s\-().]/g, '');
  const m = s.match(/^(?:\+?254|0)([17]\d{8})$/);
  return m ? '254' + m[1] : null;
}

const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';   // no 0/O/1/I/L to avoid mix-ups
function randomChars(n) {
  const buf = new Uint32Array(n);
  crypto.getRandomValues(buf);
  return Array.from(buf, (v) => ALPHABET[v % ALPHABET.length]).join('');
}
// e.g. "JOH-K7M2" (first 3 letters of the name + 4 random characters)
function makeCode(fullName) {
  const letters = fullName.toUpperCase().replace(/[^A-Z]/g, '');
  return letters.slice(0, 3).padEnd(3, 'X') + '-' + randomChars(4);
}

function collect() {
  const val = (id) => document.getElementById(id).value.trim();
  const checked = (name) => [...form.querySelectorAll(`input[name="${name}"]:checked`)].map((i) => i.value);
  return {
    fullName: val('fullName').replace(/\s+/g, ' '),
    email: val('email').toLowerCase(),
    password: pw.value,
    county: countySelect.value,
    city: val('city'),
    mpesa: val('mpesa'),
    platforms: checked('platforms'),
    categories: checked('categories'),
    over18: document.getElementById('over18').checked,
    terms: document.getElementById('terms').checked
  };
}

function validate(v) {
  const e = {};
  if (!/^\S+(\s\S+)+$/.test(v.fullName)) e.fullName = 'Enter your first and last name.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email)) e.email = 'Enter a valid email address.';
  if (v.password.length < 8) e.password = 'Use at least 8 characters.';
  if (!COUNTIES.includes(v.county)) e.county = 'Choose your county.';
  if (v.city.length < 2) e.city = 'Enter your nearest city or town.';
  if (!normalizeMpesa(v.mpesa)) e.mpesa = 'Enter a valid M-Pesa number, like 0712 345 678.';
  if (!v.platforms.length) e.platforms = 'Choose at least one platform.';
  if (!v.categories.length) e.categories = 'Choose at least one category.';
  if (!v.over18) e.over18 = 'You must be 18 or older to join.';
  if (!v.terms) e.terms = 'Please agree to the Terms and the Privacy Policy.';
  return e;
}

function clearErrors() {
  form.querySelectorAll('.err').forEach((p) => { p.textContent = ''; });
  form.querySelectorAll('.invalid').forEach((el) => el.classList.remove('invalid'));
  formError.hidden = true;
  formError.textContent = '';
}

function showErrors(errors) {
  Object.entries(errors).forEach(([name, msg]) => {
    document.getElementById('err-' + name).textContent = msg;
    const holder = form.querySelector(`[data-field="${name}"]`);
    if (holder) holder.classList.add('invalid');
  });
  const first = form.querySelector('.invalid');
  if (first) {
    const focusable = first.matches('input, select') ? first : first.querySelector('input, select');
    if (focusable) focusable.focus({ preventScroll: true });
    first.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

function showFormError(msg) {
  formError.textContent = msg;
  formError.hidden = false;
  formError.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function setBusy(busy) {
  submitBtn.disabled = busy;
  submitBtn.textContent = busy ? 'Creating your account…' : 'Create my account';
}

function friendly(err) {
  switch (err && err.code) {
    case 'auth/email-already-in-use': return 'An account with this email already exists. Try logging in instead.';
    case 'auth/invalid-email': return 'That email address does not look right.';
    case 'auth/weak-password': return 'Choose a stronger password of at least 8 characters.';
    case 'auth/network-request-failed': return 'No connection. Check your internet and try again.';
    case 'auth/too-many-requests': return 'Too many attempts. Please wait a moment and try again.';
    case 'permission-denied': return 'We could not save your details. Please try again, and contact us if it keeps happening.';
    case 'code-unavailable': return 'We could not create your personal code. Please try again.';
    default: return 'Something went wrong. Please try again.';
  }
}

/* ---------- Firestore: profile + a unique personal code, saved together ---------- */
async function createProfile(uid, v) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const code = makeCode(v.fullName);
    const codeRef = doc(db, 'codes', code);
    const userRef = doc(db, 'users', uid);
    try {
      await runTransaction(db, async (tx) => {
        const taken = await tx.get(codeRef);
        if (taken.exists()) throw Object.assign(new Error('taken'), { code: 'code-taken' });
        tx.set(codeRef, { uid, createdAt: serverTimestamp() });
        tx.set(userRef, {
          fullName: v.fullName,
          email: v.email,
          mpesa: normalizeMpesa(v.mpesa),
          county: v.county,
          city: v.city,
          platforms: v.platforms,
          categories: v.categories,
          code,
          over18: true,
          termsAcceptedAt: serverTimestamp(),
          termsVersion: TERMS_VERSION,
          status: 'active',
          createdAt: serverTimestamp()
        });
      });
      return code;
    } catch (err) {
      if (err.code !== 'code-taken') throw err;   // anything else is a real error
    }
  }
  throw Object.assign(new Error('no code'), { code: 'code-unavailable' });
}

/* ---------- submit ---------- */
form.addEventListener('submit', async (ev) => {
  ev.preventDefault();
  if (submitting) return;
  clearErrors();

  const v = collect();
  const errors = validate(v);
  if (Object.keys(errors).length) { showErrors(errors); return; }

  submitting = true;
  setBusy(true);
  let cred = null;
  try {
    cred = await createUserWithEmailAndPassword(auth, v.email, v.password);
    await updateProfile(cred.user, { displayName: v.fullName });
    await createProfile(cred.user.uid, v);
    try { await sendEmailVerification(cred.user); } catch (_) { /* not critical */ }
    location.href = NEXT_PAGE;
  } catch (err) {
    // If the account was created but the profile could not be saved, undo it so they can retry cleanly.
    if (cred && cred.user) { try { await cred.user.delete(); } catch (_) { /* ignore */ } }
    showFormError(friendly(err));
    submitting = false;
    setBusy(false);
  }
});

// Already signed in? Skip the form.
onAuthStateChanged(auth, (user) => { if (user && !submitting) location.replace(NEXT_PAGE); });