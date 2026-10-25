import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: "Pascal's Triangle Visualizer – C(n, k), Symmetry, Hockey Stick and Row Sums",
    description: "Build Pascal's triangle row by row, each number the sum of the two above it. Click any cell to read C(n, k), then see its mirror image, the hockey-stick identity, the row sums of 2ⁿ and the odd entries that draw Sierpinski's triangle.",
    keywords: ["pascal's triangle", 'binomial coefficients', 'n choose k', 'pascals rule', 'hockey stick identity', 'row sum 2^n', 'sierpinski triangle', 'combinatorics'],
    openGraph: {
        title: "Pascal's Triangle – DSAverse",
        description: 'Every entry is the sum of the two above it, and every entry is C(n, k). Click cells and watch the identities light up.',
        images: [{ url: '/og-image.png' }],
    },
    alternates: { canonical: '/combinatorics/pascals-triangle' },
};

export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/combinatorics/pascals-triangle" />
        </>
    );
}
