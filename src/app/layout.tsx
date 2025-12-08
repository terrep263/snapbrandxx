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
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

