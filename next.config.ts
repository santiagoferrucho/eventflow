import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `next dev` genera AGENTS.md y CLAUDE.md por su cuenta; este proyecto no los usa.
  agentRules: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // La cámara (escáner de QR) y la ubicación (eventos cercanos) solo se
          // permiten para esta misma página; el micrófono nunca se usa.
          { key: "Permissions-Policy", value: "camera=(self), geolocation=(self), microphone=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
