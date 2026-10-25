import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export const metadata = {
    title: { template: '%s – Probability and Statistics | DSAverse', default: 'Probability and Statistics | DSAverse' },
    description: 'Interactive probability and statistics: sample spaces on a dice grid, conditional probability as a shrinking space, Bayes\' theorem with 1,000 people, expectation as a balance point, a Galton board, the normal curve, the law of large numbers, the central limit theorem and the birthday paradox.',
    keywords: ['probability', 'statistics', 'conditional probability', 'bayes theorem', 'expected value', 'binomial distribution', 'galton board', 'normal distribution', 'law of large numbers', 'central limit theorem', 'birthday paradox', 'probability visualization'],
    openGraph: {
        title: 'Probability and Statistics Visualizers – DSAverse',
        description: 'Roll, flip, test and sample: every simulation is seeded, every formula shows its numbers, and every picture can be dragged.',
        images: [{ url: '/og-image.png', width: 1200, height: 630 }],
    },
    alternates: { canonical: '/probability-and-statistics' },
};

export default function ProbabilityAndStatisticsLayout({ children }) {
    return (
        <>
            <Navbar />
            <main className="pt-16">{children}</main>
            <Footer />
        </>
    );
}
