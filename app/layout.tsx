import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "🏆 Bolão Brasil x Escócia — 24/06/2026",
  description: "Bolão online Brasil x Escócia — 24 de Junho de 2026 às 19h00. Valor da cota: R$ 5,00",
  openGraph: {
    title: "🏆 Bolão Brasil x Escócia — 24/06/2026",
    description: "Participe do bolão! Jogo dia 24/06 às 19h00. Cota: R$ 5,00 💰",
    type: "website",
    locale: "pt_BR",
  },
  twitter: {
    card: "summary",
    title: "🏆 Bolão Brasil x Escócia — 24/06/2026",
    description: "Participe do bolão! Jogo dia 24/06 às 19h00. Cota: R$ 5,00 💰",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
