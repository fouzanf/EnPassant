import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "EnPassant Proxy Control Panel",
  description: "Enterprise-grade AI proxy gateway",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} min-h-screen bg-slate-900 text-slate-50 antialiased selection:bg-emerald-500/30`}>
        {children}
      </body>
    </html>
  );
}
