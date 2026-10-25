import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: 'Law of Large Numbers Visualizer – Running Averages That Settle on the Mean',
    description: 'Roll a die thousands of times and watch several seeded runs of the running average wander, then settle on 3.5 inside a band that narrows like 1 / √n. Switch to coin flips or a skewed distribution, click the chart to move through the rolls, and see why the gambler\'s fallacy is still a fallacy.',
    keywords: ['law of large numbers', 'running average', 'sample mean', 'convergence', 'standard error', 'gamblers fallacy', 'dice simulation', 'statistics'],
    openGraph: {
        title: 'Law of Large Numbers – DSAverse',
        description: 'Running averages wander, then settle. The band they settle into shrinks like 1 / √n.',
        images: [{ url: '/og-image.png' }],
    },
    alternates: { canonical: '/probability-and-statistics/law-of-large-numbers' },
};

export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/probability-and-statistics/law-of-large-numbers" />
        </>
    );
}
