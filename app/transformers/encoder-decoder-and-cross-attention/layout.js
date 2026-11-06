import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: 'Encoder–Decoder and Cross-Attention – BERT, GPT and T5',
    description: 'Encoder-only models read both ways, decoder-only models write forwards, and encoder–decoder models join the two with cross-attention: decoder queries against encoder keys and values. Real cross-attention weights from a trained English-to-French translator.',
    keywords: ['cross-attention', 'encoder-decoder', 'BERT', 'GPT', 'T5', 'decoder-only', 'encoder-only', 'transformer architecture'],
    alternates: { canonical: '/transformers/encoder-decoder-and-cross-attention' },
};

export default function Layout({ children }) {
    return (<>{children}<RelatedPages route="/transformers/encoder-decoder-and-cross-attention" /></>);
}
