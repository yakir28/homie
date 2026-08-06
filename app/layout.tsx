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
  title: "Homie — AI home tours for real estate",
  description: "Turn listing photos into polished property-tour videos with curated AI templates.",
  openGraph: {
    title: "Homie — AI home tours for real estate",
    description: "Listing photos in. Home tours out.",
    images: [{ url: "/og.png", width: 1744, height: 909, alt: "Homie — Listing photos in. Home tours out." }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Homie — AI home tours for real estate",
    description: "Listing photos in. Home tours out.",
    images: ["/og.png"],
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
