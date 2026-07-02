
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
    apiKey: "AIzaSyCwt4ieIqq4oJndmqYeCKwSRiqgjDT17Vo",
    authDomain: "todoalron-34837.firebaseapp.com",
    projectId: "todoalron-34837",
    storageBucket: "todoalron-34837.firebasestorage.app", // 👈 Si en tu consola termina en .appspot.com, cámbialo aquí
    messagingSenderId: "967697365764",
    appId: "1:967697365764:web:dceb44989255f479c86e51",
    measurementId: "G-HG94K0KDXF"
};

// Inicializar la App asegurando que no se duplique en Next.js
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// 🛠️ CAMBIO EXACTO AQUÍ: Forzamos la inicialización limpia de Storage
export const storage = getStorage(app);