import type { Metadata } from "next";
import { Inter, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import { AppProviders } from "@/components/AppProviders";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "AMSAD — Stock Analysis Dashboard",
    template: "%s · AMSAD",
  },
  description:
    "A clean, beginner-friendly dashboard that explains any stock's price, fundamentals, and risk — and how each metric compares to its industry.",
  openGraph: {
    type: "website",
    siteName: "AMSAD",
    title: "AMSAD — Stock Analysis Dashboard",
    description: "Learn stocks with grades, charts, calculators, and an options lab.",
  },
  twitter: {
    card: "summary_large_image",
    title: "AMSAD — Stock Analysis Dashboard",
    description: "Learn stocks with grades, charts, calculators, and an options lab.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
