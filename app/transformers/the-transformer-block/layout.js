import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: 'The Transformer Block – LayerNorm, Attention, FFN and the Residual Stream',
    description: 'One block of a real tiny GPT, step by step: LayerNorm, attention, add, LayerNorm, a 64 → 256 → 64 feed-forward network, add. The shape of every matrix, the residual stream growing block by block, and what the model loses without the additions.',
    keywords: ['transformer block', 'residual stream', 'layer normalization', 'pre-norm', 'feed-forward network', 'add and norm', 'logit lens', 'GPT'],
    alternates: { canonical: '/transformers/the-transformer-block' },
};

export default function Layout({ children }) {
    return (<>{children}<RelatedPages route="/transformers/the-transformer-block" /></>);
}
