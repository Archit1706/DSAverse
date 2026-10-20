import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: "Longest Substring Without Repeating Characters Visualizer",
    description: "Visualize the dynamic sliding window technique for finding the longest substring without repeating characters. Expand right, shrink left on duplicates — O(n) time.",
    keywords: ["longest substring", "no repeating characters", "sliding window", "dynamic window", "algorithm visualization", "O(n)"],
    openGraph: {
        title: "Longest Substring Without Repeating Characters Visualizer – DSAverse",
        description: "Interactive Longest Substring visualization with dynamic sliding window animation.",
        images: [{ url: "/og-image.png" }],
    },
    alternates: { canonical: "/two-pointers-and-sliding-window/longest-substring-without-repeating-characters" },
};
export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/two-pointers-and-sliding-window/longest-substring-without-repeating-characters" />
        </>
    );
}
