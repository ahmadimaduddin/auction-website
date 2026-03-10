import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// 1. Your Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyC_XJQt_utqGujhSEnpV1HyCO_PZAwsV3g",
  authDomain: "dicoding-auction.firebaseapp.com",
  projectId: "dicoding-auction",
  storageBucket: "dicoding-auction.firebasestorage.app",
  messagingSenderId: "455586618782",
  appId: "1:455586618782:web:1ea2acc000508fc7dc8a8f",
  measurementId: "G-QEHLJ8M3XG"
};
// 2. Initialize Firebase
const app = initializeApp(firebaseConfig);

// 3. Export DB and Auth so the rest of the app can use them! (THIS IS WHAT WAS MISSING)
export const db = getFirestore(app);
export const auth = getAuth(app);