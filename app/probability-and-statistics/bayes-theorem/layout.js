import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: "Bayes' Theorem Visualizer – Why a Positive Test Is Usually a False Alarm",
    description: "A population of 1,000 people, a rare condition and a good test. Slide the base rate, sensitivity and false-positive rate, click the grid to change how many are sick, and see P(sick | positive) as natural frequencies and with Bayes' theorem — then test the positives a second time.",
    keywords: ["bayes theorem", 'base rate fallacy', 'false positive', 'medical test probability', 'sensitivity and specificity', 'posterior probability', 'natural frequencies', 'conditional probability'],
    openGraph: {
        title: "Bayes' Theorem – DSAverse",
        description: '1,000 dots, a 1% condition and a 90% accurate test: most positives are healthy. See why, and change every number.',
        images: [{ url: '/og-image.png' }],
    },
    alternates: { canonical: '/probability-and-statistics/bayes-theorem' },
};

export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/probability-and-statistics/bayes-theorem" />
        </>
    );
}
