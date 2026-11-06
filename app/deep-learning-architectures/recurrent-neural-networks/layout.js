import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: 'Recurrent Neural Networks – A Network With a Loop, Trained in Your Browser',
    description: 'Watch a two-unit recurrent neural network learn to count 1s in a bit string, trained live in your browser. Step through h = tanh(W h + U x + b) one bit at a time with every number shown, see what the hidden state holds, how backpropagation through time works, and where its memory runs out.',
    keywords: ['recurrent neural network', 'RNN', 'hidden state', 'backpropagation through time', 'BPTT', 'sequence model', 'unrolled network', 'tanh saturation', 'deep learning'],
    openGraph: {
        title: 'Recurrent Neural Networks – DSAverse',
        description: 'A two-unit RNN trained in your browser to count, stepped through one bit at a time with every number on screen.',
        images: [{ url: '/og-image.png' }],
    },
    alternates: { canonical: '/deep-learning-architectures/recurrent-neural-networks' },
};

export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/deep-learning-architectures/recurrent-neural-networks" />
        </>
    );
}
