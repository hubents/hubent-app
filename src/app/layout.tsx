import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import { SessionProvider } from "@/components/providers/session-provider";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "HubEnts - Wedding & Event Management",
  description: "Plataforma integral para gestión de bodas y eventos",
  icons: {
    icon: [
      { url: "/images/isotipo-dark.png", type: "image/png" },
    ],
    apple: [
      { url: "/images/isotipo-dark.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${dmSans.variable} antialiased`} suppressHydrationWarning>
        <SessionProvider>
          {children}
        </SessionProvider>
        <Analytics />
      </body>
    </html>
  );
}
