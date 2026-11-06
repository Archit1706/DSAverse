import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: 'LSTM and GRU – Gated Memory With Real Gate Values',
    description: 'A plain RNN, an LSTM and a GRU trained to hold one number while random inputs stream past. Step through the real forget, input and update gate values, see c = f ⊙ c₋ + i ⊙ g with every number filled in, measure how far each network\'s memory lasts, and pin the forget gate to watch it leak.',
    keywords: ['LSTM', 'GRU', 'long short-term memory', 'gated recurrent unit', 'forget gate', 'input gate', 'update gate', 'cell state', 'vanishing gradient', 'recurrent neural network', 'deep learning'],
    openGraph: {
        title: 'LSTM and GRU – DSAverse',
        description: 'Trained gates holding a number while noise streams past, with every gate value on screen.',
        images: [{ url: '/og-image.png' }],
    },
    alternates: { canonical: '/deep-learning-architectures/lstm-and-gru' },
};

export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/deep-learning-architectures/lstm-and-gru" />
        </>
    );
}
