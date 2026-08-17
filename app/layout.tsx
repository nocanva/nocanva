import type { Metadata } from "next";
import { DM_Sans, Source_Serif_4 } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
});

const sourceSerif = Source_Serif_4({
  variable: "--font-serif",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const imageUrl = `${protocol}://${host}/og.png`;

  return {
    title: "Framewise — AI-native branded media",
    description: "Turn structured ideas into consistent, brand-ready social media.",
    icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
    openGraph: {
      title: "Framewise — AI-native branded media",
      description: "Ideas in. Brand-ready media out.",
      images: [{ url: imageUrl, width: 1200, height: 630, alt: "Framewise branded media studio" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Framewise — AI-native branded media",
      description: "Ideas in. Brand-ready media out.",
      images: [imageUrl],
    },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${dmSans.variable} ${sourceSerif.variable}`}>{children}</body>
    </html>
  );
}
