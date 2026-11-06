import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: 'Forward Pass – Trace One Input Through a Trained Neural Network, Multiply by Multiply',
    description: 'Follow two numbers through a trained 2-3-2 network that solves XOR: three weighted sums, three ReLUs, two scores and a softmax, every product shown. Then the same arithmetic as matrix products over a batch and the whole plane.',
    keywords: ['forward pass', 'feedforward neural network', 'softmax', 'logits', 'ReLU', 'matrix multiplication', 'weights and biases', 'XOR', 'batch', 'neural networks'],
    openGraph: {
        title: 'Forward Pass – DSAverse',
        description: 'Seventeen numbers solve XOR. Trace a point through them by hand — then watch the same network give 0.99 to most points on a circle four times wider than any data it saw.',
        images: [{ url: '/og-image.png' }],
    },
    alternates: { canonical: '/neural-networks/forward-pass' },
};

export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/neural-networks/forward-pass" />
        </>
    );
}
