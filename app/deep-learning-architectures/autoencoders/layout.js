import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: 'Autoencoders – Squeezing a Picture Through Two Numbers',
    description: 'Train an autoencoder in your browser that squeezes 144-pixel pictures through a two-number code and rebuilds them. Watch the code map lay itself out by blob position, drag a point to decode any code, and see why halfway between two pictures is not their pixel average.',
    keywords: ['autoencoder', 'bottleneck', 'latent space', 'encoder decoder', 'representation learning', 'dimensionality reduction', 'latent interpolation', 'PCA vs autoencoder', 'deep learning'],
    openGraph: {
        title: 'Autoencoders – DSAverse',
        description: 'A 144 → 2 → 144 autoencoder trained in your browser, with a draggable code map.',
        images: [{ url: '/og-image.png' }],
    },
    alternates: { canonical: '/deep-learning-architectures/autoencoders' },
};

export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/deep-learning-architectures/autoencoders" />
        </>
    );
}
