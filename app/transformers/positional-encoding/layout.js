import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: 'Positional Encoding – Learned, Sinusoidal and RoPE',
    description: 'Attention alone treats a sentence as a bag of words. See a real tiny GPT give a sentence and its reversal the same prediction, then the three fixes: learned position vectors, sinusoids whose dot product depends only on distance, and RoPE rotations.',
    keywords: ['positional encoding', 'sinusoidal position encoding', 'RoPE', 'rotary position embedding', 'learned position embeddings', 'transformer', 'relative position', 'GPT'],
    alternates: { canonical: '/transformers/positional-encoding' },
};

export default function Layout({ children }) {
    return (<>{children}<RelatedPages route="/transformers/positional-encoding" /></>);
}
