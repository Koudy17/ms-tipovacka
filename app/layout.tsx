import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import EmailVerifyNotice from "@/components/EmailVerifyNotice";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://koudyho-tipovacka.vercel.app";
const DESCRIPTION = "Tipuj výsledky Premier League s přáteli. Živá tabulka, bodování, celá sezóna 2026/27.";

export const viewport: Viewport = {
  themeColor: "#0f172a",
};

export const metadata: Metadata = {
  title: "Premier League Tipovačka",
  description: DESCRIPTION,
  icons: { icon: "/api/icon?size=192", apple: "/api/icon?size=180" },
  appleWebApp: { capable: true, title: "PL Tipovačka", statusBarStyle: "black-translucent" },
  openGraph: {
    title: "Premier League Tipovačka ⚽",
    description: DESCRIPTION,
    url: SITE_URL,
    siteName: "Premier League Tipovačka",
    locale: "cs_CZ",
    type: "website",
    images: [{ url: `${SITE_URL}/api/og`, width: 1200, height: 630 }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="cs"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <EmailVerifyNotice />
        {children}
      </body>
    </html>
  );
}
