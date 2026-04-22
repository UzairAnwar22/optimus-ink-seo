import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "AskMyBio — AI-Powered Bio Link",
    template: "%s",
  },
  description: "Create your AI-powered bio link page. Share your profile, products, and content in one place.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://askmybio.ai"),
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col" style={{ fontFamily: "var(--font-body), system-ui, -apple-system, sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
