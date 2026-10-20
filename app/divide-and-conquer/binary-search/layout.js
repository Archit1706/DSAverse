import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: 'Binary Search — Decision Tree',
    description: 'Visualize binary search as a decision tree: every comparison is a branch, left for smaller, right for larger, until the target is found or eliminated.',
    keywords: ['binary search', 'decision tree', 'divide and conquer', 'O(log n)', 'search algorithm', 'visualization'],
    openGraph: {
        title: 'Binary Search Decision Tree – DSAverse',
        description: 'Watch binary search as a decision tree: every comparison branches left or right until the target is found or eliminated.',
        images: [{ url: '/og-image.png' }],
    },
    alternates: { canonical: '/divide-and-conquer/binary-search' },
};

export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/divide-and-conquer/binary-search" />
        </>
    );
}
