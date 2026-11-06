import Link from 'next/link';
import { ArrowLeft, Focus, Eye, KeyRound, Divide, EyeOff, LayoutGrid, Waves, Boxes, ArrowRightLeft, Cpu, Construction } from 'lucide-react';
import AiPathRibbon from '@/components/ml/AiPathRibbon';

export const metadata = {
    // Just the name: the root layout's "%s | DSAverse" template adds the suffix.
    title: 'Transformers',
    description: 'How a transformer works, one piece at a time: why attention replaced the seq2seq bottleneck, queries, keys and values, scaled dot-product attention, the causal mask, multi-head attention, positional encoding, the transformer block, cross-attention and a full forward pass through a real tiny GPT.',
};

/* AI cards describe a page by its key formula and the page it builds on, in
   place of time and space complexity. The order is the learning order:
   why attention exists, the mechanism, the pieces around it, then the whole
   model. */
const topics = [
    {
        name: 'Why Attention',
        slug: 'why-attention',
        icon: Eye,
        description: 'The seq2seq decoder had one vector to remember a whole sentence. Give it every encoder state and a way to choose, and the same toy translator goes from 44% to 100% of words right on long sentences.',
        formula: 'c_t = Σᵢ αₜᵢ hᵢ',
        prereq: 'Sequence-to-Sequence',
        pattern: 'Alignment',
        difficulty: 'Intermediate',
        available: true,
    },
    {
        name: 'Query, Key and Value',
        slug: 'query-key-and-value',
        icon: KeyRound,
        description: 'Drag a query arrow among four keys and watch the dot products, the softmax and the blended value move with it. Attention is a soft dictionary lookup, and here it fits on one plane.',
        formula: 'out = Σⱼ softmax(q · kⱼ) vⱼ',
        prereq: 'Why Attention',
        pattern: 'Soft lookup',
        difficulty: 'Beginner',
        available: true,
    },
    {
        name: 'Self-Attention',
        slug: 'self-attention',
        icon: Focus,
        description: 'Run a sentence through a small GPT trained for this site and follow one real head: the scores, the softmax and the blend that let "She" find the name it refers to.',
        formula: 'softmax(QKᵀ / √d) V',
        prereq: 'Query, Key and Value',
        pattern: 'Attention head',
        difficulty: 'Intermediate',
        available: true,
    },
    {
        name: 'Scaled Dot-Product Attention',
        slug: 'scaled-dot-product-attention',
        icon: Divide,
        description: 'The whole computation as four matrix steps with their shapes: QKᵀ, ÷√d, mask, softmax, ×V. Then raise the head size and watch softmax saturate when the √d is left out.',
        formula: 'Attention(Q, K, V) = softmax(QKᵀ / √dₖ) V',
        prereq: 'Self-Attention',
        pattern: 'Matrix form',
        difficulty: 'Intermediate',
        available: true,
    },
    {
        name: 'Causal Masking',
        slug: 'causal-masking',
        icon: EyeOff,
        description: 'Why a GPT may only look back. Remove the triangle of −∞ and every earlier prediction changes when you edit a later word — the model would be reading the answer it is meant to predict.',
        formula: 'Sᵢⱼ = −∞ for j > i',
        prereq: 'Scaled Dot-Product Attention',
        pattern: 'Masking',
        difficulty: 'Intermediate',
        available: true,
    },
    {
        name: 'Multi-Head Attention',
        slug: 'multi-head-attention',
        icon: LayoutGrid,
        description: 'Split 64 numbers into four heads of 16, let each attend on its own, join them and mix with W_O. The tiny GPT\'s real heads, side by side, and what the model loses when you switch one off.',
        formula: 'MultiHead = concat(head₁, …, headₕ) W_O',
        prereq: 'Causal Masking',
        pattern: 'Parallel heads',
        difficulty: 'Intermediate',
        available: true,
    },
    {
        name: 'Positional Encoding',
        slug: 'positional-encoding',
        icon: Waves,
        description: 'Attention ignores order until you add it. Sinusoids, the tiny GPT\'s learned positions, rotary embeddings, and what happens to its predictions when the positions are taken away.',
        formula: 'PE(p, 2i) = sin(p / 10000^(2i/d))',
        prereq: 'Multi-Head Attention',
        pattern: 'Order',
        difficulty: 'Intermediate',
        available: true,
    },
    {
        name: 'The Transformer Block',
        slug: 'the-transformer-block',
        icon: Boxes,
        description: 'Attention, add and norm, feed-forward, add and norm, with the shape [T, d] at every arrow. Watch the residual stream carry each token through the block and what attention and the FFN each add to it.',
        formula: 'x + Attn(LN(x)), then x + FFN(LN(x))',
        prereq: 'Positional Encoding',
        pattern: 'Residual stream',
        difficulty: 'Advanced',
        available: true,
    },
    {
        name: 'Encoder-Decoder and Cross-Attention',
        slug: 'encoder-decoder-and-cross-attention',
        icon: ArrowRightLeft,
        description: 'BERT reads both ways, GPT only looks back, T5 does both and joins them with cross-attention: the decoder\'s queries against the encoder\'s keys and values. Three mask patterns, one mechanism.',
        formula: 'softmax(Q_dec K_encᵀ / √d) V_enc',
        prereq: 'The Transformer Block',
        pattern: 'Architecture families',
        difficulty: 'Advanced',
        available: true,
    },
    {
        name: 'Inside a Tiny GPT',
        slug: 'inside-a-tiny-gpt',
        icon: Cpu,
        description: 'The capstone: a full forward pass through a real 195,136-parameter GPT, from token ids to the next-word probabilities. Open any head or any feed-forward neuron and see what it does.',
        formula: 'logits = LN(x_L) W_Eᵀ',
        prereq: 'The Transformer Block',
        pattern: 'Full forward pass',
        difficulty: 'Advanced',
        available: true,
    },
];

const getDifficultyColor = (d) => {
    if (d === 'Beginner') return 'bg-green-500/15 text-green-400';
    if (d === 'Intermediate') return 'bg-yellow-500/15 text-yellow-400';
    return 'bg-red-500/15 text-red-400';
};

export default function TransformersPage() {
    return (
        <div className="min-h-screen bg-slate-950">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-500 to-violet-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                    <Link href="/" className="flex items-center text-white hover:text-indigo-100 transition-colors mb-8 w-fit">
                        <ArrowLeft className="h-5 w-5 mr-2" />Back to Home
                    </Link>
                    <div className="text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/20 mb-6">
                            <Focus className="h-8 w-8 text-white" />
                        </div>
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">Transformers</h1>
                        <p className="text-xl text-indigo-50 max-w-3xl mx-auto">
                            One idea — let every token decide which other tokens to read from — and a few pieces that make it trainable.
                            Every page here runs on the same small GPT, so every number you see is the real one.
                        </p>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
                <AiPathRibbon current="transformers" />
            </div>

            {/* Cards */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {topics.map(topic => {
                        const Icon = topic.available ? topic.icon : Construction;
                        const card = (
                            <div className="h-full flex flex-col bg-slate-900/70 rounded-2xl border border-slate-700/50 overflow-hidden hover:border-indigo-500/50 transition-colors group">
                                <div className={`bg-gradient-to-br from-indigo-500 to-violet-600 p-6 ${!topic.available ? 'opacity-60' : ''}`}>
                                    <div className="flex items-center justify-between">
                                        <Icon className="h-8 w-8 text-white" />
                                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${getDifficultyColor(topic.difficulty)}`}>
                                            {topic.difficulty}
                                        </span>
                                    </div>
                                    <h3 className="text-xl font-bold text-white mt-3">{topic.name}</h3>
                                    {!topic.available && (
                                        <span className="text-xs text-indigo-50/70">Coming Soon</span>
                                    )}
                                </div>
                                <div className="flex-1 flex flex-col p-6 gap-4">
                                    <p className="text-slate-400 text-sm leading-relaxed">{topic.description}</p>
                                    <div className="mt-auto space-y-2 text-sm">
                                        <div className="flex justify-between items-start gap-3">
                                            <span className="text-slate-500 flex-shrink-0">Key formula</span>
                                            <code className="bg-indigo-500/15 text-indigo-300 px-2 py-0.5 rounded text-xs text-right">{topic.formula}</code>
                                        </div>
                                        <div className="flex justify-between items-start gap-3">
                                            <span className="text-slate-500 flex-shrink-0">Builds on</span>
                                            <code className="bg-indigo-500/15 text-indigo-300 px-2 py-0.5 rounded text-xs text-right">{topic.prereq}</code>
                                        </div>
                                        <div className="flex justify-between items-start gap-3">
                                            <span className="text-slate-500 flex-shrink-0">Pattern</span>
                                            <code className="bg-indigo-500/15 text-indigo-300 px-2 py-0.5 rounded text-xs text-right">{topic.pattern}</code>
                                        </div>
                                    </div>
                                    {!topic.available ? (
                                        <span className="text-slate-500 text-sm">Coming Soon</span>
                                    ) : (
                                        <div className="flex items-center gap-2 text-indigo-400 text-sm font-medium group-hover:text-indigo-300 transition-colors">
                                            Start Visualization →
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                        return topic.available ? (
                            <Link key={topic.slug} href={`/transformers/${topic.slug}`} className="h-full flex flex-col">{card}</Link>
                        ) : (
                            <div key={topic.slug} className="h-full flex flex-col opacity-50 cursor-not-allowed">{card}</div>
                        );
                    })}
                </div>
            </div>

            {/* Why Learn */}
            <div className="border-t border-slate-700/50 bg-slate-900/70">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <h2 className="text-2xl font-bold text-white mb-8 text-center">Why Learn Transformers?</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                        {[
                            { title: 'The Architecture Behind Everything', body: 'GPT, BERT, T5, Llama and Claude are all stacks of the same block. Its pieces — attention, masks, heads, positions, residuals — are few, and each one is small enough to watch working.' },
                            { title: 'Real Numbers, Not Diagrams', body: 'Every page runs the same 195,136-parameter GPT trained for this site. Take a piece out — the mask, the positions, a head, the √d — and the predictions change in ways you can measure.' },
                            { title: 'The Road to Language Models', body: 'Once a block makes sense, a language model is that block repeated, read out as next-word probabilities and sampled. The next section starts from exactly the model you take apart here.' },
                        ].map(item => (
                            <div key={item.title} className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50">
                                <h3 className="text-indigo-400 font-semibold mb-2">{item.title}</h3>
                                <p className="text-slate-400 leading-relaxed">{item.body}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
