import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: 'Normalization – Batch Norm and Layer Norm on a Batch You Can Read',
    description: 'Batch norm and layer norm computed step by step on a batch of 6 examples and 4 units: the means, the spreads, x̂ = (x − μ) / √(σ² + ε), and γ and β. See how batch norm ties each example to its batch mates, what a batch of 2 or 1 does, why inference uses running averages, and how batch norm keeps a 10-layer network’s activations and gradients from vanishing at any weight scale.',
    keywords: ['batch normalization', 'layer normalization', 'batch norm', 'layer norm', 'gamma and beta', 'running mean', 'internal covariate shift', 'deep networks', 'neural networks'],
    openGraph: {
        title: 'Normalization – DSAverse',
        description: 'Subtract the mean, divide by the spread, then let γ and β put back what training wants — computed on a batch small enough to read.',
        images: [{ url: '/og-image.png' }],
    },
    alternates: { canonical: '/neural-networks/normalization' },
};

export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/neural-networks/normalization" />
        </>
    );
}
