import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: 'Stars and Bars Visualizer – Distributing Identical Items, C(n + k − 1, k − 1)',
    description: 'Share n identical items among k bins by dragging k − 1 bars through a row of stars. Every arrangement is one distribution, so there are C(n + k − 1, k − 1) of them — or C(n − 1, k − 1) when every bin must get at least one. Count solutions of x₁ + x₂ + … + xₖ = n.',
    keywords: ['stars and bars', 'distributing identical objects', 'balls into boxes', 'nonnegative integer solutions', 'multiset coefficient', 'combinations with repetition', 'combinatorics'],
    openGraph: {
        title: 'Stars and Bars – DSAverse',
        description: 'Drag the bars, watch the distribution change, and see why the count is C(n + k − 1, k − 1).',
        images: [{ url: '/og-image.png' }],
    },
    alternates: { canonical: '/combinatorics/stars-and-bars' },
};

export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/combinatorics/stars-and-bars" />
        </>
    );
}
