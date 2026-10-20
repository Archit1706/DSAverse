import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: "3Sum Visualizer",
    description: "Interactive visualization of the 3Sum problem. Watch the pivot advance through the sorted array while two pointers sweep the remainder to find all unique zero-sum triplets.",
    keywords: ["3sum", "three sum", "two pointers", "leetcode 15", "triplets", "algorithm visualization"],
    openGraph: {
        title: "3Sum Visualizer – DSAverse",
        description: "Watch the pivot advance through a sorted array while two pointers sweep the remainder for unique zero-sum triplets.",
        images: [{ url: "/og-image.png" }],
    },
    alternates: { canonical: "/two-pointers-and-sliding-window/3sum" },
}

export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/two-pointers-and-sliding-window/3sum" />
        </>
    );
}
