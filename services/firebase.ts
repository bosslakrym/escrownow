
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBGTRkxz8vmYEOMlC-bhFg6W_6Rf14lVDI",
  authDomain: "escrow-ede90.firebaseapp.com",
  projectId: "escrow-ede90",
  storageBucket: "escrow-ede90.firebasestorage.app",
  messagingSenderId: "12428991842",
  appId: "1:12428991842:web:64c8beda58c7d60291203b"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
