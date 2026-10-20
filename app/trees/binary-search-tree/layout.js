import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: 'Binary Search Tree Visualizer',
    description: 'Step-by-step BST insert and search visualizer. Watch the traversal path light up as each comparison is made.',
    keywords: ['BST', 'binary search tree', 'insert', 'search', 'tree traversal', 'data structure'],
    openGraph: {
        title: 'Binary Search Tree Visualizer – DSAverse',
        description: 'Step through BST insert and search with the traversal path lighting up at every comparison.',
        images: [{ url: '/og-image.png' }],
    },
    alternates: { canonical: '/trees/binary-search-tree' },
};
export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/trees/binary-search-tree" />
        </>
    );
}
