// Firebase configuration and initialization
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBNYwM7ySCuyog04dJrWugBig41qh2Pu4U",
  authDomain: "kantan-d6e74.firebaseapp.com",
  projectId: "kantan-d6e74",
  storageBucket: "kantan-d6e74.firebasestorage.app",
  messagingSenderId: "199639000224",
  appId: "1:199639000224:web:662872c3eeb09b24e555c5",
  measurementId: "G-658L3RPXFZ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;