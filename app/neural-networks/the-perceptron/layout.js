import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: 'The Perceptron – One Neuron, Trained Live, and Why It Cannot Learn XOR',
    description: 'Watch a perceptron learn point by point: a weighted sum, a threshold, and an update only on mistakes. See it converge on separable data, loop forever on XOR, and stop far from the widest-margin line.',
    keywords: ['perceptron', 'perceptron learning rule', 'artificial neuron', 'linear classifier', 'XOR problem', 'linearly separable', 'margin', 'Rosenblatt', 'neural networks'],
    openGraph: {
        title: 'The Perceptron – DSAverse',
        description: 'On 200 separable datasets the perceptron stopped with a median 28% of the widest possible margin. It finds a line, not the best one — and on XOR it never stops.',
        images: [{ url: '/og-image.png' }],
    },
    alternates: { canonical: '/neural-networks/the-perceptron' },
};

export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/neural-networks/the-perceptron" />
        </>
    );
}
