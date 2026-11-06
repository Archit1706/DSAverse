import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: 'Residual Connections – Why Deep Networks Need Skips',
    description: 'Four plain layers fit a spiral; twenty cannot even fit the training data. Watch the points merge and the gradient vanish in a deep plain network trained in your browser, follow one gradient down the skip connections unit by unit, and train plain and residual stacks side by side at any depth.',
    keywords: ['residual connections', 'skip connections', 'ResNet', 'degradation problem', 'vanishing gradient', 'deep networks', 'residual block', 'identity mapping', 'deep learning'],
    openGraph: {
        title: 'Residual Connections – DSAverse',
        description: 'Plain and residual stacks trained side by side in your browser, with the gradient at every layer.',
        images: [{ url: '/og-image.png' }],
    },
    alternates: { canonical: '/deep-learning-architectures/residual-connections' },
};

export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/deep-learning-architectures/residual-connections" />
        </>
    );
}
