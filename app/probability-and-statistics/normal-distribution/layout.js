import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: 'Normal Distribution Visualizer – μ, σ, z-Scores and the 68–95–99.7 Rule',
    description: 'Drag the peak of a bell curve to set its mean and spread, drag two points along the axis, and read off the area between them. See the 68–95–99.7 rule, z-scores, and P(a ≤ X ≤ b) = Φ(z_b) − Φ(z_a) with live numbers.',
    keywords: ['normal distribution', 'bell curve', 'gaussian', 'z-score', '68 95 99.7 rule', 'standard deviation', 'area under the curve', 'standard normal', 'statistics'],
    openGraph: {
        title: 'Normal Distribution – DSAverse',
        description: 'Drag the bell curve, drag the bounds, read the area. The 68–95–99.7 rule and z-scores from one picture.',
        images: [{ url: '/og-image.png' }],
    },
    alternates: { canonical: '/probability-and-statistics/normal-distribution' },
};

export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/probability-and-statistics/normal-distribution" />
        </>
    );
}
