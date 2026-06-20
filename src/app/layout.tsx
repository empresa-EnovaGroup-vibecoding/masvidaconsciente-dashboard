import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-nunito",
  display: "swap",
});

export const metadata: Metadata = {
  title: "masvidaconsciente — Panel",
  description: "Panel de gestión de masvidaconsciente",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={nunito.variable}>
      <body style={{ fontFamily: "var(--font-nunito), system-ui, sans-serif" }}>{children}</body>
    </html>
  );
}
