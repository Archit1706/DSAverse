import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: 'Convolution – A Sliding Dot Product, Step by Step',
    description: 'Slide a 3×3 kernel over a picture and watch every multiply-add. Edit the kernel, change the stride and padding, and see the output size follow ⌊(n + 2p − k) / s⌋ + 1 — the operation at the heart of every convolutional neural network.',
    keywords: ['convolution', 'convolutional neural network', 'CNN', 'kernel', 'filter', 'stride', 'padding', 'feature map', 'edge detection', 'weight sharing', 'conv2d'],
    openGraph: {
        title: 'Convolution – DSAverse',
        description: 'A convolution is a sliding dot product with the same weights everywhere. Watch every multiply-add, then edit the kernel yourself.',
        images: [{ url: '/og-image.png' }],
    },
    alternates: { canonical: '/deep-learning-architectures/convolution' },
};

export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/deep-learning-architectures/convolution" />
        </>
    );
}
