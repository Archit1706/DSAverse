import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: 'Limits Visualizer – One-Sided Limits, Holes, Jumps and ε–δ',
    description: 'Approach x = 1 from the left and from the right and watch f(x) settle — or not. A removable hole, a jump and a vertical asymptote side by side, then an ε–δ band you can tighten to see what the precise definition of a limit demands.',
    keywords: ['limits', 'limit of a function', 'one-sided limits', 'removable discontinuity', 'jump discontinuity', 'vertical asymptote', 'epsilon delta', 'limit visualization', 'calculus'],
    openGraph: {
        title: 'Limits: Approaching from Both Sides – DSAverse',
        description: 'A hole, a jump and an asymptote, approached from the left and the right — then the ε–δ game that makes "close" precise.',
        images: [{ url: '/og-image.png' }],
    },
    alternates: { canonical: '/differential-calculus/limits' },
};

export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/differential-calculus/limits" />
        </>
    );
}
