import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ARK | Tägliche Weisheit",
  description: "Dein personalisierter digitaler Abreißkalender.",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0", // Prevent zoom on mobile
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
  },
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
