import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: 'Inclusion-Exclusion Visualizer – Counting a Union Without Double Counting',
    description: 'How many of 1 to 30 are divisible by 2, 3 or 5? Add the three sets, subtract the overlaps, add back the centre — with a tally on every Venn region showing how many times it has been counted. Switch terms on and off, change the divisors, and click any region or number.',
    keywords: ['inclusion exclusion', 'inclusion-exclusion principle', 'venn diagram', 'union of sets', 'counting overlaps', 'divisibility counting', 'combinatorics'],
    openGraph: {
        title: 'Inclusion-Exclusion – DSAverse',
        description: 'Add, subtract, add back: watch every Venn region\'s tally settle at exactly 1.',
        images: [{ url: '/og-image.png' }],
    },
    alternates: { canonical: '/combinatorics/inclusion-exclusion' },
};

export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/combinatorics/inclusion-exclusion" />
        </>
    );
}
