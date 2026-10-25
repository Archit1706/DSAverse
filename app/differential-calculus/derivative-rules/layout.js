import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: 'Derivative Rules Visualizer – Power, Product and Chain Rules',
    description: 'See where the derivative rules come from. The power rule as the slope of xⁿ, the product rule as a rectangle u × v growing by two strips and a vanishing corner, and the chain rule as an interval stretched by g and then by f, with the rates multiplying.',
    keywords: ['derivative rules', 'power rule', 'product rule', 'chain rule', 'differentiation rules', 'product rule proof', 'chain rule intuition', 'calculus visualization'],
    openGraph: {
        title: 'Derivative Rules from Pictures – DSAverse',
        description: 'A tangent, a growing rectangle, and an interval stretched twice: the power, product and chain rules, each from one picture.',
        images: [{ url: '/og-image.png' }],
    },
    alternates: { canonical: '/differential-calculus/derivative-rules' },
};

export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/differential-calculus/derivative-rules" />
        </>
    );
}
