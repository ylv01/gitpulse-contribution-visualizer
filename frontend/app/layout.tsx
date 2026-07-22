import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GitPulse — Contribution Visualizer",
  description: "Turn GitHub activity into a visual signal.",
};

export const viewport: Viewport = {
  themeColor: "#050714",
  colorScheme: "dark",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}

