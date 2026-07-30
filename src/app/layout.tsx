import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const panchang = localFont({
  src: "./fonts/Panchang-Variable.woff2",
  variable: "--font-panchang",
  weight: "200 800",
  display: "swap",
});

const zodiak = localFont({
  src: "./fonts/Zodiak-Variable.woff2",
  variable: "--font-zodiak",
  weight: "100 900",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Blick",
  description: "Browse, search, and animate icons from popular SVG icon libraries.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${panchang.variable} ${zodiak.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
