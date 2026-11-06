import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: 'Optimizers – SGD, Momentum, RMSProp and Adam Racing Down the Same Loss Surface',
    description: 'Run SGD, momentum, RMSProp and Adam from the same start on a narrow ravine and watch every update: the zig-zag that caps SGD, the velocity that carries momentum past the floor, the per-coordinate step sizes of RMSProp and Adam, and what happens when the ravine is turned 45°.',
    keywords: ['optimizers', 'SGD', 'momentum', 'RMSProp', 'Adam', 'bias correction', 'learning rate', 'loss surface', 'gradient descent', 'neural networks'],
    openGraph: {
        title: 'Optimizers – DSAverse',
        description: 'Four optimizers, one ravine, every update computed in your browser. Then turn the ravine 45° and watch Adam lose its lead.',
        images: [{ url: '/og-image.png' }],
    },
    alternates: { canonical: '/neural-networks/optimizers' },
};

export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/neural-networks/optimizers" />
        </>
    );
}
