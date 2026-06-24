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
  description: "Member Dashboard",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "TLM Explore",
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
      </body>
    </html>
  );
}
