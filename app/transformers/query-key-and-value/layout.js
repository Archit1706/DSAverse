import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: 'Query, Key and Value – Attention as a Soft Lookup',
    description: 'Drag a query among four keys and watch the dot products, the softmax weights and the blended value move with it. Attention is a soft dictionary lookup: score every key, weigh, and average the values.',
    keywords: ['query key value', 'attention', 'soft lookup', 'dot product attention', 'softmax', 'weighted average', 'transformer', 'Q K V'],
    alternates: { canonical: '/transformers/query-key-and-value' },
};

export default function Layout({ children }) {
    return (<>{children}<RelatedPages route="/transformers/query-key-and-value" /></>);
}
