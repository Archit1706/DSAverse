import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: 'Birthday Paradox Visualizer – Why 23 People Are Enough for 50%',
    description: 'The exact probability that two of n people share a birthday, 1 − ∏ (365 − i) / 365, plotted against a seeded simulation. Drag along the curve to change n, watch a room of people find their matches, and see why 23 people already make 253 pairs.',
    keywords: ['birthday paradox', 'birthday problem', 'probability of shared birthday', '23 people', 'complement probability', 'hash collisions', 'probability simulation'],
    openGraph: {
        title: 'Birthday Paradox – DSAverse',
        description: '23 people, 253 pairs, a better than even chance of a shared birthday. The exact curve against a simulation.',
        images: [{ url: '/og-image.png' }],
    },
    alternates: { canonical: '/probability-and-statistics/birthday-paradox' },
};

export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/probability-and-statistics/birthday-paradox" />
        </>
    );
}
