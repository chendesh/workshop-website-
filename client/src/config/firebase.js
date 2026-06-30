import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBFF0TgYUcC5CJV5_7uT6FYOk91Tu8Qh-s",
  authDomain: "chess-4eb33.firebaseapp.com",
  projectId: "chess-4eb33",
  storageBucket: "chess-4eb33.firebasestorage.app",
  messagingSenderId: "857998148173",
  appId: "1:857998148173:web:f411b9cb03b6fe55c81204",
  measurementId: "G-R7XKX170S7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
