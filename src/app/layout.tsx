import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css"; // Assuming globals.css exists

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Hospital Management System",
  description: "Comprehensive HMS",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
