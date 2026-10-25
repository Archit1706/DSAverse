import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: 'Partial Derivatives and Gradients – Slices, Contours and ∇f',
    description: 'Slice a 3D surface z = f(x, y) along x and along y to see the two partial derivatives as slopes, then combine them into the gradient. On the contour map, the gradient always crosses the level curves at right angles and points up the steepest climb.',
    keywords: ['partial derivatives', 'gradient', 'gradient vector', 'contour map', 'level curves', 'directional derivative', 'multivariable calculus', '3D surface', 'calculus visualization'],
    openGraph: {
        title: 'Partial Derivatives and Gradients – DSAverse',
        description: 'Two slices of a surface give two slopes; together they make the gradient — perpendicular to every contour, pointing straight uphill.',
        images: [{ url: '/og-image.png' }],
    },
    alternates: { canonical: '/differential-calculus/partial-derivatives-and-gradients' },
};

export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/differential-calculus/partial-derivatives-and-gradients" />
        </>
    );
}
