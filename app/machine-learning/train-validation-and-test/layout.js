import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: 'Train, Validation and Test – Cross-Validation and Data Leakage',
    description: 'Fit on one pile, choose on another, report on a third. Measure how much peeking at the test set flatters a model, step through 5-fold cross-validation, and run six pipelines on pure-noise labels — three of them score far above chance. Every run computed in your browser.',
    keywords: ['train validation test split', 'cross-validation', 'k-fold cross-validation', 'data leakage', 'feature selection leakage', 'test set', 'model selection', 'hyperparameter tuning', 'machine learning'],
    openGraph: {
        title: 'Train, Validation and Test – DSAverse',
        description: 'On labels that are coin flips, a leaky pipeline cross-validates at 85%. See exactly where the answers leak in.',
        images: [{ url: '/og-image.png' }],
    },
    alternates: { canonical: '/machine-learning/train-validation-and-test' },
};

export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/machine-learning/train-validation-and-test" />
        </>
    );
}
