import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: 'Sequence-to-Sequence – The Encoder–Decoder Bottleneck',
    description: 'A GRU encoder reads a sentence into one vector of 32 numbers and a GRU decoder writes its translation. Step through a trained toy translator word by word, watch quality fall as sentences grow, swap the vector to see it is the whole message, and meet the attention that fixes it.',
    keywords: ['sequence to sequence', 'seq2seq', 'encoder decoder', 'machine translation', 'GRU', 'bottleneck', 'teacher forcing', 'attention', 'deep learning'],
    openGraph: {
        title: 'Sequence-to-Sequence – DSAverse',
        description: 'A trained encoder–decoder translating word by word, and where its single vector runs out.',
        images: [{ url: '/og-image.png' }],
    },
    alternates: { canonical: '/deep-learning-architectures/sequence-to-sequence' },
};

export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/deep-learning-architectures/sequence-to-sequence" />
        </>
    );
}
