import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import "./globals.css";

export const metadata: Metadata = {
  title: "masvidaconsciente — Panel",
  description: "Panel de gestión de masvidaconsciente",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={GeistSans.variable}>
      <body style={{ fontFamily: "var(--font-geist), system-ui, sans-serif" }}>{children}</body>
    </html>
  );
}
