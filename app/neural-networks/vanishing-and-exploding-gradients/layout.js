import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: 'Vanishing and Exploding Gradients – Following a Gradient Back Through 12 Layers',
    description: 'Follow a gradient backwards through a 12-layer network and watch it multiply by one factor per layer: shrinking to 10⁻¹¹ with sigmoid, still vanishing with ReLU at PyTorch’s default weight scale, exploding when the weights are twice too big, and keeping its size with He initialisation. Every number computed in your browser.',
    keywords: ['vanishing gradients', 'exploding gradients', 'backpropagation', 'sigmoid', 'ReLU', 'He initialization', 'Xavier initialization', 'weight initialization', 'deep networks', 'neural networks'],
    openGraph: {
        title: 'Vanishing and Exploding Gradients – DSAverse',
        description: 'One factor per layer, multiplied twelve times. Watch the gradient vanish, explode, and then keep its size once the weights are scaled right.',
        images: [{ url: '/og-image.png' }],
    },
    alternates: { canonical: '/neural-networks/vanishing-and-exploding-gradients' },
};

export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/neural-networks/vanishing-and-exploding-gradients" />
        </>
    );
}
