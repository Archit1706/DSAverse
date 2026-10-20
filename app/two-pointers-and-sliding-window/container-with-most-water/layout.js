import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: "Container With Most Water Visualizer",
    description: "Interactive visualization of the Container With Most Water problem. Watch two pointers converge inward, always moving the shorter bar, and see the water area update in real time.",
    keywords: ["container with most water", "two pointers", "leetcode 11", "area visualization", "algorithm visualization"],
    openGraph: {
        title: "Container With Most Water Visualizer – DSAverse",
        description: "Two pointers converge inward, always moving the shorter bar, with the enclosed water area updating in real time.",
        images: [{ url: "/og-image.png" }],
    },
    alternates: { canonical: "/two-pointers-and-sliding-window/container-with-most-water" },
}

export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/two-pointers-and-sliding-window/container-with-most-water" />
        </>
    );
}
