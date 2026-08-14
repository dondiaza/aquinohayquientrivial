import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    // El motor de juego vive en /src/domain y se comparte entre servidor y cliente.
    // No necesita transpilación especial, pero dejamos el hueco documentado para Fase 3
    // (cuando el mismo motor corra en un worker/servidor autoritativo).
  },
};

export default nextConfig;
