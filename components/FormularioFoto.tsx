'use client';

import { useState, useEffect, useRef } from 'react';
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

  // Referencia para activar el input oculto de la cámara
  const inputCamaraRef = useRef<HTMLInputElement>(null);

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

  // Manejador para capturar la foto de la cámara
  const handleCamaraChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImagen(e.target.files[0]);
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
              {/* Contenedor Flex para alinear el Selector y el nuevo botón de Cámara */}
              <div className="flex items-end gap-2 w-full">
                <div className="flex-1">
                  <SelectorImagen imagenSeleccionada={imagen} onImagenSeleccionada={setImagen} />
                </div>

                {/* Botón Cuadrado de Cámara */}
                <button
                    type="button"
                    onClick={() => inputCamaraRef.current?.click()}
                    className="flex items-center justify-center h-[46px] w-[46px] border border-black rounded-xl hover:bg-gray-50 transition-colors bg-white shadow-sm flex-shrink-0"
                    title="Hacer foto con la cámara"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-gray-700">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
                  </svg>
                </button>

                {/* Input de tipo archivo Oculto configurado para Cámara */}
                <input
                    type="file"
                    ref={inputCamaraRef}
                    onChange={handleCamaraChange}
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                />
              </div>

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