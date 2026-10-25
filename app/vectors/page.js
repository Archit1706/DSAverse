import Link from 'next/link';
import { ArrowLeft, MoveUpRight, Plus, Sigma, Axis3d, Crosshair, Diamond, Waypoints, Construction } from 'lucide-react';

export const metadata = {
    // Just the name: the root layout's "%s | DSAverse" template adds the suffix.
    title: 'Vectors',
    description: 'Interactive vectors: coordinates, addition and scaling, dot and cross products, projections, norms, and lines and planes in 3D — every arrow draggable, every formula live.',
};

/* Math cards describe a page by its key formula and the page it builds on,
   in place of time and space complexity. The order mirrors
   data/algorithmCategories.js. */
const vectorTopics = [
    {
        name: 'Vectors and Coordinates',
        slug: 'vectors-and-coordinates',
        icon: MoveUpRight,
        description: 'An arrow and a list of numbers are the same thing. Drag the tip and the components change; type the components and the arrow moves.',
        formula: '|v| = √(x² + y²)',
        prereq: 'Start here',
        pattern: 'Arrow = Numbers',
        difficulty: 'Beginner',
        available: true,
    },
    {
        name: 'Vector Addition and Scaling',
        slug: 'vector-addition-and-scaling',
        icon: Plus,
        description: 'Tip to tail, the parallelogram rule, stretching and flipping with a scalar, and subtraction as adding the opposite.',
        formula: 'a + b = (a₁ + b₁, a₂ + b₂)',
        prereq: 'Vectors and Coordinates',
        pattern: 'Tip to Tail',
        difficulty: 'Beginner',
        available: true,
    },
    {
        name: 'Dot Product',
        slug: 'dot-product',
        icon: Sigma,
        description: 'One vector\'s shadow on another, times its length. Its sign says same direction, perpendicular or opposite.',
        formula: 'a · b = a₁b₁ + a₂b₂ = |a||b| cos θ',
        prereq: 'Vector Addition and Scaling',
        pattern: 'Shadow × Length',
        difficulty: 'Beginner',
        available: true,
    },
    {
        name: 'Cross Product',
        slug: 'cross-product',
        icon: Axis3d,
        description: 'In 3D, a × b stands perpendicular to both, as long as the parallelogram they span is large — and flips when the order does.',
        formula: '|a × b| = |a||b| sin θ',
        prereq: 'Dot Product',
        pattern: 'Right-Hand Rule',
        difficulty: 'Intermediate',
        available: true,
    },
    {
        name: 'Vector Projection',
        slug: 'vector-projection',
        icon: Crosshair,
        description: 'Drop a perpendicular onto a line in 2D, then onto a plane in 3D. What is left over is always at right angles.',
        formula: 'proj_a b = (a · b / a · a) a',
        prereq: 'Dot Product',
        pattern: 'Drop a Perpendicular',
        difficulty: 'Intermediate',
        available: true,
    },
    {
        name: 'Norms and Unit Vectors',
        slug: 'norms-and-unit-vectors',
        icon: Diamond,
        description: 'Three ways to measure length — taxicab, straight-line and largest component — and the unit "circles" each one draws.',
        formula: '‖v‖ₚ = (∑ |vᵢ|ᵖ)^(1/p)',
        prereq: 'Vectors and Coordinates',
        pattern: 'Measure, Then Divide',
        difficulty: 'Intermediate',
        available: true,
    },
    {
        name: 'Lines and Planes in 3D',
        slug: 'lines-and-planes-in-3d',
        icon: Waypoints,
        description: 'A line from a point and a direction, a plane from a point and a normal, where the two meet, and how far a point is from a plane.',
        formula: 'n · (x − p) = 0',
        prereq: 'Cross Product',
        pattern: 'Point + Direction',
        difficulty: 'Advanced',
        available: true,
    },
];

const getDifficultyColor = (d) => {
    if (d === 'Beginner') return 'bg-green-500/15 text-green-400';
    if (d === 'Intermediate') return 'bg-yellow-500/15 text-yellow-400';
    return 'bg-red-500/15 text-red-400';
};

export default function VectorsPage() {
    return (
        <div className="min-h-screen bg-slate-950">
            {/* Header */}
            <div className="bg-gradient-to-r from-sky-500 to-blue-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                    <Link href="/" className="flex items-center text-white hover:text-sky-100 transition-colors mb-8 w-fit">
                        <ArrowLeft className="h-5 w-5 mr-2" />Back to Home
                    </Link>
                    <div className="text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/20 mb-6">
                            <MoveUpRight className="h-8 w-8 text-white" />
                        </div>
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">Vectors</h1>
                        <p className="text-xl text-sky-100 max-w-3xl mx-auto">
                            An arrow you can drag and a list of numbers you can type are the same object. Build from
                            coordinates to dot and cross products, projections, and planes in 3D.
                        </p>
                    </div>
                </div>
            </div>

            {/* Cards */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {vectorTopics.map(topic => {
                        const Icon = topic.available ? topic.icon : Construction;
                        const card = (
                            <div className="h-full flex flex-col bg-slate-900/70 rounded-2xl border border-slate-700/50 overflow-hidden hover:border-sky-500/50 transition-colors group">
                                <div className={`bg-gradient-to-br from-sky-500 to-blue-600 p-6 ${!topic.available ? 'opacity-60' : ''}`}>
                                    <div className="flex items-center justify-between">
                                        <Icon className="h-8 w-8 text-white" />
                                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${getDifficultyColor(topic.difficulty)}`}>
                                            {topic.difficulty}
                                        </span>
                                    </div>
                                    <h3 className="text-xl font-bold text-white mt-3">{topic.name}</h3>
                                    {!topic.available && (
                                        <span className="text-xs text-sky-100/70">Coming Soon</span>
                                    )}
                                </div>
                                <div className="flex-1 flex flex-col p-6 gap-4">
                                    <p className="text-slate-400 text-sm leading-relaxed">{topic.description}</p>
                                    <div className="mt-auto space-y-2 text-sm">
                                        <div className="flex justify-between items-start gap-3">
                                            <span className="text-slate-500 flex-shrink-0">Key formula</span>
                                            <code className="bg-sky-500/15 text-sky-400 px-2 py-0.5 rounded text-xs text-right">{topic.formula}</code>
                                        </div>
                                        <div className="flex justify-between items-start gap-3">
                                            <span className="text-slate-500 flex-shrink-0">Builds on</span>
                                            <code className="bg-sky-500/15 text-sky-400 px-2 py-0.5 rounded text-xs text-right">{topic.prereq}</code>
                                        </div>
                                        <div className="flex justify-between items-start gap-3">
                                            <span className="text-slate-500 flex-shrink-0">Pattern</span>
                                            <code className="bg-sky-500/15 text-sky-400 px-2 py-0.5 rounded text-xs text-right">{topic.pattern}</code>
                                        </div>
                                    </div>
                                    {!topic.available ? (
                                        <span className="text-slate-500 text-sm">Coming Soon</span>
                                    ) : (
                                        <div className="flex items-center gap-2 text-sky-400 text-sm font-medium group-hover:text-sky-300 transition-colors">
                                            Start Visualization →
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                        return topic.available ? (
                            <Link key={topic.slug} href={`/vectors/${topic.slug}`} className="h-full flex flex-col">{card}</Link>
                        ) : (
                            <div key={topic.slug} className="h-full flex flex-col opacity-50 cursor-not-allowed">{card}</div>
                        );
                    })}
                </div>
            </div>

            {/* Why Learn */}
            <div className="border-t border-slate-700/50 bg-slate-900/70">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <h2 className="text-2xl font-bold text-white mb-8 text-center">Why Learn Vectors?</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                        {[
                            { title: 'The Language of Linear Algebra', body: 'Matrices, eigenvectors and least squares are all statements about vectors. Getting comfortable dragging arrows here is what makes those pages feel like geometry instead of bookkeeping.' },
                            { title: 'Graphics, Games and Physics', body: 'Every lighting calculation is a dot product, every surface normal is a cross product, and every ray cast is a line meeting a plane. These are the inner loops of a renderer.' },
                            { title: 'Similarity in Machine Learning', body: 'Embeddings are vectors. Cosine similarity is the dot product of unit vectors, and regularisation is a choice of norm. The pictures here are the intuition behind those numbers.' },
                        ].map(item => (
                            <div key={item.title} className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50">
                                <h3 className="text-sky-400 font-semibold mb-2">{item.title}</h3>
                                <p className="text-slate-400 leading-relaxed">{item.body}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
