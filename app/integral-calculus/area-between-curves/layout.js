import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: 'Area Between Curves Visualizer – Top Minus Bottom',
    description: 'Find where two curves intersect, then add up thin vertical strips of height top minus bottom. See why curves that swap places must be split at every crossing: x + 2 and x², sin x and cos x, √x and x².',
    keywords: ['area between curves', 'area between two curves', 'top minus bottom', 'intersection points', 'definite integral application', 'integral of absolute value', 'calculus visualization'],
    openGraph: {
        title: 'Area Between Curves – DSAverse',
        description: 'Strips of height top minus bottom, split wherever the curves cross.',
        images: [{ url: '/og-image.png' }],
    },
    alternates: { canonical: '/integral-calculus/area-between-curves' },
};

export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/integral-calculus/area-between-curves" />
        </>
    );
}
