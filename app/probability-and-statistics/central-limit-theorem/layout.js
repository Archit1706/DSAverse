import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: 'Central Limit Theorem Visualizer – Sample Means Becoming Normal',
    description: 'Draw thousands of seeded samples from a lopsided distribution and average each one. As the sample size n grows, the histogram of sample means turns into a bell curve centred on μ with spread σ / √n. Try skewed, uniform and U-shaped populations and click any bar.',
    keywords: ['central limit theorem', 'sampling distribution', 'sample mean', 'standard error', 'normal approximation', 'skewed distribution', 'statistics simulation'],
    openGraph: {
        title: 'Central Limit Theorem – DSAverse',
        description: 'Average samples from any lopsided distribution and the averages pile up into a bell curve. Watch it happen as n grows.',
        images: [{ url: '/og-image.png' }],
    },
    alternates: { canonical: '/probability-and-statistics/central-limit-theorem' },
};

export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/probability-and-statistics/central-limit-theorem" />
        </>
    );
}
