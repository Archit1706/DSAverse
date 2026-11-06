import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: 'Inside a Tiny GPT – A Whole Forward Pass, Every Number',
    description: 'A real 195,136-number GPT run end to end in your browser: tokens, embeddings, three transformer blocks, the final LayerNorm and the tied unembedding, probabilities and generation. Then inspect any attention head or any of its 768 FFN neurons.',
    keywords: ['GPT forward pass', 'tiny GPT', 'transformer internals', 'weight tying', 'logits', 'attention heads', 'neurons', 'language model'],
    alternates: { canonical: '/transformers/inside-a-tiny-gpt' },
};

export default function Layout({ children }) {
    return (<>{children}<RelatedPages route="/transformers/inside-a-tiny-gpt" /></>);
}
