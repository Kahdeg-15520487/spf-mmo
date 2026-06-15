import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { GameProvider } from "./game-context";
import { I18nProvider } from "./i18n";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SPF MMO - Shipping Food",
  description: "Multiplayer food delivery game — be a Shop, Buyer, or Shipper!",
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
      <body className="min-h-full bg-gradient-to-br from-orange-50 via-white to-red-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <I18nProvider>
          <GameProvider>{children}</GameProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
