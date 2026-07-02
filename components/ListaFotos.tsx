'use client';

// Añadimos 'usuarioId' para sincronizar la firma de tipos con MapaInteractivo
interface MarcadorGuardado {
    id: string;
    coordenadas: { latitude: number; longitude: number };
    descripcion: string;
    urlFoto: string;
    usuarioNombre: string;
    usuarioId: string; // <-- Línea añadida
}

interface ListaFotosProps {
    marcadores: MarcadorGuardado[];
    onSeleccionar: (marcador: MarcadorGuardado) => void;
    onCerrar: () => void;
}

export default function ListaFotos({ marcadores, onSeleccionar, onCerrar }: ListaFotosProps) {
    return (
        <div className="fixed inset-0 z-[9998] bg-black/50 flex justify-end" onClick={onCerrar}>
            <div
                className="w-full sm:w-96 h-full bg-white flex flex-col shadow-xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between p-3 border-b">
                    <h2 className="font-bold text-gray-900 text-sm">📋 Todos los rincones ({marcadores.length})</h2>
                    <button onClick={onCerrar} className="text-gray-500 hover:text-gray-800 text-lg leading-none px-2">
                        ✕
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto divide-y">
                    {marcadores.length === 0 && (
                        <p className="text-xs text-gray-400 p-4 text-center">Todavía no hay fotos publicadas.</p>
                    )}
                    {marcadores.map((m) => (
                        <button
                            key={m.id}
                            onClick={() => onSeleccionar(m)}
                            className="w-full flex gap-3 p-3 hover:bg-gray-50 text-left"
                        >
                            <img
                                src={m.urlFoto}
                                alt=""
                                className="w-14 h-14 rounded-lg object-cover flex-shrink-0 border border-gray-200"
                                referrerPolicy="no-referrer"
                            />
                            <div className="flex flex-col min-w-0 justify-center">
                <span className="text-[10px] uppercase tracking-wider font-bold text-blue-600 truncate">
                  📍 {m.usuarioNombre}
                </span>
                                <p className="text-xs text-gray-700 line-clamp-2 break-words">{m.descripcion}</p>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}