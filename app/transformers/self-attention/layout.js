import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: 'Self-Attention – Inside a Real Transformer Head',
    description: 'Run a sentence through a small GPT trained for this site and watch one attention head work: queries, keys and values, the q·k/√d scores, the causal mask, softmax and the weighted blend — every number computed live. Click any cell to see its arithmetic.',
    keywords: ['self-attention', 'attention mechanism', 'transformer', 'query key value', 'attention weights', 'scaled dot-product attention', 'causal mask', 'GPT', 'attention head'],
    openGraph: {
        title: 'Self-Attention – DSAverse',
        description: 'Each token rebuilds itself from the tokens it finds relevant. Watch a real attention head find who "She" refers to.',
        images: [{ url: '/og-image.png' }],
    },
    alternates: { canonical: '/transformers/self-attention' },
};

export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/transformers/self-attention" />
        </>
    );
}
