import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "股票儀表板",
  description: "簡易美股報價查詢",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-TW">
      <body>{children}</body>
    </html>
  );
}
