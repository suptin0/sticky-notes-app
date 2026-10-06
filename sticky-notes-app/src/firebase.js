// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDujeBLjhzQdIKwRTy-PUUKALYqYiCdRUQ",
  authDomain: "my-sticky-notes-app-f2b24.firebaseapp.com",
  projectId: "my-sticky-notes-app-f2b24",
  storageBucket: "my-sticky-notes-app-f2b24.firebasestorage.app",
  messagingSenderId: "653155561258",
  appId: "1:653155561258:web:507d0c78cdf7720396f853"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);