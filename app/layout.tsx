import type { Metadata, Viewport } from "next";
import { Fraunces, Nunito, Caveat } from "next/font/google";
import "./globals.css";
import { TimeOfDay } from "@/components/TimeOfDay";

const display = Fraunces({ subsets: ["latin"], variable: "--font-display", display: "swap" });
const body = Nunito({ subsets: ["latin"], variable: "--font-body", display: "swap" });
const hand = Caveat({ subsets: ["latin"], variable: "--font-hand", display: "swap" });

const LOCK_BOOT = `try{if(localStorage.getItem("uo-lock")&&!sessionStorage.getItem("uo-unlocked")){document.documentElement.setAttribute("data-lock","1")}}catch(e){}`;

export const metadata: Metadata = {
  title: "A Universe of Two",
  description: "A private space for two.",
  robots: { index: false, follow: false, noarchive: true, nosnippet: true },
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: "Universe", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#F9E4E8",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${display.variable} ${body.variable} ${hand.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: LOCK_BOOT }} />
      </head>
      <body>
        <TimeOfDay />
        {children}
      </body>
    </html>
  );
}
