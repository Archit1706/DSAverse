import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: 'Red-Black Tree Visualizer – Recolouring and Rotations',
    description: 'Visualize a red-black tree keeping itself balanced by colour rather than strict height. Watch recolouring handle a red uncle, rotations handle a black one, and the black-height invariant hold throughout.',
    keywords: ['red-black tree', 'recolouring', 'rotation', 'black height', 'self-balancing BST', 'red uncle', 'invariant', 'tree visualization'],
    openGraph: {
        title: 'Red-Black Tree Visualizer – DSAverse',
        description: 'Balance by colour, not height: recolour when the uncle is red, rotate when it is black.',
        images: [{ url: '/og-image.png' }],
    },
    alternates: { canonical: '/indexing/red-black-trees' },
};
export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/indexing/red-black-trees" />
        </>
    );
}
