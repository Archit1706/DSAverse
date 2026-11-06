import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: 'Pooling and Feature Maps – Inside a Real Digit CNN',
    description: 'Watch a real MNIST-trained CNN build feature maps, max-pool and average-pool them window by window, stack 8 then 16 channels, and grow its receptive field from 3 to 10 pixels. Then shift the digit and measure how much pooling really forgives.',
    keywords: ['pooling', 'max pooling', 'average pooling', 'feature maps', 'channels', 'receptive field', 'CNN', 'MNIST', 'shift invariance', 'convolutional neural network'],
    openGraph: {
        title: 'Pooling and Feature Maps – DSAverse',
        description: 'Max and average pooling, channel stacks and receptive fields, computed by a real digit-reading CNN in your browser.',
        images: [{ url: '/og-image.png' }],
    },
    alternates: { canonical: '/deep-learning-architectures/pooling-and-feature-maps' },
};

export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/deep-learning-architectures/pooling-and-feature-maps" />
        </>
    );
}
