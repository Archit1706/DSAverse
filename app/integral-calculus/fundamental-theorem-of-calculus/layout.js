import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: 'Fundamental Theorem of Calculus – Accumulated Area and Its Slope',
    description: 'Sweep an area under f along the axis and plot the running total A(x) = ∫ₐˣ f(t) dt beneath it. The tangent to A at every x has slope f(x): watch it rise where f is positive, fall where f is negative, and see why ∫ₐᵇ f = F(b) − F(a).',
    keywords: ['fundamental theorem of calculus', 'accumulation function', 'antiderivative', 'area function', 'integral and derivative', 'ftc visualization', 'calculus visualization'],
    openGraph: {
        title: 'The Fundamental Theorem of Calculus – DSAverse',
        description: 'The area so far, plotted as you sweep — and its slope at every point is f.',
        images: [{ url: '/og-image.png' }],
    },
    alternates: { canonical: '/integral-calculus/fundamental-theorem-of-calculus' },
};

export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/integral-calculus/fundamental-theorem-of-calculus" />
        </>
    );
}
