import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export const metadata = {
    title: { template: '%s – Transformers | DSAverse', default: 'Transformers | DSAverse' },
    description: 'Interactive transformers: why attention replaced the seq2seq bottleneck, queries, keys and values, scaled dot-product attention, the causal mask, multi-head attention, positional encoding, the transformer block and cross-attention — all inside a real tiny GPT running in your browser.',
    keywords: ['transformer', 'attention', 'self-attention', 'query key value', 'scaled dot-product attention', 'causal mask', 'multi-head attention', 'positional encoding', 'RoPE', 'transformer block', 'cross-attention', 'GPT', 'transformer visualization'],
    openGraph: {
        title: 'Transformers – DSAverse',
        description: 'Attention, masks, heads, positions and blocks — every number computed by a small GPT running in your browser.',
        images: [{ url: '/og-image.png', width: 1200, height: 630 }],
    },
    alternates: { canonical: '/transformers' },
};

export default function TransformersLayout({ children }) {
    return (
        <>
            <Navbar />
            <main className="pt-16">{children}</main>
            <Footer />
        </>
    );
}
