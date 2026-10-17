export const metadata = {
    title: "Minimum Window Substring Visualizer",
    description: "Interactive visualization of the Minimum Window Substring problem. See the window expand and shrink step by step with live character frequency tracking.",
    keywords: ["minimum window substring", "sliding window", "leetcode 76", "character frequency", "algorithm visualization"],
    openGraph: {
        title: "Minimum Window Substring Visualizer – DSAverse",
        description: "Watch the sliding window expand and shrink step by step with live character frequency tracking.",
        images: [{ url: "/og-image.png" }],
    },
    alternates: { canonical: "/two-pointers-and-sliding-window/minimum-window-substring" },
}

export default function Layout({ children }) { return children; }
