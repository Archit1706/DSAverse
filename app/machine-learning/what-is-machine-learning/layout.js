import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: 'What Is Machine Learning? – Learning as Search',
    description: 'Fit a line to twelve points by hand, then watch gradient descent do it on the same loss map. Machine learning is a model family, a loss that scores it, and a search for the lowest score — every number computed live.',
    keywords: ['what is machine learning', 'machine learning basics', 'loss function', 'mean squared error', 'gradient descent', 'model parameters', 'fitting a line', 'learning rate'],
    openGraph: {
        title: 'What Is Machine Learning? – DSAverse',
        description: 'Learning is searching for the parameters that make a loss small. Try it by hand, then watch gradient descent do it.',
        images: [{ url: '/og-image.png' }],
    },
    alternates: { canonical: '/machine-learning/what-is-machine-learning' },
};

export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/machine-learning/what-is-machine-learning" />
        </>
    );
}
