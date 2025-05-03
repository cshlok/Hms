import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner"; // Added Toaster for notifications
import { ThemeProvider } from "@/components/theme-provider"; // Added ThemeProvider

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Use metadata from HEAD
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
    // Keep lang="en" and dark class from origin/master
    <html lang="en" className="dark" suppressHydrationWarning>
      {/* Use Geist fonts and antialiased from origin/master */}
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {/* Wrap children with ThemeProvider */}
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster /> {/* Add Toaster here */}
        </ThemeProvider>
      </body>
    </html>
  );
}
