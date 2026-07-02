import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    output: 'export',
    images: {
        unoptimized: true,
    },
    // Requerido para la navegación interna de Next.js
    basePath: '/mapainteractivo',
    // SOLUCIÓN DEFINITIVA: Requerido para que los archivos CSS y JS carguen en GitHub Pages
    assetPrefix: '/mapainteractivo/',
};

export default nextConfig;