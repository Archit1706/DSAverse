import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: 'Random Variables and Expectation Visualizer – Balance Point and Spread',
    description: 'A probability distribution as bars on a beam: the expected value E[X] is where the beam balances, and the variance measures how far the weight sits from that point. Drag the bars, load a die, add two dice, and see E[X] = ∑ x·p(x) and Var(X) with live numbers.',
    keywords: ['random variable', 'expected value', 'expectation', 'variance', 'standard deviation', 'probability distribution', 'balance point', 'loaded die', 'statistics'],
    openGraph: {
        title: 'Random Variables and Expectation – DSAverse',
        description: 'Drag the bars of a distribution and watch the balance point — the expected value — and the spread move.',
        images: [{ url: '/og-image.png' }],
    },
    alternates: { canonical: '/probability-and-statistics/random-variables-and-expectation' },
};

export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/probability-and-statistics/random-variables-and-expectation" />
        </>
    );
}
