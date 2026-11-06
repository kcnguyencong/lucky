import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lottery Analytics Engine",
  description: "Real-time Statistical Dashboard & Data Ingestion Pipeline",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased dark">
      <body className="min-h-full flex flex-col bg-slate-950 font-sans">{children}</body>
    </html>
  );
}
