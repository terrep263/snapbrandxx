import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SnapBrandXX Ops - Internal Bulk Watermark Tool",
  description: "Internal tool for bulk image watermarking",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" style={{ height: '100%', overflow: 'hidden' }}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      </head>
      <body style={{ height: '100%', overflow: 'hidden', margin: 0, padding: 0 }}>{children}</body>
    </html>
  );
}

