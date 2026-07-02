'use client';

import { useState, useEffect } from 'react';
import { db, storage, auth } from '../app/firebaseConfig';
import { collection, addDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { onAuthStateChanged, User } from 'firebase/auth';
import { useMap } from 'react-leaflet';
import SelectorImagen from './SelectorImagen';

interface FormularioFotoProps {
  lat: number;
  lng: number;
  onCancelar: () => void;
  onSubiendoChange: (subiendo: boolean) => void;
}

export default function FormularioFoto({ lat, lng, onCancelar, onSubiendoChange }: FormularioFotoProps) {
  const [descripcion, setDescripcion] = useState('');
  const [imagen, setImagen] = useState<File | null>(null);
  const [usuario, setUsuario] = useState<User | null>(null);
  const [cargandoAuth, setCargandoAuth] = useState(true);
  const [progreso, setProgreso] = useState(0);

  const mapa = useMap();

  useEffect(() => {
    if (mapa) {
      const timer = setTimeout(() => mapa.invalidateSize(), 100);
      return () => clearTimeout(timer);
    }
  }, [mapa, usuario, imagen]);

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
              const url = await getDownloadURL(tarea.snapshot.ref);
              resolve(url);
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
      alert("🛑 Error: ¡Debes iniciar sesión con Google para publicar!");
      return;
    }
    if (!imagen) {
      alert("⚠️ Por favor, selecciona una imagen primero.");
      return;
    }

    onSubiendoChange(true);
    setProgreso(0);

    const timeoutId = setTimeout(() => {
      onSubiendoChange(false);
      alert('🛑 La publicación está tardando demasiado. Inténtalo de nuevo.');
    }, 30000);

    try {
      const urlPublicaFoto = await subirImagenConProgreso(imagen);

      await addDoc(collection(db, "marcadores"), {
        coordenadas: { latitude: lat, longitude: lng },
        descripcion,
        urlFoto: urlPublicaFoto,
        fechaCreacion: Date.now(),
        usuarioNombre: usuario.displayName || "Usuario de Google",
        usuarioId: usuario.uid,
      });

      clearTimeout(timeoutId);
      onSubiendoChange(false);

      if (mapa && typeof mapa.closePopup === 'function') {
        mapa.closePopup();
      }
      setTimeout(() => onCancelar(), 350);

    } catch (error: any) {
      clearTimeout(timeoutId);
      onSubiendoChange(false);
      console.error("🛑 Error crítico al publicar:", error?.code, error?.message, error);
      alert(`🛑 Hubo un error al guardar tu rincón: ${error?.code || ''} ${error.message || error}`);
    }
  };

  if (cargandoAuth) {
    return <p className="text-xs text-gray-500 p-2 font-medium">Verificando permisos...</p>;
  }

  return (
      <form onSubmit={handleGuardar} className="p-0.5 w-full max-w-full w-[310px] sm:w-[350px] flex flex-col gap-3 text-gray-800">
        <h3 className="font-bold text-sm border-b pb-1.5 text-gray-900">Añadir nuevo rincón</h3>

        <p className="text-[10px] text-gray-400 font-mono">
          Lat: {lat.toFixed(4)} | Lng: {lng.toFixed(4)}
        </p>

        {!usuario ? (
            <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl flex flex-col gap-1.5">
              <p className="text-xs font-bold">🔒 Acceso denegado</p>
              <p className="text-[11px] leading-tight">Inicia sesión con Google arriba para poder publicar.</p>
              <button type="button" onClick={onCancelar} className="text-left text-[11px] text-red-800 underline font-medium mt-1">
                Cancelar
              </button>
            </div>
        ) : (
            <>
              <SelectorImagen imagenSeleccionada={imagen} onImagenSeleccionada={setImagen} />

              <div>
                <label className="block text-xs font-semibold mb-1 text-gray-700">Comentario / Descripción:</label>
                <textarea
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    placeholder="¿Qué hace especial a este sitio?..."
                    className="w-full text-xs p-2 border rounded-xl focus:outline-blue-500 resize-none h-16 disabled:opacity-50"
                    required
                />
              </div>

              {progreso > 0 && progreso < 100 && (
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div className="bg-blue-600 h-1.5 rounded-full transition-all" style={{ width: `${progreso}%` }} />
                  </div>
              )}

              <div className="flex gap-2 justify-end mt-1">
                <button type="button" onClick={onCancelar} className="px-2.5 py-1 text-xs font-medium text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
                  Cancelar
                </button>
                <button type="submit" className="px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
                  Publicar
                </button>
              </div>
            </>
        )}
      </form>
  );
}