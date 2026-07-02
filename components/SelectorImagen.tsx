'use client';

import { useRef } from 'react';

interface SelectorImagenProps {
    imagenSeleccionada: File | null;
    onImagenSeleccionada: (file: File | null) => void;
}

export default function SelectorImagen({ imagenSeleccionada, onImagenSeleccionada }: SelectorImagenProps) {
    const inputRef = useRef<HTMLInputElement>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onImagenSeleccionada(e.target.files?.[0] || null);
    };

    const previewUrl = imagenSeleccionada ? URL.createObjectURL(imagenSeleccionada) : null;

    return (
        <div className="flex flex-col gap-2">
            <label className="block text-xs font-semibold text-gray-700">Foto:</label>

            {previewUrl ? (
                <div className="relative w-full h-40 rounded-xl border border-gray-200 overflow-hidden bg-gray-50 shadow-sm">
                    <img src={previewUrl} alt="Vista previa" className="w-full h-full object-cover" />
                    <button
                        type="button"
                        onClick={() => onImagenSeleccionada(null)}
                        className="absolute top-2 right-2 bg-black/70 hover:bg-black/90 text-white text-[11px] rounded-full w-6 h-6 flex items-center justify-center transition-colors shadow-md"
                    >
                        ✕
                    </button>
                </div>
            ) : (
                <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    className="w-full flex items-center justify-center gap-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl py-3 border border-dashed border-blue-300 transition-colors"
                >
                    🖼️ Añadir imagen
                </button>
            )}

            {/* Un único input: el navegador/móvil decidirá nativamente si usar cámara o galería */}
            <input
                ref={inputRef}
                type="file"
                accept="image/*"
                onChange={handleChange}
                className="hidden"
            />
        </div>
    );
}