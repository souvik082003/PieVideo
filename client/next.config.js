/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    // Excalidraw uses dynamic imports that need transpilation
    transpilePackages: ['@excalidraw/excalidraw'],
    webpack: (config) => {
        // Fix for Excalidraw's usage of node: protocol imports
        config.resolve.fallback = {
            ...config.resolve.fallback,
            fs: false,
            path: false,
        };
        return config;
    },
};

module.exports = nextConfig;
