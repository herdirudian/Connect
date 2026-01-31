import type { Metadata } from "next";
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
};

import { Toaster } from "@/components/ui/toaster";

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
        {children}
        <Toaster />
      </body>
    </html>
  );
}
