import localFont from "next/font/local";
import "./globals.css";

/* Self-hosted rather than loaded through next/font/google. That downloads the
   fonts from Google at build time, and Google Fonts intermittently answers
   with extensionless /l/font?kit= URLs that crash next/font's loader
   (vercel/next.js#99114) — which failed production builds on Vercel.

   The files are Google's own variable fonts from github.com/google/fonts
   (SIL Open Font License, see app/fonts/OFL-*.txt), cut down to the Unicode
   ranges Google Fonts serves for them, so every page renders as it did. */
const outfit = localFont({
  src: "./fonts/Outfit-Variable.woff2",
  variable: "--font-outfit",
  weight: "100 900",
  display: "swap",
});

const jetbrainsMono = localFont({
  src: "./fonts/JetBrainsMono-Variable.woff2",
  variable: "--font-jetbrains-mono",
  weight: "100 800",
  display: "swap",
});

const BASE_URL = "https://dsa-verse.vercel.app";

export const metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "DSAverse – Visualize Data Structures, Algorithms, CS Core & Math",
    template: "%s | DSAverse",
  },
  description:
    "Learn data structures and algorithms, CS core (operating systems, networks, databases) and math (probability, linear algebra, calculus) with interactive visualizations and quizzes.",
  keywords: [
    "data structures", "algorithms", "DSA", "visualizer", "sorting algorithms",
    "searching algorithms", "dynamic programming", "recursion", "binary heap",
    "graph algorithms", "bubble sort", "merge sort", "quick sort", "binary search",
    "computer science", "coding interview", "learn algorithms", "algorithm animation",
    "big O notation", "time complexity", "space complexity",
    "CS core", "operating systems", "computer networks", "database systems",
    "CPU scheduling", "page replacement", "TCP congestion control", "transaction isolation",
    "math visualizer", "combinatorics", "probability", "statistics", "vectors",
    "linear algebra", "eigenvectors", "calculus", "derivatives", "integrals",
  ],
  authors: [{ name: "DSAverse" }],
  creator: "DSAverse",
  publisher: "DSAverse",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: BASE_URL,
    siteName: "DSAverse",
    title: "DSAverse – Visualize Data Structures, Algorithms, CS Core & Math",
    description:
      "Step-by-step interactive visualizations for DSA, CS core and math: operating systems, networks, databases, probability, linear algebra and calculus. For students, developers and interview prep.",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "DSAverse" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "DSAverse – Interactive DSA, CS Core & Math Visualizer",
    description:
      "Step-by-step interactive visualizations for DSA, CS core and math topics.",
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
    "Interactive visualizations of data structures and algorithms, CS core topics (operating systems, computer networks, databases) and math (probability, linear algebra, calculus) for students and developers.",
  // No `potentialAction` here on purpose: the site has no search endpoint.
  // It previously advertised a SearchAction pointing at /searching/{term},
  // which is the searching-algorithms index, not a query handler — so the
  // markup claimed a capability that does not exist. Restore it only if a
  // real search route is added.
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
      <body
        className={`${outfit.variable} ${jetbrainsMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
