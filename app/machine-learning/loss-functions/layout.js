import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: 'Loss Functions – Squared, Absolute, Huber and Cross-Entropy',
    description: 'Throw one point off and watch the squared-loss line swing while the absolute-loss line holds, turn the Huber dial between them, and see why classifiers use cross-entropy. Every best fit is solved exactly in your browser.',
    keywords: ['loss function', 'mean squared error', 'mean absolute error', 'huber loss', 'cross-entropy', 'outliers', 'robust regression', 'median vs mean', 'machine learning'],
    openGraph: {
        title: 'Loss Functions – DSAverse',
        description: 'The loss decides what "good" means: same points, three losses, three different best lines.',
        images: [{ url: '/og-image.png' }],
    },
    alternates: { canonical: '/machine-learning/loss-functions' },
};

export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/machine-learning/loss-functions" />
        </>
    );
}
