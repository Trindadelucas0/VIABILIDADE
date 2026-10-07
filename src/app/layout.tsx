import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Viabilidade",
  description: "Coleta e análise de produtos na feira.",
  applicationName: "Viabilidade",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Viabilidade", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#0b3a82",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
