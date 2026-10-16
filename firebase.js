// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAMK-Ooa8h7rGyERrTmB0t6p1ZzDDnfBfI",
  authDomain: "afflixnova.firebaseapp.com",
  projectId: "afflixnova",
  storageBucket: "afflixnova.firebasestorage.app",
  messagingSenderId: "527587459042",
  appId: "1:527587459042:web:d634041eafdb75f36f03bb",
  measurementId: "G-JQSQB5RS2F"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);