import Link from 'next/link';
import {
    ArrowLeft, Network, Target, Activity, MoveRight, Waves, Workflow, Undo2, Mountain, TrendingDown, Scale, EyeOff,
    Gamepad2, Construction,
} from 'lucide-react';
import AiPathRibbon from '@/components/ml/AiPathRibbon';

export const metadata = {
    // Just the name: the root layout's "%s | DSAverse" template adds the suffix.
    title: 'Neural Networks',
    description: 'Interactive neural networks: the perceptron, activation functions, the forward pass, how layers bend space, computational graphs, backpropagation, optimizers, vanishing gradients, normalization, dropout and weight decay, and a playground — every number computed live.',
};

/* AI cards describe a page by its key formula and the page it builds on, in
   place of time and space complexity — the same fields the Math indexes use,
   which Compare shows as "Key formula" and "Builds on". The order is the
   learning order. */
const neuralNetworkTopics = [
    {
        name: 'The Perceptron',
        slug: 'the-perceptron',
        icon: Target,
        description: 'One neuron, trained live: every mistake nudges the line towards the point it got wrong. On separable data it always stops; on XOR it never can.',
        formula: 'ŷ = step(w·x + b),  w ← w + η (y − ŷ) x',
        prereq: 'Logistic Regression',
        pattern: 'Learn from Mistakes',
        difficulty: 'Beginner',
        available: true,
    },
    {
        name: 'Activation Functions',
        slug: 'activation-functions',
        icon: Activity,
        description: 'Step, sigmoid, tanh, ReLU and GELU side by side with their slopes — and what a stack of layers can draw with each one, and with none.',
        formula: 'ReLU(z) = max(0, z),  σ(z) = 1 / (1 + e^−z)',
        prereq: 'The Perceptron',
        pattern: 'Bend the Line',
        difficulty: 'Beginner',
        available: true,
    },
    {
        name: 'Forward Pass',
        slug: 'forward-pass',
        icon: MoveRight,
        description: 'Trace one input through a 2-3-2 network, multiply by multiply: weighted sums, activations, then softmax turns two scores into probabilities.',
        formula: 'h = f(W₁x + b₁),  p = softmax(W₂h + b₂)',
        prereq: 'Activation Functions',
        pattern: 'Layer by Layer',
        difficulty: 'Beginner',
        available: true,
    },
    {
        name: 'How Networks Bend Space',
        slug: 'how-networks-bend-space',
        icon: Waves,
        description: 'Watch a trained network stretch, shift and squash the plane layer by layer until two tangled moons come apart along a straight line, and see why two units per layer can never cut a ring off its core.',
        formula: 'h = tanh(Wx + b), then the cut v · h + c = 0',
        prereq: 'Forward Pass',
        pattern: 'Bend the Plane',
        difficulty: 'Intermediate',
        available: true,
    },
    {
        name: 'Computational Graphs',
        slug: 'computational-graphs',
        icon: Workflow,
        description: 'Record L = (wx + b − y)² as a tape of tiny operations, each storing its own local derivatives, replay it newest first, then use w twice and watch its gradient become a sum.',
        formula: '∂L/∂w = 2(wx + b − y) · x',
        prereq: 'Forward Pass',
        pattern: 'Record, Then Replay',
        difficulty: 'Intermediate',
        available: true,
    },
    {
        name: 'Backpropagation',
        slug: 'backpropagation',
        icon: Undo2,
        description: 'Step through every gradient of a real network: upstream × local on each edge, sums where paths meet, each checked against finite differences. Then train XOR and break it.',
        formula: '∂L/∂x = Σ ∂L/∂out · ∂out/∂x',
        prereq: 'Computational Graphs',
        pattern: 'Chain Rule in Reverse',
        difficulty: 'Intermediate',
        available: true,
    },
    {
        name: 'Optimizers',
        slug: 'optimizers',
        icon: Mountain,
        description: 'SGD, momentum, RMSProp and Adam race down the same narrow ravine from the same start. Watch who zig-zags, who overshoots, who reaches the floor first and who cannot stay there, then turn the ravine 45°.',
        formula: 'θ ← θ − η · m̂ / (√v̂ + ε)',
        prereq: 'Gradient Descent',
        pattern: 'Smarter Steps',
        difficulty: 'Intermediate',
        available: true,
    },
    {
        name: 'Vanishing and Exploding Gradients',
        slug: 'vanishing-and-exploding-gradients',
        icon: TrendingDown,
        description: 'Follow a gradient back through 12 layers and watch it shrink to 10⁻¹¹ with sigmoid, still vanish with ReLU at the default scale, explode at twice He’s, and keep its size with He initialisation.',
        formula: 'δₖ₋₁ = Wₖᵀ (f′(zₖ) ⊙ δₖ),  n · Var(w) · E[f′²] ≈ 1',
        prereq: 'Backpropagation',
        pattern: 'Products Shrink or Grow',
        difficulty: 'Advanced',
        available: true,
    },
    {
        name: 'Normalization',
        slug: 'normalization',
        icon: Scale,
        description: 'Batch norm and layer norm, computed on a batch you can read: subtract the mean, divide by the spread, then let γ and β put back what training wants.',
        formula: 'x̂ = (x − μ) / √(σ² + ε),  y = γ x̂ + β',
        prereq: 'Vanishing and Exploding Gradients',
        pattern: 'Re-centre Every Layer',
        difficulty: 'Advanced',
        available: true,
    },
    {
        name: 'Dropout and Weight Decay',
        slug: 'dropout-and-weight-decay',
        icon: EyeOff,
        description: 'Train an oversized network on a few noisy points and watch it memorise them; then switch on dropout or weight decay and watch the boundary calm down.',
        formula: 'L + (λ/2) Σ w²,  h ← h · m / (1 − p)',
        prereq: 'Overfitting and Underfitting',
        pattern: 'Regularize the Network',
        difficulty: 'Intermediate',
        available: true,
    },
    {
        name: 'Neural Network Playground',
        slug: 'neural-network-playground',
        icon: Gamepad2,
        description: 'Pick a dataset, stack layers, choose activations, an optimizer and regularisation, and train it live — with every unit’s picture of the plane on view.',
        formula: 'ŷ = f_L(W_L … f₁(W₁x + b₁) … + b_L)',
        prereq: 'Backpropagation',
        pattern: 'Build, Train, Break',
        difficulty: 'Intermediate',
        available: true,
    },
];

const getDifficultyColor = (d) => {
    if (d === 'Beginner') return 'bg-green-500/15 text-green-300';
    if (d === 'Intermediate') return 'bg-yellow-500/15 text-yellow-300';
    return 'bg-red-500/15 text-red-300';
};

export default function NeuralNetworksPage() {
    return (
        <div className="min-h-screen bg-slate-950">
            {/* Header */}
            <div className="bg-gradient-to-r from-orange-500 to-red-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                    <Link href="/" className="flex items-center text-white hover:text-orange-50 transition-colors mb-8 w-fit">
                        <ArrowLeft className="h-5 w-5 mr-2" />Back to Home
                    </Link>
                    <div className="text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/20 mb-6">
                            <Network className="h-8 w-8 text-white" />
                        </div>
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">Neural Networks</h1>
                        <p className="text-xl text-orange-50 max-w-3xl mx-auto">
                            A neuron is a weighted sum and a bend. Stack enough of them, train them with the chain rule, and
                            they can draw almost any boundary — watch real ones learn, and fail, in your browser.
                        </p>
                    </div>
                </div>
            </div>

            <div className="border-b border-slate-800 bg-slate-900/60">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <AiPathRibbon current="neural-networks" />
                </div>
            </div>

            {/* Cards */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {neuralNetworkTopics.map(topic => {
                        const Icon = topic.available ? topic.icon : Construction;
                        const card = (
                            <div className="h-full flex flex-col bg-slate-900/70 rounded-2xl border border-slate-700/50 overflow-hidden hover:border-orange-500/50 transition-colors group">
                                <div className={`bg-gradient-to-br from-orange-500 to-red-600 p-6 ${!topic.available ? 'opacity-60' : ''}`}>
                                    <div className="flex items-center justify-between">
                                        <Icon className="h-8 w-8 text-white" />
                                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-950/40 ${getDifficultyColor(topic.difficulty)}`}>
                                            {topic.difficulty}
                                        </span>
                                    </div>
                                    <h3 className="text-xl font-bold text-white mt-3">{topic.name}</h3>
                                    {!topic.available && (
                                        <span className="text-xs text-orange-50/80">Coming Soon</span>
                                    )}
                                </div>
                                <div className="flex-1 flex flex-col p-6 gap-4">
                                    <p className="text-slate-400 text-sm leading-relaxed">{topic.description}</p>
                                    <div className="mt-auto space-y-2 text-sm">
                                        <div className="flex justify-between items-start gap-3">
                                            <span className="text-slate-500 flex-shrink-0">Key formula</span>
                                            <code className="bg-orange-500/15 text-orange-300 px-2 py-0.5 rounded text-xs text-right">{topic.formula}</code>
                                        </div>
                                        <div className="flex justify-between items-start gap-3">
                                            <span className="text-slate-500 flex-shrink-0">Builds on</span>
                                            <code className="bg-orange-500/15 text-orange-300 px-2 py-0.5 rounded text-xs text-right">{topic.prereq}</code>
                                        </div>
                                        <div className="flex justify-between items-start gap-3">
                                            <span className="text-slate-500 flex-shrink-0">Pattern</span>
                                            <code className="bg-orange-500/15 text-orange-300 px-2 py-0.5 rounded text-xs text-right">{topic.pattern}</code>
                                        </div>
                                    </div>
                                    {!topic.available ? (
                                        <span className="text-slate-500 text-sm">Coming Soon</span>
                                    ) : (
                                        <div className="flex items-center gap-2 text-orange-400 text-sm font-medium group-hover:text-orange-300 transition-colors">
                                            Start Visualization →
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                        return topic.available ? (
                            <Link key={topic.slug} href={`/neural-networks/${topic.slug}`} className="h-full flex flex-col">{card}</Link>
                        ) : (
                            <div key={topic.slug} className="h-full flex flex-col opacity-50 cursor-not-allowed">{card}</div>
                        );
                    })}
                </div>
            </div>

            {/* Why Learn */}
            <div className="border-t border-slate-700/50 bg-slate-900/70">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <h2 className="text-2xl font-bold text-white mb-8 text-center">Why Learn Neural Networks?</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                        {[
                            { title: 'The Engine of Modern AI', body: 'Image models, speech recognisers and language models are all neural networks trained by backpropagation. The pieces on this page — layers, activations, gradients, optimizers — are the pieces they are built from.' },
                            { title: 'Debug Training, Not Just Code', body: 'A loss that will not fall, a network that predicts one class, gradients that vanish twelve layers down: each has a cause you can see here and a fix you can try, on a network small enough to read.' },
                            { title: 'Nothing Is Magic', body: 'Every number on these pages is computed in your browser, by networks that really train. Once you have watched one unit bend a line, a billion of them stop being mysterious.' },
                        ].map(item => (
                            <div key={item.title} className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50">
                                <h3 className="text-orange-400 font-semibold mb-2">{item.title}</h3>
                                <p className="text-slate-400 leading-relaxed">{item.body}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
