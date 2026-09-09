import type { Metadata } from "next";
import { Geist, Geist_Mono, Hind_Siliguri } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const hindSiliguri = Hind_Siliguri({
  variable: "--font-bn",
  subsets: ["bengali"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "InventoryOS — ব্যবসার জন্য সম্পূর্ণ ডিজিটাল সলিউশন",
  description: "InventoryOS — আপনার ব্যবসার জন্য সম্পূর্ণ ডিজিটাল সলিউশন। মুদারাবা প্রফিট ম্যানেজমেন্ট, CCTV বিজনেস, মোবাইল শপ, ফার্মেসি — সবকিছু এক জায়গায়।",
  keywords: ["InventoryOS", "mudaraba", "business management", "bangladesh", "islamic finance", "inventory", "CCTV", "pharmacy"],
  authors: [{ name: "Sajid Chowdhury" }],
  openGraph: {
    title: "InventoryOS",
    description: "ব্যবসাকে সিস্টেমে রূপ দিন, জীবনকে শান্তিতে ভরিয়ে দিন",
    url: "https://inventoryos.xyz",
    siteName: "InventoryOS",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="bn" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${hindSiliguri.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
