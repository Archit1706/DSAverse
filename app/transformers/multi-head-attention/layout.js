import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: 'Multi-Head Attention – Four Heads, Same Parameters',
    description: 'Split Q, K and V into four column blocks, attend in each, concatenate and mix with W_O. A real tiny GPT\'s twelve heads side by side, what each one measurably does, and how much the model loses when you switch one off.',
    keywords: ['multi-head attention', 'attention heads', 'W_O', 'concatenate heads', 'head pruning', 'transformer', 'GPT', 'num_heads'],
    alternates: { canonical: '/transformers/multi-head-attention' },
};

export default function Layout({ children }) {
    return (<>{children}<RelatedPages route="/transformers/multi-head-attention" /></>);
}
