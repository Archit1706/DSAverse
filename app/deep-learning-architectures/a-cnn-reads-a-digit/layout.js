import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: 'A CNN Reads a Digit – Every Layer of a Real MNIST Network',
    description: 'Follow a real convolutional network, trained on MNIST to 99% accuracy, through every layer as it reads a handwritten digit: standardised pixels, 8 then 16 feature maps, pooling, 784 flattened values, the dense layers and softmax. Then draw your own digit and watch it answer.',
    keywords: ['CNN', 'convolutional neural network', 'MNIST', 'digit recognition', 'feature maps', 'softmax', 'parameters', 'draw a digit', 'handwriting recognition', 'deep learning'],
    openGraph: {
        title: 'A CNN Reads a Digit – DSAverse',
        description: 'A real MNIST-trained CNN, layer by layer, in your browser. Draw a digit and watch every feature map.',
        images: [{ url: '/og-image.png' }],
    },
    alternates: { canonical: '/deep-learning-architectures/a-cnn-reads-a-digit' },
};

export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/deep-learning-architectures/a-cnn-reads-a-digit" />
        </>
    );
}
