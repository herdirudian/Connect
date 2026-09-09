import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

const afNeueBerlin = localFont({
  src: [
    {
      path: "../../public/fonts/AFNeueBerlin-ExtraLight.ttf",
      weight: "200",
      style: "normal",
    },
    {
      path: "../../public/fonts/AFNeueBerlin-Light.ttf",
      weight: "300",
      style: "normal",
    },
    {
      path: "../../public/fonts/AFNeueBerlin-LightItalic.ttf",
      weight: "300",
      style: "italic",
    },
    {
      path: "../../public/fonts/AFNeueBerlin-Regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/fonts/AFNeueBerlin-Italic.ttf",
      weight: "400",
      style: "italic",
    },
    {
      path: "../../public/fonts/AFNeueBerlin-SemiBold.ttf",
      weight: "600",
      style: "normal",
    },
    {
      path: "../../public/fonts/AFNeueBerlin-SemiBoldItalic.ttf",
      weight: "600",
      style: "italic",
    },
    {
      path: "../../public/fonts/AFNeueBerlin-ExtraBold.ttf",
      weight: "800",
      style: "normal",
    },
    {
      path: "../../public/fonts/AFNeueBerlin-ExtraBoldItalic.ttf",
      weight: "800",
      style: "italic",
    },
  ],
  variable: "--font-af-neue-berlin",
});

export const metadata: Metadata = {
  title: "The Lodge Connect",
  description: "Integrated digital platform for Members, Greeters, and Visitors at The Lodge Maribaya",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
      { url: "/icon.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "TLM Connect",
  },
};

export const viewport: Viewport = {
  themeColor: "#006400",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

import { Toaster } from "@/components/ui/toaster";
import { InstallPWA } from "@/components/InstallPWA";
import Script from "next/script";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${afNeueBerlin.variable} font-sans antialiased`}
      >
        <Script src="https://www.googletagmanager.com/gtag/js?id=G-GEWZ1FHYZJ" strategy="afterInteractive" />
        <Script id="gtag-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-GEWZ1FHYZJ');
          `}
        </Script>
        {children}
        <Toaster />
        <InstallPWA />
      </body>
    </html>
  );
}
