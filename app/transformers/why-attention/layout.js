import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: 'Why Attention – From the Seq2Seq Bottleneck to Looking Back',
    description: 'A seq2seq decoder must remember a whole sentence in one vector. Give it every encoder state and attention to choose among them, and a small trained translator goes from 44% to 100% of words right on long sentences. Step through the real scores, weights and context vector.',
    keywords: ['why attention', 'attention mechanism', 'seq2seq bottleneck', 'Luong attention', 'Bahdanau attention', 'alignment', 'context vector', 'encoder-decoder', 'attention visualization'],
    alternates: { canonical: '/transformers/why-attention' },
};

export default function Layout({ children }) {
    return (<>{children}<RelatedPages route="/transformers/why-attention" /></>);
}
