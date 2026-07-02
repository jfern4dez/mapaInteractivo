import type { NextConfig } from "next";

// Detecta si estamos compilando en los servidores de GitHub Actions
const isGithubActions = process.env.GITHUB_ACTIONS === 'true';

const nextConfig: NextConfig = {
    output: 'export',
    images: {
        unoptimized: true,
    },
    // Solo aplica el basePath y assetPrefix si se compila en GitHub Pages
    basePath: isGithubActions ? '/mapainteractivo' : '',
    assetPrefix: isGithubActions ? '/mapainteractivo/' : '',
};

export default nextConfig;