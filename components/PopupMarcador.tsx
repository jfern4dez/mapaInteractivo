'use client';

import { useState, useEffect } from 'react';
import { db, storage, auth } from '../app/firebaseConfig';
import { collection, onSnapshot, query, orderBy, doc, deleteDoc, getDocs } from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import FormularioRespuesta from './FormularioRespuesta';

interface Respuesta {
    id: string;
    descripcion: string;
    urlFoto: string;
    usuarioNombre: string;
    fechaCreacion: number;
    usuarioId?: string;
}

interface PopupMarcadorProps {
    id: string;
    urlFoto: string;
    descripcion: string;
    usuarioNombre: string;
    usuarioId?: string;
    onSubiendoChange: (subiendo: boolean) => void;
}

export default function PopupMarcador({ id, urlFoto, descripcion, usuarioNombre, usuarioId, onSubiendoChange }: PopupMarcadorProps) {
    const [respuestas, setRespuestas] = useState<Respuesta[]>([]);
    const [mostrarForm, setMostrarForm] = useState(false);
    const usuarioActual = auth.currentUser;

    useEffect(() => {
        const q = query(collection(db, "marcadores", id, "respuestas"), orderBy("fechaCreacion", "asc"));
        const desuscribir = onSnapshot(q, (snapshot) => {
            const items: Respuesta[] = [];
            snapshot.forEach((doc) => {
                const data = doc.data();
                items.push({
                    id: doc.id,
                    descripcion: data.descripcion || "",
                    urlFoto: data.urlFoto || "",
                    usuarioNombre: data.usuarioNombre || "Anónimo",
                    fechaCreacion: data.fechaCreacion || 0,
                    usuarioId: data.usuarioId || ""
                });
            });
            setRespuestas(items);
        }, (error) => {
            console.error("Error al leer respuestas:", error);
        });
        return () => desuscribir();
    }, [id]);

    // SOLUCIÓN: Función para abrir la imagen en una nueva pestaña
    const abrirImagenEnNuevaPestana = (url: string) => {
        if (url) {
            window.open(url, '_blank');
        }
    };

    const handleEliminarMarcador = async () => {
        if (!confirm("¿Estás seguro de que deseas eliminar este rincón junto con todos sus comentarios de forma permanente?")) {
            return;
        }

        onSubiendoChange(true);

        try {
            const respuestasRef = collection(db, "marcadores", id, "respuestas");
            const respuestasSnapshot = await getDocs(respuestasRef);

            for (const docComentario of respuestasSnapshot.docs) {
                const dataComentario = docComentario.data();
                if (dataComentario.urlFoto) {
                    const refFotoComentario = ref(storage, dataComentario.urlFoto);
                    await deleteObject(refFotoComentario).catch((err) => {
                        console.warn("No se pudo borrar la foto del comentario en Storage:", err);
                    });
                }
                await deleteDoc(doc(db, "marcadores", id, "respuestas", docComentario.id));
            }

            if (urlFoto) {
                const refFotoPrincipal = ref(storage, urlFoto);
                await deleteObject(refFotoPrincipal).catch((err) => {
                    console.warn("La imagen principal no existía o no se pudo borrar:", err);
                });
            }

            await deleteDoc(doc(db, "marcadores", id));

        } catch (error) {
            console.error("Error crítico al eliminar la publicación:", error);
            alert("Ocurrió un error al intentar eliminar la publicación.");
        } finally {
            onSubiendoChange(false);
        }
    };

    return (
        <div className="flex flex-col gap-2 p-0.5 text-gray-800 max-w-full w-[290px] sm:w-[320px]">

            {/* Contenedor de la foto principal */}
            <div className="relative w-full overflow-hidden rounded-lg border border-gray-100 shadow-sm bg-gray-50 group">
                <img
                    src={urlFoto}
                    alt="Foto rincón"
                    className="w-full h-36 sm:h-44 object-cover cursor-pointer hover:opacity-95 transition-opacity"
                    referrerPolicy="no-referrer"
                    // SOLUCIÓN: Clic en la foto abre nueva pestaña
                    onClick={() => abrirImagenEnNuevaPestana(urlFoto)}
                />

                {/* Botón flotante para ver en grande */}
                <button
                    type="button"
                    // SOLUCIÓN: Clic en el botón abre nueva pestaña
                    onClick={() => abrirImagenEnNuevaPestana(urlFoto)}
                    className="absolute bottom-2 right-2 bg-black/60 hover:bg-black/80 text-white text-[10px] font-medium rounded px-1.5 py-0.5 transition-colors"
                >
                    🔍 Ampliar
                </button>

                {/* Botón de eliminar */}
                {usuarioActual && usuarioId && usuarioActual.uid === usuarioId && (
                    <button
                        type="button"
                        onClick={handleEliminarMarcador}
                        className="absolute top-2 right-2 bg-red-600/90 hover:bg-red-600 text-white text-[10px] font-bold rounded px-2 py-0.5 shadow transition-colors"
                        title="Eliminar publicación"
                    >
                        🗑️ Eliminar
                    </button>
                )}
            </div>

            <div className="flex flex-col gap-1">
                <span className="text-[9px] sm:text-[10px] uppercase tracking-wider font-bold text-blue-600">
                    📍 Por {usuarioNombre}
                </span>
                <p className="text-xs text-gray-700 font-medium leading-relaxed bg-gray-50 p-2 rounded border border-gray-100 whitespace-pre-line max-h-24 overflow-y-auto break-words">
                    "{descripcion}"
                </p>
            </div>

            {respuestas.length > 0 && (
                <div className="flex flex-col gap-2 mt-1 max-h-40 overflow-y-auto pr-0.5">
                    <span className="text-[9px] uppercase tracking-wider font-bold text-gray-400">
                        {respuestas.length} {respuestas.length === 1 ? 'comentario' : 'comentarios'} más
                    </span>
                    {respuestas.map((r) => (
                        <div key={r.id} className="flex gap-2 items-start border-t border-gray-100 pt-2">
                            {/* Imagen del comentario también interactiva */}
                            <img
                                src={r.urlFoto}
                                alt="Foto comentario"
                                className="w-20 h-20 rounded object-cover flex-shrink-0 border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
                                referrerPolicy="no-referrer"
                                // SOLUCIÓN: Clic en foto del comentario abre nueva pestaña
                                onClick={() => abrirImagenEnNuevaPestana(r.urlFoto)}
                            />
                            <div className="flex flex-col min-w-0">
                                <span className="text-[9px] font-bold text-blue-600 truncate">{r.usuarioNombre}</span>
                                <p className="text-[11px] text-gray-700 leading-snug break-words">{r.descripcion}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {mostrarForm ? (
                <FormularioRespuesta
                    marcadorId={id}
                    onCancelar={() => setMostrarForm(false)}
                    onSubiendoChange={onSubiendoChange}
                />
            ) : (
                <button
                    type="button"
                    onClick={() => setMostrarForm(true)}
                    className="mt-1 text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded py-1.5"
                >
                    ➕ Añadir tu foto y comentario aquí
                </button>
            )}
        </div>
    );
}