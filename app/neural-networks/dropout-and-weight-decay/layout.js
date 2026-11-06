import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: 'Dropout and Weight Decay – Train a Network That Memorises, Then Stop It',
    description: 'A 697-parameter network trained live on 30 noisy points memorises them: training loss near 0, validation loss climbing. Add weight decay (w ← 0.99w − η∂L/∂w) or dropout (half the units off each step, survivors doubled) and watch the boundary calm down, with every loss, weight and mask computed in your browser.',
    keywords: ['dropout', 'weight decay', 'L2 regularization', 'regularization', 'overfitting', 'inverted dropout', 'model.eval', 'neural networks', 'generalization'],
    openGraph: {
        title: 'Dropout and Weight Decay – DSAverse',
        description: 'Watch a network memorise 30 noisy points, then rein it in with weight decay or dropout — trained live in your browser.',
        images: [{ url: '/og-image.png' }],
    },
    alternates: { canonical: '/neural-networks/dropout-and-weight-decay' },
};

export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/neural-networks/dropout-and-weight-decay" />
        </>
    );
}
