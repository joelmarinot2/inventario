import type { Metadata, Viewport } from "next";
import "./globals.css";
import { RegistrarSW } from "@/components/registrar-sw";

export const metadata: Metadata = {
  title: "Inventario y ventas",
  description: "Control de inventario y ventas diarias del negocio.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Inventario",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#1e40af",
  width: "device-width",
  initialScale: 1,
  // No se limita el zoom: la accesibilidad manda.
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-CO">
      <body>
        {children}
        <RegistrarSW />
      </body>
    </html>
  );
}
