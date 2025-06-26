import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "DSAverse - Learn DSA with Visualizations",
  description: "Learn the basics of algorithms and data structures with visualizations.",
  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    title: "DSAverse - Learn DSA with Visualizations",
    description: "Learn the basics of algorithms and data structures with visualizations.",
    images: "/og-image.png",
  },
  twitter: {
    card: "summary_large_image",
    title: "DSAverse - Learn DSA with Visualizations",
    description: "Learn the basics of algorithms and data structures with visualizations.",
    images: "/og-image.png",
  },
  manifest: "/manifest.json",
  themeColor: "#000000",
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
  },
  metadataBase: new URL("https://dsa-verse.vercel.app"),
  alternates: {
    canonical: "https://dsa-verse.vercel.app",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
