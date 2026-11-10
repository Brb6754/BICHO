/** @type {import('next').NextConfig} */
const nextConfig = {
  // El logo del dueño (/dashboard/marca) sube por server action, hasta
  // 2 MB + el resto del FormData. El default de Next es 1 MB.
  experimental: {
    serverActions: { bodySizeLimit: '3mb' },
  },
  // El embedder del copiloto carga binarios nativos (onnxruntime-node):
  // no se empaquetan, se requieren en runtime.
  serverExternalPackages: ["@huggingface/transformers", "onnxruntime-node", "postgres"],
  // onnxruntime-node carga su binario con un require dinámico que el
  // trazador de Vercel no ve, y la función salía sin él ("Cannot find
  // module"). Se incluye a mano y SOLO el de linux-x64 (45 MB): el paquete
  // completo trae los de todas las plataformas (288 MB) y rebasaría el
  // límite de 250 MB por función.
  outputFileTracingIncludes: {
    "/t/[slug]/dashboard/copiloto/api": [
      "./node_modules/onnxruntime-node/dist/**",
      "./node_modules/onnxruntime-node/package.json",
      "./node_modules/onnxruntime-node/bin/napi-v6/linux/x64/**",
      "./node_modules/onnxruntime-common/**",
    ],
    "/t/[slug]/dashboard/copiloto/documentos/api": [
      "./node_modules/onnxruntime-node/dist/**",
      "./node_modules/onnxruntime-node/package.json",
      "./node_modules/onnxruntime-node/bin/napi-v6/linux/x64/**",
      "./node_modules/onnxruntime-common/**",
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // Vercel already sets some of these at the edge, but not
          // reliably on every hosting target — setting them explicitly
          // here means they're correct regardless of where this ends up
          // deployed, self-hosted included.
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};

export default nextConfig;
