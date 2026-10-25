import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: 'Integration by Substitution – u-Substitution as Stretching the Axis',
    description: 'See u-substitution as a change of variable that stretches the axis: each thin strip under g(x) = f(u(x))·u′(x) maps to a strip under f(u) that is u′ times as wide and u′ times shorter, so every area — and the integral — is preserved.',
    keywords: ['integration by substitution', 'u-substitution', 'change of variable', 'substitution rule', 'du = u\'(x) dx', 'definite integral substitution limits', 'calculus visualization'],
    openGraph: {
        title: 'Integration by Substitution – DSAverse',
        description: 'Change the variable and the axis stretches — but every strip keeps its area.',
        images: [{ url: '/og-image.png' }],
    },
    alternates: { canonical: '/integral-calculus/integration-by-substitution' },
};

export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/integral-calculus/integration-by-substitution" />
        </>
    );
}
