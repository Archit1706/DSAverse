import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: 'Permutations Visualizer – Filling Slots and nPr = n!/(n − k)!',
    description: 'Fill k slots from n items and watch the choices shrink: 5 × 4 × 3 = 60 podiums. Toggle repetition to see nᵏ instead, see where n!/(n − k)! comes from, and click tiles or slide through every arrangement in dictionary order.',
    keywords: ['permutations', 'nPr', 'permutation formula', 'n factorial', 'permutations with repetition', 'arrangements', 'ordered selection', 'combinatorics'],
    openGraph: {
        title: 'Permutations: Filling Slots – DSAverse',
        description: 'n choices, then n − 1, then n − 2: fill the slots and watch nPr build itself.',
        images: [{ url: '/og-image.png' }],
    },
    alternates: { canonical: '/combinatorics/permutations' },
};

export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/combinatorics/permutations" />
        </>
    );
}
