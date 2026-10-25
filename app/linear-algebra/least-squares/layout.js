import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: 'Least Squares Visualizer – Line Fitting as Projection',
    description: 'Drag data points and watch the least-squares line refit, with residuals and their squares drawn. Then see the same fit in 3D as a projection of b onto the column space, with the residual perpendicular to it.',
    keywords: ['least squares', 'linear regression', 'normal equations', 'projection', 'column space', 'residuals', 'line of best fit'],
    openGraph: {
        title: 'Least Squares as Projection – DSAverse',
        description: 'The best-fit line is a projection, and the residuals stand perpendicular to the column space.',
        images: [{ url: '/og-image.png' }],
    },
    alternates: { canonical: '/linear-algebra/least-squares' },
};

export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/linear-algebra/least-squares" />
        </>
    );
}
