import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: 'Gradient Descent Visualizer – Learning Rate on a 3D Loss Surface',
    description: 'Watch a ball step down a 3D loss surface and its contour map with gradient descent. Slide the learning rate from too small to well chosen to zigzagging to divergent, and see why the stability limit is 2 divided by the steepest curvature — the calculus behind training neural networks.',
    keywords: ['gradient descent', 'learning rate', 'loss surface', 'machine learning optimization', 'divergence', 'stability limit', 'contour plot', 'neural network training', 'calculus visualization'],
    openGraph: {
        title: 'Gradient Descent on a Loss Surface – DSAverse',
        description: 'Feel the slope, step downhill, repeat. Too small crawls, too large blows up — and 2/λmax is where it breaks.',
        images: [{ url: '/og-image.png' }],
    },
    alternates: { canonical: '/differential-calculus/gradient-descent' },
};

export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/differential-calculus/gradient-descent" />
        </>
    );
}
