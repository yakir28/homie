import type { Metadata } from "next";
import "./globals.css";

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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Urbanist:wght@400;500;600;700;800&family=Raleway:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
