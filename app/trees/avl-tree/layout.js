import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: 'AVL Tree Visualizer',
    description: 'Watch LL, RR, LR, and RL rotations in action as insertions unbalance and rebalance an AVL tree.',
    keywords: ['AVL tree', 'rotations', 'self-balancing', 'LL rotation', 'RR rotation', 'LR rotation', 'RL rotation'],
    openGraph: {
        title: 'AVL Tree Visualizer – DSAverse',
        description: 'Watch LL, RR, LR, and RL rotations fire as insertions unbalance and then rebalance an AVL tree.',
        images: [{ url: '/og-image.png' }],
    },
    alternates: { canonical: '/trees/avl-tree' },
};
export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/trees/avl-tree" />
        </>
    );
}
