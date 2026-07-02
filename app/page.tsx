'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { auth, googleProvider } from './firebaseConfig';
import { signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';

// Esta es la única forma en la que page.tsx debe ver al mapa:
// Lo carga de forma dinámica y le dice a Next.js: "¡No intentes procesar esto en el servidor! (ssr: false)"
const MapaInteractivo = dynamic(
    () => import('../components/MapaInteractivo'),
    {
        ssr: false,
        loading: () => (
            <div className="w-full h-[calc(100vh-64px)] bg-gray-100 flex items-center justify-center">
                <p className="text-gray-500 font-medium animate-pulse">Cargando mapa interactivo...</p>
            </div>
        )
    }
);

export default function Home() {
    const [usuario, setUsuario] = useState<User | null>(null);

    useEffect(() => {
        const desuscribir = onAuthStateChanged(auth, (user) => {
            setUsuario(user);
        });
        return () => desuscribir();
    }, []);

    const loginConGoogle = async () => {
        try {
            const resultado = await signInWithPopup(auth, googleProvider);
            setUsuario(resultado.user);
        } catch (error) {
            console.error("Error al iniciar sesión:", error);
        }
    };

    const cerrarSesion = async () => {
        await signOut(auth);
        setUsuario(null);
    };

    return (
        <div className="min-h-screen bg-white flex flex-col">
            {/* Navbar */}
            <header className="h-16 w-full border-b flex items-center justify-between px-4 sm:px-6 z-10 bg-white shadow-sm">
                <div className="flex items-center gap-2">
                    {/* MODIFICACIÓN: Cambiamos el <span className="text-xl">📍</span> por tu imagen .jfif */}
                    <img
                        src="/todoalron.png"
                        alt="Todo al Ron Logo"
                        className="w-15 h-15 rounded-full border border-gray-200 object-cover"
                        referrerPolicy="no-referrer"
                    />
                    <h1 className="font-bold text-lg text-gray-900 tracking-tight">Todo al Ron</h1>
                </div>

                {usuario ? (
                    <div className="flex items-center gap-3">
                        <img
                            src={usuario.photoURL || ""}
                            alt="Avatar de Google"
                            className="w-8 h-8 rounded-full border border-gray-200 object-cover"
                            referrerPolicy="no-referrer"
                        />
                        <span className="text-sm font-medium hidden md:inline text-gray-700">
              {usuario.displayName}
            </span>
                        <button
                            onClick={cerrarSesion}
                            className="text-xs text-red-600 hover:underline font-medium border border-red-200 bg-red-50 px-2 py-1 rounded-md hover:bg-red-100 transition"
                        >
                            Cerrar sesión
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={loginConGoogle}
                        className="flex items-center gap-2 border px-3 py-1.5 rounded-lg shadow-sm hover:bg-gray-50 transition text-sm font-medium text-gray-700"
                    >
                        <img src="https://docs.idmod.org/images/Google_Icons-09-512.png" alt="Google" className="w-4 h-4 object-contain" />
                        <span>Iniciar sesión con Google</span>
                    </button>
                )}
            </header>

            {/* Contenedor del Mapa */}
            <main className="flex-1">
                <MapaInteractivo />
            </main>
        </div>
    );
}