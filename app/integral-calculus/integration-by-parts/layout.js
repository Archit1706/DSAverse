import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: 'Integration by Parts Visualizer – ∫ u dv = uv − ∫ v du',
    description: 'See integration by parts as a picture: trace the curve (u, v), and the rectangle uv under its end point splits into ∫ u dv on one side of the curve and ∫ v du on the other. Worked on ∫ x cos x dx, ∫ ln x dx and ∫ x eˣ dx.',
    keywords: ['integration by parts', 'integration by parts formula', 'uv minus integral v du', 'product rule integration', 'integral of ln x', 'integral of x cos x', 'calculus visualization'],
    openGraph: {
        title: 'Integration by Parts as a Picture – DSAverse',
        description: 'Two regions that together fill the rectangle uv: ∫ u dv + ∫ v du = uv.',
        images: [{ url: '/og-image.png' }],
    },
    alternates: { canonical: '/integral-calculus/integration-by-parts' },
};

export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/integral-calculus/integration-by-parts" />
        </>
    );
}
