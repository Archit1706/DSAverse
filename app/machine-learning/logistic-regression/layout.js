import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: 'Logistic Regression – Sigmoid, Cross-Entropy and the Decision Boundary',
    description: 'Train logistic regression live: a linear score squashed by the sigmoid, scored with cross-entropy, with the decision boundary swinging into place. Read the weights as odds, then watch it fail on rings — every number computed in your browser.',
    keywords: ['logistic regression', 'sigmoid', 'binary cross-entropy', 'decision boundary', 'log-odds', 'classification', 'gradient descent', 'linear classifier', 'machine learning'],
    openGraph: {
        title: 'Logistic Regression – DSAverse',
        description: 'A linear score, a sigmoid and cross-entropy, trained live — and the straight boundary it can never bend.',
        images: [{ url: '/og-image.png' }],
    },
    alternates: { canonical: '/machine-learning/logistic-regression' },
};

export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/machine-learning/logistic-regression" />
        </>
    );
}
