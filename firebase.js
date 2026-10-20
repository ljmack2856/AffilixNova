// =========================================================
// AfflixNova — Firebase initialization
// Firebase JS SDK 13.0.0
// Plain HTML/CSS/JS project — CDN browser modules
// =========================================================

import { initializeApp } from
    "https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js";

import { getAuth } from
    "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";

import { getFirestore } from
    "https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js";


// ---------------------------------------------------------
// YOUR FIREBASE CONFIG
// Keep the values from your Firebase console.
// ---------------------------------------------------------

const firebaseConfig = {
  apiKey: "AIzaSyAMK-Ooa8h7rGyERrTmB0t6p1ZzDDnfBfI",
  authDomain: "afflixnova.firebaseapp.com",
  projectId: "afflixnova",
  storageBucket: "afflixnova.firebasestorage.app",
  messagingSenderId: "527587459042",
  appId: "1:527587459042:web:d634041eafdb75f36f03bb",
  measurementId: "G-JQSQB5RS2F"
};

// ---------------------------------------------------------
// INITIALIZE FIREBASE
// ---------------------------------------------------------

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);