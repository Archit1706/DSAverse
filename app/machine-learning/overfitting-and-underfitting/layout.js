import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: 'Overfitting and Underfitting – The Validation U, L2 Penalty and Bias–Variance',
    description: 'Fit polynomials of degree 0 to 11 to twelve noisy points and watch training error fall forever while validation error traces a U. Tame degree 11 with an L2 penalty and measure bias² and variance over many training sets — every fit solved in your browser.',
    keywords: ['overfitting', 'underfitting', 'bias variance tradeoff', 'validation error', 'polynomial regression', 'ridge regression', 'L2 regularization', 'model complexity', 'machine learning'],
    openGraph: {
        title: 'Overfitting and Underfitting – DSAverse',
        description: 'Training error only ever falls. Validation error traces a U. Slide the degree and see why.',
        images: [{ url: '/og-image.png' }],
    },
    alternates: { canonical: '/machine-learning/overfitting-and-underfitting' },
};

export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/machine-learning/overfitting-and-underfitting" />
        </>
    );
}
