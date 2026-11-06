import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: 'Causal Masking – Why a GPT May Only Look Back',
    description: 'A GPT learns to predict every next token in one pass, and a triangle of −∞ keeps each position from reading its own answer. Edit a word in a real tiny GPT\'s input and see exactly which predictions can change, with and without the mask.',
    keywords: ['causal mask', 'attention mask', 'autoregressive', 'GPT', 'look-ahead mask', 'triangular mask', 'next token prediction', 'KV cache'],
    alternates: { canonical: '/transformers/causal-masking' },
};

export default function Layout({ children }) {
    return (<>{children}<RelatedPages route="/transformers/causal-masking" /></>);
}
