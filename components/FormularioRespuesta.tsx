'use client';

import { useState, useEffect } from 'react';
import { db, storage, auth } from '../app/firebaseConfig';
import { collection, addDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { onAuthStateChanged, User } from 'firebase/auth';
import SelectorImagen from './SelectorImagen';

interface FormularioRespuestaProps {
    marcadorId: string;
    onCancelar: () => void;
    onSubiendoChange: (subiendo: boolean) => void;
}

export default function FormularioRespuesta({ marcadorId, onCancelar, onSubiendoChange }: FormularioRespuestaProps) {
    const [descripcion, setDescripcion] = useState('');
    const [imagen, setImagen] = useState<File | null>(null);
    const [usuario, setUsuario] = useState<User | null>(null);
    const [cargandoAuth, setCargandoAuth] = useState(true);
    const [progreso, setProgreso] = useState(0);

    useEffect(() => {
        const desuscribir = onAuthStateChanged(auth, (user) => {
            setUsuario(user);
            setCargandoAuth(false);
        });
        return () => desuscribir();
    }, []);

    const subirImagenConProgreso = (archivo: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const nombreArchivo = `${Date.now()}_${archivo.name}`;
            const referenciaAlmacenamiento = ref(storage, `fotos_mapa/${nombreArchivo}`);
            const tarea = uploadBytesResumable(referenciaAlmacenamiento, archivo);

            tarea.on(
                'state_changed',
                (snapshot) => setProgreso((snapshot.bytesTransferred / snapshot.totalBytes) * 100),
                (error) => reject(error),
                async () => {
                    try {
                        resolve(await getDownloadURL(tarea.snapshot.ref));
                    } catch (err) {
                        reject(err);
                    }
                }
            );
        });
    };

    const handleGuardar = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!usuario) {
            alert("🛑 Debes iniciar sesión con Google para comentar.");
            return;
        }
        if (!imagen) {
            alert("⚠️ Selecciona una imagen primero.");
            return;
        }

        onSubiendoChange(true);
        setProgreso(0);

        const timeoutId = setTimeout(() => {
            onSubiendoChange(false);
            alert('🛑 Está tardando demasiado. Inténtalo de nuevo.');
        }, 30000);

        try {
            const urlPublicaFoto = await subirImagenConProgreso(imagen);

            await addDoc(collection(db, "marcadores", marcadorId, "respuestas"), {
                descripcion,
                urlFoto: urlPublicaFoto,
                fechaCreacion: Date.now(),
                usuarioNombre: usuario.displayName || "Usuario de Google",
                usuarioId: usuario.uid,
            });

            clearTimeout(timeoutId);
            onSubiendoChange(false);
            onCancelar();

        } catch (error: any) {
            clearTimeout(timeoutId);
            onSubiendoChange(false);
            console.error("🛑 Error al comentar:", error?.code, error?.message, error);
            alert(`🛑 Hubo un error: ${error?.code || ''} ${error.message || error}`);
        }
    };

    if (cargandoAuth) {
        return <p className="text-xs text-gray-500 p-1">Verificando permisos...</p>;
    }

    if (!usuario) {
        return (
            <div className="bg-red-50 border border-red-200 text-red-700 p-2 rounded-xl flex flex-col gap-1.5 mt-2">
                <p className="text-[11px] leading-tight">Inicia sesión con Google arriba para poder comentar aquí.</p>
                <button type="button" onClick={onCancelar} className="text-left text-[11px] text-red-800 underline font-medium">
                    Cerrar
                </button>
            </div>
        );
    }

    return (
        <form onSubmit={handleGuardar} className="mt-2 pt-3 border-t flex flex-col gap-2.5 text-gray-800">
            <SelectorImagen imagenSeleccionada={imagen} onImagenSeleccionada={setImagen} />

            <textarea
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Añade tu comentario sobre este sitio..."
                className="w-full text-xs p-2 border rounded-xl focus:outline-blue-500 resize-none h-14"
                required
            />

            {progreso > 0 && progreso < 100 && (
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div className="bg-blue-600 h-1.5 rounded-full transition-all" style={{ width: `${progreso}%` }} />
                </div>
            )}

            <div className="flex gap-2 justify-end">
                <button type="button" onClick={onCancelar} className="px-2.5 py-1 text-xs font-medium text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
                    Cancelar
                </button>
                <button type="submit" className="px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
                    Publicar
                </button>
            </div>
        </form>
    );
}