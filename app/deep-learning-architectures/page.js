import Link from 'next/link';
import { ArrowLeft, Layers, Grid3x3, Shrink, PenLine, Repeat, DoorOpen, ArrowRightLeft, GitMerge, Minimize2, Construction } from 'lucide-react';
import AiPathRibbon from '@/components/ml/AiPathRibbon';

export const metadata = {
    // Just the name: the root layout's "%s | DSAverse" template adds the suffix.
    title: 'Deep Learning Architectures',
    description: 'The architectures that made deep learning work: convolution and pooling, a real CNN reading handwritten digits, recurrent networks, LSTM and GRU gates, sequence-to-sequence models, residual connections and autoencoders — every number computed in your browser.',
};

/* AI cards describe a page by its key formula and the page it builds on, in
   place of time and space complexity, as the Math indexes do. The order is
   the learning order: images first, then sequences, then the two ideas
   (skips and bottlenecks) every later architecture reuses. */
const architectures = [
    {
        name: 'Convolution',
        slug: 'convolution',
        icon: Grid3x3,
        description: 'Slide a 3×3 kernel over a picture and watch every multiply-add. The same nine weights are used at every position, which is what makes a convolution cheap and an edge detector work anywhere.',
        formula: 'y(i, j) = Σₐ Σᵦ w(a, b) · x(i + a, j + b)',
        prereq: 'Forward Pass',
        pattern: 'Sliding Dot Product',
        difficulty: 'Beginner',
        available: true,
    },
    {
        name: 'Pooling and Feature Maps',
        slug: 'pooling-and-feature-maps',
        icon: Shrink,
        description: 'Max and average pooling shrink a feature map, kernels stack into channels, and each layer down the network sees a wider patch of the image than the one before.',
        formula: 'RF = RF₍prev₎ + (k − 1) · jump',
        prereq: 'Convolution',
        pattern: 'Downsample and Stack',
        difficulty: 'Beginner',
        available: true,
    },
    {
        name: 'A CNN Reads a Digit',
        slug: 'a-cnn-reads-a-digit',
        icon: PenLine,
        description: 'Draw a digit and a real network trained on MNIST reads it: every feature map of every layer, then the ten probabilities. Edges first, then strokes, then digits.',
        formula: '28×28 → 8×14×14 → 16×7×7 → 32 → 10',
        prereq: 'Pooling and Feature Maps',
        pattern: 'Real Model',
        difficulty: 'Intermediate',
        available: true,
    },
    {
        name: 'Recurrent Neural Networks',
        slug: 'recurrent-neural-networks',
        icon: Repeat,
        description: 'Unroll a network over a sequence and carry its memory as a vector. Train one live to count, then see exactly where its memory runs out.',
        formula: 'hₜ = tanh(W hₜ₋₁ + U xₜ + b)',
        prereq: 'Backpropagation',
        pattern: 'Shared Weights Over Time',
        difficulty: 'Intermediate',
        available: true,
    },
    {
        name: 'LSTM and GRU',
        slug: 'lstm-and-gru',
        icon: DoorOpen,
        description: 'Gates are numbers between 0 and 1 that decide what to keep, forget and output. Watch trained gates hold one number while noise streams past, where a plain RNN drifts.',
        formula: 'cₜ = fₜ ⊙ cₜ₋₁ + iₜ ⊙ gₜ',
        prereq: 'Recurrent Neural Networks',
        pattern: 'Gated Memory',
        difficulty: 'Advanced',
        available: true,
    },
    {
        name: 'Sequence-to-Sequence',
        slug: 'sequence-to-sequence',
        icon: ArrowRightLeft,
        description: 'An encoder squeezes a whole sentence into one vector and a decoder writes the translation from it. The longer the sentence, the more gets lost — the problem attention was invented to fix.',
        formula: 'c = h_T,  yₜ = decoder(yₜ₋₁, sₜ₋₁, c)',
        prereq: 'LSTM and GRU',
        pattern: 'Encode, Then Decode',
        difficulty: 'Advanced',
        available: true,
    },
    {
        name: 'Residual Connections',
        slug: 'residual-connections',
        icon: GitMerge,
        description: 'Twenty plain layers fit a spiral worse than four. Train deep stacks with and without skip connections side by side, and watch adding the input back keep the gradient alive through every layer — the backbone of every transformer.',
        formula: 'hₗ₊₁ = hₗ + F(hₗ)',
        prereq: 'Vanishing and Exploding Gradients',
        pattern: 'Skip Connection',
        difficulty: 'Intermediate',
        available: true,
    },
    {
        name: 'Autoencoders',
        slug: 'autoencoders',
        icon: Minimize2,
        description: 'Squeeze 144 pixels through two numbers and back. Train it live, then drag a point around the two-number space and watch the decoder paint the picture it stands for.',
        formula: 'x̂ = decode(encode(x)),  L = ‖x − x̂‖²',
        prereq: 'Principal Component Analysis',
        pattern: 'Bottleneck',
        difficulty: 'Intermediate',
        available: true,
    },
];

const getDifficultyColor = (d) => {
    if (d === 'Beginner') return 'bg-green-500/15 text-green-400';
    if (d === 'Intermediate') return 'bg-yellow-500/15 text-yellow-400';
    return 'bg-red-500/15 text-red-400';
};

export default function DeepLearningArchitecturesPage() {
    return (
        <div className="min-h-screen bg-slate-950">
            {/* Header */}
            <div className="bg-gradient-to-r from-yellow-500 to-amber-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                    <Link href="/" className="flex items-center text-white hover:text-yellow-100 transition-colors mb-8 w-fit">
                        <ArrowLeft className="h-5 w-5 mr-2" />Back to Home
                    </Link>
                    <div className="text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/20 mb-6">
                            <Layers className="h-8 w-8 text-white" />
                        </div>
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">Deep Learning Architectures</h1>
                        <p className="text-xl text-yellow-50 max-w-3xl mx-auto">
                            A plain network treats every input the same way. Architectures build in what we know about the data —
                            images are made of local patterns, sentences arrive in order — and that is what makes them learn.
                        </p>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
                <AiPathRibbon current="deep-learning-architectures" />
            </div>

            {/* Cards */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {architectures.map(topic => {
                        const Icon = topic.available ? topic.icon : Construction;
                        const card = (
                            <div className="h-full flex flex-col bg-slate-900/70 rounded-2xl border border-slate-700/50 overflow-hidden hover:border-yellow-500/50 transition-colors group">
                                <div className={`bg-gradient-to-br from-yellow-500 to-amber-600 p-6 ${!topic.available ? 'opacity-60' : ''}`}>
                                    <div className="flex items-center justify-between">
                                        <Icon className="h-8 w-8 text-white" />
                                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${getDifficultyColor(topic.difficulty)}`}>
                                            {topic.difficulty}
                                        </span>
                                    </div>
                                    <h3 className="text-xl font-bold text-white mt-3">{topic.name}</h3>
                                    {!topic.available && (
                                        <span className="text-xs text-yellow-50/70">Coming Soon</span>
                                    )}
                                </div>
                                <div className="flex-1 flex flex-col p-6 gap-4">
                                    <p className="text-slate-400 text-sm leading-relaxed">{topic.description}</p>
                                    <div className="mt-auto space-y-2 text-sm">
                                        <div className="flex justify-between items-start gap-3">
                                            <span className="text-slate-500 flex-shrink-0">Key formula</span>
                                            <code className="bg-yellow-500/15 text-yellow-300 px-2 py-0.5 rounded text-xs text-right">{topic.formula}</code>
                                        </div>
                                        <div className="flex justify-between items-start gap-3">
                                            <span className="text-slate-500 flex-shrink-0">Builds on</span>
                                            <code className="bg-yellow-500/15 text-yellow-300 px-2 py-0.5 rounded text-xs text-right">{topic.prereq}</code>
                                        </div>
                                        <div className="flex justify-between items-start gap-3">
                                            <span className="text-slate-500 flex-shrink-0">Pattern</span>
                                            <code className="bg-yellow-500/15 text-yellow-300 px-2 py-0.5 rounded text-xs text-right">{topic.pattern}</code>
                                        </div>
                                    </div>
                                    {!topic.available ? (
                                        <span className="text-slate-500 text-sm">Coming Soon</span>
                                    ) : (
                                        <div className="flex items-center gap-2 text-yellow-400 text-sm font-medium group-hover:text-yellow-300 transition-colors">
                                            Start Visualization →
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                        return topic.available ? (
                            <Link key={topic.slug} href={`/deep-learning-architectures/${topic.slug}`} className="h-full flex flex-col">{card}</Link>
                        ) : (
                            <div key={topic.slug} className="h-full flex flex-col opacity-50 cursor-not-allowed">{card}</div>
                        );
                    })}
                </div>
            </div>

            {/* Why Learn */}
            <div className="border-t border-slate-700/50 bg-slate-900/70">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <h2 className="text-2xl font-bold text-white mb-8 text-center">Why Learn Deep Learning Architectures?</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                        {[
                            { title: 'Structure Beats Size', body: 'A dense layer from a 28×28 image to 8 feature maps would need almost five million weights. A convolution does the same job with 80, because it assumes a pattern means the same thing wherever it appears.' },
                            { title: 'The Road to Transformers', body: 'Recurrent networks carry memory as one vector, gates keep it alive, and a seq2seq encoder squeezes a sentence into it — until it breaks. Attention is the fix, and this section is the problem it fixes.' },
                            { title: 'Ideas Every Model Reuses', body: 'Residual connections are why a 100-layer network trains at all, and an autoencoder\'s bottleneck is the simplest way to see what an embedding is. Both are inside every large model you have used.' },
                        ].map(item => (
                            <div key={item.title} className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50">
                                <h3 className="text-yellow-400 font-semibold mb-2">{item.title}</h3>
                                <p className="text-slate-400 leading-relaxed">{item.body}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
