import type { Metadata } from "next";
import { DM_Sans, Fraunces, Plus_Jakarta_Sans, Source_Serif_4 } from "next/font/google";
import { headers } from "next/headers";
import { requireNoCanvaViewer } from "../lib/server/request-auth";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
});

const sourceSerif = Source_Serif_4({
  variable: "--font-serif",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const imageUrl = `${protocol}://${host}/og-nocanva.png`;

  return {
    title: "NoCanva — AI-native branded media",
    description: "Turn structured ideas into consistent, brand-ready social media.",
    icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
    openGraph: {
      title: "NoCanva — AI-native branded media",
      description: "Ideas in. Brand-ready media out.",
      images: [{ url: imageUrl, width: 1200, height: 630, alt: "NoCanva branded media studio" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "NoCanva — AI-native branded media",
      description: "Ideas in. Brand-ready media out.",
      images: [imageUrl],
    },
  };
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  await requireNoCanvaViewer("/");
  return (
    <html lang="en">
      <body className={`${dmSans.variable} ${sourceSerif.variable} ${fraunces.variable} ${jakarta.variable}`}>{children}</body>
    </html>
  );
}
