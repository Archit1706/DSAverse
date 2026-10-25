import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: 'Numerical Integration – Trapezoid, Midpoint and Simpson\'s Rule',
    description: 'Compare the trapezoid rule, the midpoint rule and Simpson\'s rule side by side on ∫ sin x, ∫ eˣ and ∫ 1/(1 + x²). Watch the trapezoids, rectangles and parabolas, and see the error orders on a log-log chart: 1/n², 1/n² and 1/n⁴.',
    keywords: ['numerical integration', 'trapezoid rule', 'trapezoidal rule', 'midpoint rule', 'simpsons rule', 'error order', 'convergence rate', 'numerical methods', 'calculus visualization'],
    openGraph: {
        title: 'Numerical Integration: Error Orders – DSAverse',
        description: 'Trapezoids, midpoints and Simpson\'s parabolas — and why doubling n cuts their errors by 4, 4 and 16.',
        images: [{ url: '/og-image.png' }],
    },
    alternates: { canonical: '/integral-calculus/numerical-integration' },
};

export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/integral-calculus/numerical-integration" />
        </>
    );
}
