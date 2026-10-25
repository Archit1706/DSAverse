import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: 'Riemann Sums Visualizer – Left, Right and Midpoint Rectangles',
    description: 'Fill the area under a curve with left, right or midpoint rectangles and watch the sum close in on the true area as n grows. See why left and right sums err on opposite sides of a rising curve, and why the midpoint error shrinks like 1/n² instead of 1/n.',
    keywords: ['riemann sum', 'left riemann sum', 'right riemann sum', 'midpoint rule', 'area under a curve', 'definite integral approximation', 'error order', 'calculus visualization'],
    openGraph: {
        title: 'Riemann Sums: Rectangles Under a Curve – DSAverse',
        description: 'Left, right and midpoint rectangles closing in on an area — and an error chart showing how fast each one gets there.',
        images: [{ url: '/og-image.png' }],
    },
    alternates: { canonical: '/integral-calculus/riemann-sums' },
};

export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/integral-calculus/riemann-sums" />
        </>
    );
}
