'use client';

import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { db } from '../app/firebaseConfig';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import FormularioFoto from './FormularioFoto';
import PopupMarcador from './PopupMarcador';
import ListaFotos from './ListaFotos';

const iconEditor = typeof window !== 'undefined' ? new L.Icon({
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34]
}) : null;

const iconoUsuario = typeof window !== 'undefined' ? L.divIcon({
    html: `
    <div class="relative flex items-center justify-center w-6 h-6">
      <div class="absolute w-6 h-6 bg-blue-500 rounded-full opacity-40 animate-ping"></div>
      <div class="relative w-4 h-4 bg-blue-600 rounded-full border-2 border-white shadow-md"></div>
    </div>
  `,
    className: '',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -10]
}) : null;

// Interfaz exportada para que coincida exactamente con ListaFotos y evitar el error de la imagen 2
export interface MarcadorGuardado {
    id: string;
    coordenadas: { latitude: number; longitude: number };
    descripcion: string;
    urlFoto: string;
    usuarioNombre: string;
    usuarioId: string; // Asegura la consistencia de tipos
}

// SOLUCIÓN ESLINT: Estos componentes se declaran AQUÍ FUERA, nunca dentro de renderizado
function CapturadorMapa({ onListo }: { onListo: (mapa: L.Map) => void }) {
    const mapa = useMap();
    useEffect(() => {
        onListo(mapa);
    }, [mapa, onListo]);
    return null;
}

interface EventosMapaProps {
    globalSubiendo: boolean;
    setPosicionSeleccionada: (posicion: L.LatLng | null) => void;
}

function EventosMapa({ globalSubiendo, setPosicionSeleccionada }: EventosMapaProps) {
    useMapEvents({
        click(e) {
            if (!globalSubiendo) {
                setPosicionSeleccionada(e.latlng);
            }
        },
    });
    return null;
}

export default function MapaInteractivo() {
    const [posicionSeleccionada, setPosicionSeleccionada] = useState<L.LatLng | null>(null);
    const [marcadores, setMarcadores] = useState<MarcadorGuardado[]>([]);
    const [estaMontado, setEstaMontado] = useState(false);
    const [globalSubiendo, setGlobalSubiendo] = useState(false);
    const [mostrarLista, setMostrarLista] = useState(false);
    const [posicionUsuario, setPosicionUsuario] = useState<L.LatLng | null>(null);
    const [rastreando, setRastreando] = useState(false);

    const mapaRef = useRef<L.Map | null>(null);
    const referenciasMarcadores = useRef<{ [id: string]: L.Marker }>({});

    useEffect(() => {
        setEstaMontado(true);

        const q = query(collection(db, "marcadores"), orderBy("fechaCreacion", "desc"));

        const desuscribir = onSnapshot(q, (snapshot) => {
            const puntos: MarcadorGuardado[] = [];
            snapshot.forEach((doc) => {
                const data = doc.data();
                if (data && data.coordenadas) {
                    puntos.push({
                        id: doc.id,
                        coordenadas: data.coordenadas,
                        descripcion: data.descripcion || "",
                        urlFoto: data.urlFoto || "",
                        usuarioNombre: data.usuarioNombre || "Anónimo",
                        usuarioId: data.usuarioId || "",
                    });
                }
            });
            setMarcadores(puntos);
        }, (error) => {
            console.error("Error al leer datos en tiempo real de Firestore:", error);
        });

        return () => desuscribir();
    }, []);

    const crearIconoMiniatura = (urlFoto: string) => {
        if (typeof window === 'undefined' || !L) return null;

        return L.divIcon({
            html: `
        <div class="relative w-9 h-9 sm:w-10 sm:h-10 bg-white p-0.5 rounded-md shadow-md border border-gray-300 transform -translate-x-1/2 -translate-y-1/2 hover:scale-110 transition-transform duration-200">
          <img src="${urlFoto}" class="w-full h-full object-cover rounded-sm" referrerPolicy="no-referrer" />
          <div class="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 bg-white rotate-45 border-r border-b border-gray-300"></div>
        </div>
      `,
            className: '',
            iconSize: [40, 40],
            iconAnchor: [0, 0]
        });
    };

    const irAMarcador = (marcador: MarcadorGuardado) => {
        setMostrarLista(false);
        const mapa = mapaRef.current;
        if (!mapa) return;
        mapa.flyTo([marcador.coordenadas.latitude, marcador.coordenadas.longitude], 15, { duration: 0.8 });
        setTimeout(() => {
            referenciasMarcadores.current[marcador.id]?.openPopup();
        }, 850);
    };

    const localizarUsuario = () => {
        if (!navigator.geolocation) {
            alert("Tu navegador no soporta geolocalización.");
            return;
        }
        setRastreando(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                const miUbicacion = new L.LatLng(latitude, longitude);
                setPosicionUsuario(miUbicacion);
                setRastreando(false);
                if (mapaRef.current) {
                    mapaRef.current.flyTo(miUbicacion, 16, { duration: 1.2 });
                }
            },
            (error) => {
                setRastreando(false);
                alert("No se pudo acceder a tu ubicación. Activa el GPS y da permisos.");
            },
            { enableHighAccuracy: true, timeout: 8000 }
        );
    };

    if (!estaMontado) {
        return <div className="w-full h-[calc(100vh-64px)] bg-gray-100 animate-pulse" />;
    }

    return (
        <div className="w-full h-[calc(100vh-64px)] relative">
            <style jsx global>{`
                .leaflet-popup-content-wrapper {
                    max-width: min(94vw, 380px) !important;
                    border-radius: 16px;
                    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
                }
                .leaflet-popup-content {
                    width: auto !important;
                    margin: 12px !important;
                    max-height: 75vh;
                    overflow-y: auto;
                }
            `}</style>

            {globalSubiendo && (
                <div className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-md flex flex-col items-center justify-center gap-4 text-white p-4">
                    <div className="w-14 h-14 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="font-bold text-lg">Procesando cambios en el mapa...</p>
                </div>
            )}

            <button
                onClick={localizarUsuario}
                disabled={rastreando}
                className={`absolute bottom-20 right-5 z-[1000] bg-white text-gray-800 hover:bg-gray-100 rounded-full shadow-xl w-12 h-12 flex items-center justify-center text-xl border border-gray-200 active:scale-95 ${rastreando ? 'animate-pulse' : ''}`}
            >
                {rastreando ? '⏳' : '🎯'}
            </button>

            <button
                onClick={() => setMostrarLista(true)}
                className="absolute bottom-5 right-5 z-[1000] bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg w-12 h-12 flex items-center justify-center text-xl active:scale-95"
            >
                📋
            </button>

            {mostrarLista && (
                <ListaFotos
                    marcadores={marcadores}
                    onSeleccionar={irAMarcador}
                    onCerrar={() => setMostrarLista(false)}
                />
            )}

            <MapContainer center={[40.416775, -3.703790]} zoom={6} className="w-full h-full z-0">
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <EventosMapa
                    globalSubiendo={globalSubiendo}
                    setPosicionSeleccionada={setPosicionSeleccionada}
                />

                <CapturadorMapa onListo={(mapa) => { mapaRef.current = mapa; }} />

                {posicionUsuario && iconoUsuario && (
                    <Marker position={posicionUsuario} icon={iconoUsuario}>
                        <Popup><div className="text-center font-bold text-xs text-blue-700">🔵 ¡Estás aquí!</div></Popup>
                    </Marker>
                )}

                {marcadores.map((marcador) => {
                    const icono = crearIconoMiniatura(marcador.urlFoto);
                    if (!icono) return null;

                    return (
                        <Marker
                            key={marcador.id}
                            position={[marcador.coordenadas.latitude, marcador.coordenadas.longitude]}
                            icon={icono}
                            ref={(ref) => {
                                if (ref) referenciasMarcadores.current[marcador.id] = ref;
                            }}
                        >
                            <Popup closeOnClick={false} autoPanPadding={[30, 30]}>
                                <PopupMarcador
                                    id={marcador.id}
                                    urlFoto={marcador.urlFoto}
                                    descripcion={marcador.descripcion}
                                    usuarioNombre={marcador.usuarioNombre}
                                    usuarioId={marcador.usuarioId}
                                    onSubiendoChange={setGlobalSubiendo}
                                />
                            </Popup>
                        </Marker>
                    );
                })}

                {posicionSeleccionada && iconEditor && (
                    <Marker position={posicionSeleccionada} icon={iconEditor}>
                        <Popup closeOnClick={false} autoPanPadding={[30, 30]}>
                            <FormularioFoto
                                lat={posicionSeleccionada.lat}
                                lng={posicionSeleccionada.lng}
                                onCancelar={() => setPosicionSeleccionada(null)}
                                onSubiendoChange={setGlobalSubiendo}
                            />
                        </Popup>
                    </Marker>
                )}
            </MapContainer>
        </div>
    );
}