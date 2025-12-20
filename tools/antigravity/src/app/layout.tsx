import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ARK | Tägliche Weisheit",
  description: "Dein personalisierter digitaler Abreißkalender.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
