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

const BASE_URL = "https://dsa-verse.vercel.app";

export const metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "DSAverse – Interactive Data Structures & Algorithms Visualizer",
    template: "%s | DSAverse",
  },
  description:
    "Learn data structures and algorithms through step-by-step interactive visualizations. Covers sorting, searching, recursion, dynamic programming, heaps, and more with code examples and complexity analysis.",
  keywords: [
    "data structures", "algorithms", "DSA", "visualizer", "sorting algorithms",
    "searching algorithms", "dynamic programming", "recursion", "binary heap",
    "graph algorithms", "bubble sort", "merge sort", "quick sort", "binary search",
    "computer science", "coding interview", "learn algorithms", "algorithm animation",
    "big O notation", "time complexity", "space complexity",
  ],
  authors: [{ name: "DSAverse" }],
  creator: "DSAverse",
  publisher: "DSAverse",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: BASE_URL,
    siteName: "DSAverse",
    title: "DSAverse – Interactive Data Structures & Algorithms Visualizer",
    description:
      "Step-by-step interactive visualizations for every major DSA topic. Perfect for students, developers, and coding interview prep.",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "DSAverse" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "DSAverse – Interactive DSA Visualizer",
    description:
      "Step-by-step interactive visualizations for every major DSA topic.",
    images: ["/og-image.png"],
  },
  manifest: "/manifest.json",
  icons: { icon: "/favicon.ico" },
  alternates: { canonical: BASE_URL },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "DSAverse",
  url: BASE_URL,
  description:
    "Interactive data structures and algorithms visualizer for students and developers.",
  potentialAction: {
    "@type": "SearchAction",
    target: { "@type": "EntryPoint", urlTemplate: `${BASE_URL}/searching/{search_term_string}` },
    "query-input": "required name=search_term_string",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased text-gray-900`}>
        {children}
      </body>
    </html>
  );
}
