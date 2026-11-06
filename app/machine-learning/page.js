import Link from 'next/link';
import {
    ArrowLeft, BrainCircuit, Sparkles, TrendingUp, Ruler, Activity, Waves, Split, Crosshair, GitFork,
    Group, Axis3d, Gauge, Construction,
} from 'lucide-react';
import AiPathRibbon from '@/components/ml/AiPathRibbon';

export const metadata = {
    // Just the name: the root layout's "%s | DSAverse" template adds the suffix.
    title: 'Machine Learning',
    description: 'Interactive machine learning: what learning is, linear and logistic regression, loss functions, overfitting, train/validation/test splits, k-nearest neighbours, decision trees, k-means, PCA and classification metrics — every number computed live.',
};

/* AI cards describe a page by its key formula and the page it builds on, in
   place of time and space complexity — the same fields the Math indexes use,
   which Compare shows as "Key formula" and "Builds on". The order is the
   learning order and mirrors data/algorithmCategories.js. */
const machineLearningTopics = [
    {
        name: 'What Is Machine Learning?',
        slug: 'what-is-machine-learning',
        icon: Sparkles,
        description: 'Fit a line to twelve points by hand, then watch gradient descent do it. Learning is a search for the knob settings that make one number — the loss — small.',
        formula: 'L(w, b) = (1/n) Σ (w·xᵢ + b − yᵢ)²',
        prereq: 'Gradient Descent',
        pattern: 'Fit by Search',
        difficulty: 'Beginner',
        available: true,
    },
    {
        name: 'Linear Regression',
        slug: 'linear-regression',
        icon: TrendingUp,
        description: 'Drag the points while gradient descent refits, and watch a ball roll down the real loss bowl in 3D. The normal equations land on the very same line in one step.',
        formula: 'θ = (XᵀX)⁻¹ Xᵀy',
        prereq: 'What Is Machine Learning?',
        pattern: 'Two Routes, One Line',
        difficulty: 'Beginner',
        available: true,
    },
    {
        name: 'Loss Functions',
        slug: 'loss-functions',
        icon: Ruler,
        description: 'Drag an outlier and watch the squared, absolute and Huber fits react differently; then see why classifiers are scored with cross-entropy. The loss decides what "good" means.',
        formula: 'MSE = mean(r²), MAE = mean(|r|), CE = −log p',
        prereq: 'Linear Regression',
        pattern: 'Define "Good"',
        difficulty: 'Beginner',
        available: true,
    },
    {
        name: 'Logistic Regression',
        slug: 'logistic-regression',
        icon: Activity,
        description: 'A probability for every point of the plane, trained live: a linear score squashed by the sigmoid, with the decision boundary where the score is zero.',
        formula: 'p = σ(w·x + b) = 1 / (1 + e^−(w·x + b))',
        prereq: 'Loss Functions',
        pattern: 'Regression on Log-Odds',
        difficulty: 'Intermediate',
        available: true,
    },
    {
        name: 'Overfitting and Underfitting',
        slug: 'overfitting-and-underfitting',
        icon: Waves,
        description: 'Slide the polynomial degree on noisy data: training error keeps falling while validation error traces a U. An L2 penalty reins the wild coefficients back in.',
        formula: 'min Σ (ŷᵢ − yᵢ)² + λ‖w‖²',
        prereq: 'Linear Regression',
        pattern: 'Bias and Variance',
        difficulty: 'Intermediate',
        available: true,
    },
    {
        name: 'Train, Validation and Test',
        slug: 'train-validation-and-test',
        icon: Split,
        description: 'k-fold cross-validation, fold by fold, to choose a model honestly — then a data-leakage trap that scores far above chance on pure noise.',
        formula: 'CV = (1/k) Σ errorᵢ',
        prereq: 'Overfitting and Underfitting',
        pattern: 'Hold Data Out',
        difficulty: 'Intermediate',
        available: true,
    },
    {
        name: 'k-Nearest Neighbors',
        slug: 'k-nearest-neighbors',
        icon: Crosshair,
        description: 'Click anywhere: the k closest examples vote. No training at all — just memory — and the regions repaint as k and the distance metric change.',
        formula: 'ŷ = majority label of the k nearest xᵢ',
        prereq: 'Norms and Unit Vectors',
        pattern: 'Remember and Vote',
        difficulty: 'Beginner',
        available: true,
    },
    {
        name: 'Decision Trees',
        slug: 'decision-trees',
        icon: GitFork,
        description: 'Try every threshold on every feature, keep the split that leaves the purest groups, and recurse. The plane breaks into boxes, one question at a time.',
        formula: 'Gini = 1 − Σ pₖ²',
        prereq: 'Binary Search Tree',
        pattern: 'Greedy Splits',
        difficulty: 'Intermediate',
        available: true,
    },
    {
        name: 'k-Means Clustering',
        slug: 'k-means-clustering',
        icon: Group,
        description: 'Assign each point to its nearest centre, move each centre to its points\' mean, repeat. The objective only ever falls — but a bad start can trap it.',
        formula: 'J = Σᵢ ‖xᵢ − μ_c(i)‖²',
        prereq: 'k-Nearest Neighbors',
        pattern: 'Assign and Update',
        difficulty: 'Intermediate',
        available: true,
    },
    {
        name: 'Principal Component Analysis',
        slug: 'principal-component-analysis',
        icon: Axis3d,
        description: 'Rotate a 3D cloud, hunt for the direction it spreads most, and flatten it to 2D. The answers are the eigenvectors of its covariance matrix.',
        formula: 'C v = λ v,  C = XᵀX / (n − 1)',
        prereq: 'Eigenvectors and Eigenvalues',
        pattern: 'Directions of Spread',
        difficulty: 'Advanced',
        available: true,
    },
    {
        name: 'Classification Metrics',
        slug: 'classification-metrics',
        icon: Gauge,
        description: 'Slide a threshold and watch the confusion matrix, precision, recall, F1 and the ROC and PR curves move together — and see 95% accuracy that catches nothing.',
        formula: 'P = TP / (TP + FP),  R = TP / (TP + FN)',
        prereq: 'Logistic Regression',
        pattern: 'Count the Mistakes',
        difficulty: 'Intermediate',
        available: true,
    },
];

const getDifficultyColor = (d) => {
    if (d === 'Beginner') return 'bg-green-500/15 text-green-300';
    if (d === 'Intermediate') return 'bg-yellow-500/15 text-yellow-300';
    return 'bg-red-500/15 text-red-300';
};

export default function MachineLearningPage() {
    return (
        <div className="min-h-screen bg-slate-950">
            {/* Header */}
            <div className="bg-gradient-to-r from-lime-500 to-green-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                    <Link href="/" className="flex items-center text-white hover:text-lime-50 transition-colors mb-8 w-fit">
                        <ArrowLeft className="h-5 w-5 mr-2" />Back to Home
                    </Link>
                    <div className="text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/20 mb-6">
                            <BrainCircuit className="h-8 w-8 text-white" />
                        </div>
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">Machine Learning</h1>
                        <p className="text-xl text-lime-50 max-w-3xl mx-auto">
                            A model is a family of rules with knobs, a loss scores every setting, and learning searches for the
                            lowest score. Watch it happen on numbers small enough to read — every one computed in your browser.
                        </p>
                    </div>
                </div>
            </div>

            <div className="border-b border-slate-800 bg-slate-900/60">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <AiPathRibbon current="machine-learning" />
                </div>
            </div>

            {/* Cards */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {machineLearningTopics.map(topic => {
                        const Icon = topic.available ? topic.icon : Construction;
                        const card = (
                            <div className="h-full flex flex-col bg-slate-900/70 rounded-2xl border border-slate-700/50 overflow-hidden hover:border-lime-500/50 transition-colors group">
                                <div className={`bg-gradient-to-br from-lime-500 to-green-600 p-6 ${!topic.available ? 'opacity-60' : ''}`}>
                                    <div className="flex items-center justify-between">
                                        <Icon className="h-8 w-8 text-white" />
                                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-950/40 ${getDifficultyColor(topic.difficulty)}`}>
                                            {topic.difficulty}
                                        </span>
                                    </div>
                                    <h3 className="text-xl font-bold text-white mt-3">{topic.name}</h3>
                                    {!topic.available && (
                                        <span className="text-xs text-lime-50/80">Coming Soon</span>
                                    )}
                                </div>
                                <div className="flex-1 flex flex-col p-6 gap-4">
                                    <p className="text-slate-400 text-sm leading-relaxed">{topic.description}</p>
                                    <div className="mt-auto space-y-2 text-sm">
                                        <div className="flex justify-between items-start gap-3">
                                            <span className="text-slate-500 flex-shrink-0">Key formula</span>
                                            <code className="bg-lime-500/15 text-lime-300 px-2 py-0.5 rounded text-xs text-right">{topic.formula}</code>
                                        </div>
                                        <div className="flex justify-between items-start gap-3">
                                            <span className="text-slate-500 flex-shrink-0">Builds on</span>
                                            <code className="bg-lime-500/15 text-lime-300 px-2 py-0.5 rounded text-xs text-right">{topic.prereq}</code>
                                        </div>
                                        <div className="flex justify-between items-start gap-3">
                                            <span className="text-slate-500 flex-shrink-0">Pattern</span>
                                            <code className="bg-lime-500/15 text-lime-300 px-2 py-0.5 rounded text-xs text-right">{topic.pattern}</code>
                                        </div>
                                    </div>
                                    {!topic.available ? (
                                        <span className="text-slate-500 text-sm">Coming Soon</span>
                                    ) : (
                                        <div className="flex items-center gap-2 text-lime-400 text-sm font-medium group-hover:text-lime-300 transition-colors">
                                            Start Visualization →
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                        return topic.available ? (
                            <Link key={topic.slug} href={`/machine-learning/${topic.slug}`} className="h-full flex flex-col">{card}</Link>
                        ) : (
                            <div key={topic.slug} className="h-full flex flex-col opacity-50 cursor-not-allowed">{card}</div>
                        );
                    })}
                </div>
            </div>

            {/* Why Learn */}
            <div className="border-t border-slate-700/50 bg-slate-900/70">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <h2 className="text-2xl font-bold text-white mb-8 text-center">Why Learn Machine Learning?</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                        {[
                            { title: 'One Recipe Everywhere', body: 'A model family, a loss and a search. A fitted line, a spam filter and a language model are all that recipe; once it clicks on two knobs, a billion knobs stop being mysterious.' },
                            { title: 'Judge Models Honestly', body: 'Training error flatters, accuracy misleads on rare classes and leaked data inflates every score. Knowing how to measure on unseen data is what separates a working model from a demo.' },
                            { title: 'The Ground Floor of Deep Learning', body: 'Neural networks are this section with more layers: the same losses, the same gradient descent, the same overfitting. Everything after this — transformers included — builds on it.' },
                        ].map(item => (
                            <div key={item.title} className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50">
                                <h3 className="text-lime-400 font-semibold mb-2">{item.title}</h3>
                                <p className="text-slate-400 leading-relaxed">{item.body}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
