import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: 'Derivative Visualizer – Secant to Tangent as h → 0',
    description: 'Watch the secant line through P and Q turn into the tangent as h shrinks, with the difference quotient (f(x + h) − f(x))/h computed live. Then slide P along the curve and trace the slopes into the derivative function: x²/2 gives x, sin x gives cos x.',
    keywords: ['derivative', 'difference quotient', 'secant line', 'tangent line', 'slope of a curve', 'limit definition of derivative', 'instantaneous rate of change', 'derivative visualization', 'calculus'],
    openGraph: {
        title: 'The Derivative: Secant to Tangent – DSAverse',
        description: 'Two points on a curve, pulled together until the secant is the tangent — and then the slope at every point traced into f′.',
        images: [{ url: '/og-image.png' }],
    },
    alternates: { canonical: '/differential-calculus/the-derivative' },
};

export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/differential-calculus/the-derivative" />
        </>
    );
}
