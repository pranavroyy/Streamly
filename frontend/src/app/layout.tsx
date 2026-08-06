import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Providers from "@/components/providers";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
  preload: true,
});

export const viewport: Viewport = {
  themeColor: "#09090b",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "Streamly - Browser-based Podcast Recording Studio",
  description: "Record high-quality local audio & video directly from your browser, inspired by Riverside.fm.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="dns-prefetch" href="http://localhost:8080" />
      </head>
      <body className={`${inter.variable} font-sans antialiased bg-[#09090b] text-zinc-100 min-h-screen`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
