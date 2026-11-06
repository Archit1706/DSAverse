import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: 'Scaled Dot-Product Attention – softmax(QKᵀ / √d) V, Step by Step',
    description: 'The attention formula as four matrix steps — QKᵀ, ÷√d, the causal mask, softmax, × V — with the shape at every step and a real tiny GPT\'s numbers in every cell. Then why the √d is there, and what the model does without it.',
    keywords: ['scaled dot-product attention', 'QK transpose', 'sqrt d', 'attention formula', 'softmax saturation', 'causal mask', 'transformer', 'attention matrix shapes'],
    alternates: { canonical: '/transformers/scaled-dot-product-attention' },
};

export default function Layout({ children }) {
    return (<>{children}<RelatedPages route="/transformers/scaled-dot-product-attention" /></>);
}
