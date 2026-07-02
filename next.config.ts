/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'export', // Obligatorio para generar HTML estático en /out para GitHub Pages
    images: {
        unoptimized: true, // Obligatorio para GitHub Pages
    },
    // Si tu repositorio en GitHub NO se llama "tu-usuario.github.io" 
    // (por ejemplo, si se llama "todo-al-ron-mapa"), descomenta la línea de abajo:
    // basePath: '/nombre-de-tu-repositorio',
};

module.exports = nextConfig;