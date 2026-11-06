import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export const metadata = {
    title: { template: '%s – Deep Learning Architectures | DSAverse', default: 'Deep Learning Architectures | DSAverse' },
    description: 'Interactive deep learning architectures: slide a convolution kernel, watch a real CNN read your handwriting, unroll recurrent networks and LSTM gates, squeeze a sentence through a seq2seq encoder, train deep nets with and without residual connections, and drag a point through an autoencoder\'s latent space.',
    keywords: ['deep learning', 'convolutional neural network', 'CNN', 'convolution', 'pooling', 'recurrent neural network', 'RNN', 'LSTM', 'GRU', 'sequence to sequence', 'residual connection', 'ResNet', 'autoencoder', 'deep learning visualization'],
    openGraph: {
        title: 'Deep Learning Architectures – DSAverse',
        description: 'Convolutions, recurrence, gates, skips and bottlenecks — every number computed by a network running in your browser.',
        images: [{ url: '/og-image.png', width: 1200, height: 630 }],
    },
    alternates: { canonical: '/deep-learning-architectures' },
};

export default function DeepLearningArchitecturesLayout({ children }) {
    return (
        <>
            <Navbar />
            <main className="pt-16">{children}</main>
            <Footer />
        </>
    );
}
