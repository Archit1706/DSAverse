import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: 'Newton\'s Method Visualizer – Tangent Lines to a Root',
    description: 'Follow tangent lines down to the x-axis, step by step, and watch Newton\'s method find √2 with the correct digits doubling each time. Then see it fail: a starting point that cycles forever on x³ − 2x + 2, and one that runs away on arctan x.',
    keywords: ['newtons method', 'newton raphson', 'root finding', 'tangent line', 'quadratic convergence', 'square root algorithm', 'numerical methods', 'calculus visualization'],
    openGraph: {
        title: 'Newton\'s Method: Tangents to a Root – DSAverse',
        description: 'Slide down the tangent, land on the axis, repeat. Fast convergence near a root — and the starts where it cycles or flies off.',
        images: [{ url: '/og-image.png' }],
    },
    alternates: { canonical: '/differential-calculus/newtons-method' },
};

export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/differential-calculus/newtons-method" />
        </>
    );
}
