import type { Metadata, Viewport } from "next";
import "./globals.css";
import { RegistrarSW } from "@/components/registrar-sw";

export const metadata: Metadata = {
  metadataBase: new URL("https://achirasapp.vercel.app"),
  title: "Achirapp",
  description: "Achirapp — inventario y ventas de la fábrica de achiras.",
  applicationName: "Achirapp",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Achirapp",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/apple-touch-icon.png",
  },
  openGraph: {
    type: "website",
    siteName: "Achirapp",
    title: "Achirapp",
    description: "Inventario y ventas de la fábrica de achiras.",
    url: "/",
    locale: "es_CO",
    images: [
      { url: "/icons/icon-512.png", width: 512, height: 512, alt: "Achirapp" },
    ],
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
