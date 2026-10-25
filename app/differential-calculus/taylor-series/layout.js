import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: 'Taylor Series Visualizer – Polynomials That Hug a Curve',
    description: 'Add Taylor terms one at a time and watch the polynomial hug sin x and eˣ over a wider and wider range. For ln(1 + x), see the radius of convergence: inside −1 < x ≤ 1 the polynomials close in, outside they swing further away with every term.',
    keywords: ['taylor series', 'maclaurin series', 'taylor polynomial', 'radius of convergence', 'power series', 'sin x series', 'exponential series', 'ln(1+x) series', 'calculus visualization'],
    openGraph: {
        title: 'Taylor Series: One Term at a Time – DSAverse',
        description: 'Polynomials that match a function\'s derivatives at a point — and the radius beyond which no number of terms will help.',
        images: [{ url: '/og-image.png' }],
    },
    alternates: { canonical: '/differential-calculus/taylor-series' },
};

export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/differential-calculus/taylor-series" />
        </>
    );
}
