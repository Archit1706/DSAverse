import Link from 'next/link';
import { ArrowLeft, Grid3x3, Combine, Layers, Square, Rows3, Undo2, Shrink, Orbit, ArrowRightLeft, TrendingUp, Zap, Link2, Construction } from 'lucide-react';

export const metadata = {
    // Just the name: the root layout's "%s | DSAverse" template adds the suffix.
    title: 'Linear Algebra',
    description: 'Interactive linear algebra: span, matrices as transformations, multiplication as composition, determinants, elimination, inverses, rank, eigenvectors, change of basis and least squares — 2D first, 3D where the idea is three-dimensional.',
};

/* Math cards describe a page by its key formula and the page it builds on,
   in place of time and space complexity. The last two cards link to matrix
   algorithms that already live in other sections. The order mirrors
   data/algorithmCategories.js. */
const linearAlgebraTopics = [
    {
        name: 'Linear Combinations and Span',
        slug: 'linear-combinations-and-span',
        icon: Combine,
        description: 'Scale two vectors and add them. Every point you can reach is their span — the whole plane, or a single line when the vectors line up.',
        formula: 'c₁a + c₂b',
        prereq: 'Vector Addition and Scaling',
        pattern: 'Mix and Reach',
        difficulty: 'Beginner',
        available: true,
    },
    {
        name: 'Matrix as a Transformation',
        slug: 'matrix-as-a-transformation',
        icon: Grid3x3,
        description: 'A matrix moves the whole plane, and its columns say exactly where î and ĵ land. Drag them and watch the grid follow.',
        formula: 'Mv = v₁ (column 1) + v₂ (column 2)',
        prereq: 'Linear Combinations and Span',
        pattern: 'Columns Are Images',
        difficulty: 'Beginner',
        available: true,
    },
    {
        name: 'Matrix Multiplication',
        slug: 'matrix-multiplication',
        icon: Layers,
        description: 'Row times column for the numbers, and one transformation after another for the picture — which is why AB and BA differ.',
        formula: '(AB)ᵢⱼ = row i of A · column j of B',
        prereq: 'Matrix as a Transformation',
        pattern: 'Compose the Maps',
        difficulty: 'Intermediate',
        available: true,
    },
    {
        name: 'Determinant',
        slug: 'determinant',
        icon: Square,
        description: 'The factor by which a matrix scales area in 2D and volume in 3D. Negative means flipped; zero means squashed flat.',
        formula: 'det A = ad − bc',
        prereq: 'Matrix as a Transformation',
        pattern: 'Area Scale Factor',
        difficulty: 'Intermediate',
        available: true,
    },
    {
        name: 'Gaussian Elimination',
        slug: 'gaussian-elimination',
        icon: Rows3,
        description: 'Row operations reduce a 3×3 system step by step, while three planes in 3D keep meeting at the same point — or never meet, or share a line.',
        formula: '[A | b] → row echelon form → RREF',
        prereq: 'Linear Combinations and Span',
        pattern: 'Row Operations',
        difficulty: 'Intermediate',
        available: true,
    },
    {
        name: 'Inverse Matrices',
        slug: 'inverse-matrices',
        icon: Undo2,
        description: 'Row-reduce [A | I] until the left side is I and the right side is A⁻¹, then watch A⁻¹ put the plane back where it was.',
        formula: '[A | I] → [I | A⁻¹]',
        prereq: 'Gaussian Elimination',
        pattern: 'Undo the Map',
        difficulty: 'Intermediate',
        available: true,
    },
    {
        name: 'Rank and Null Space',
        slug: 'rank-and-null-space',
        icon: Shrink,
        description: 'A matrix that squashes 3D space onto a plane or a line, the vectors it sends to zero, and why the two always add up to three.',
        formula: 'rank + nullity = n',
        prereq: 'Gaussian Elimination',
        pattern: 'What Survives',
        difficulty: 'Advanced',
        available: true,
    },
    {
        name: 'Eigenvectors and Eigenvalues',
        slug: 'eigenvectors-and-eigenvalues',
        icon: Orbit,
        description: 'Sweep a vector around the circle and light up the ones that stay on their own line. The eigenvalue is how much they stretch.',
        formula: 'Av = λv',
        prereq: 'Determinant',
        pattern: 'Stay on Your Line',
        difficulty: 'Advanced',
        available: true,
    },
    {
        name: 'Change of Basis',
        slug: 'change-of-basis',
        icon: ArrowRightLeft,
        description: 'One vector, two coordinate grids. The basis matrix converts one way and its inverse converts back.',
        formula: 'v = B[v]_B,  [v]_B = B⁻¹v',
        prereq: 'Inverse Matrices',
        pattern: 'Two Grids',
        difficulty: 'Advanced',
        available: true,
    },
    {
        name: 'Least Squares',
        slug: 'least-squares',
        icon: TrendingUp,
        description: 'Fit a line to points you can drag. The best fit is a projection onto the column space, and the residuals stand perpendicular to it.',
        formula: 'AᵀA x̂ = Aᵀb',
        prereq: 'Vector Projection',
        pattern: 'Project to Fit',
        difficulty: 'Advanced',
        available: true,
    },
    {
        name: "Strassen's Matrix Multiplication",
        slug: 'strassens-matrix-multiplication',
        href: '/divide-and-conquer/strassens-matrix-multiplication',
        coveredIn: 'Divide and Conquer',
        icon: Zap,
        description: 'Multiply 2×2 blocks with seven products instead of eight, and recurse — the first algorithm to beat n³.',
        formula: 'T(n) = 7T(n/2) + O(n²)',
        prereq: 'Matrix Multiplication',
        pattern: 'Divide and Conquer',
        difficulty: 'Advanced',
        available: true,
    },
    {
        name: 'Matrix Chain Multiplication',
        slug: 'matrix-chain-multiplication',
        href: '/dynamic-programming/matrix-chain-multiplication',
        coveredIn: 'Dynamic Programming',
        icon: Link2,
        description: 'Matrix products are associative but not equally cheap. Dynamic programming finds the bracketing that does the least work.',
        formula: 'm[i][j] = min over k of m[i][k] + m[k+1][j] + pᵢ₋₁pₖpⱼ',
        prereq: 'Matrix Multiplication',
        pattern: 'Interval DP',
        difficulty: 'Advanced',
        available: true,
    },
];

const getDifficultyColor = (d) => {
    if (d === 'Beginner') return 'bg-green-500/15 text-green-400';
    if (d === 'Intermediate') return 'bg-yellow-500/15 text-yellow-400';
    return 'bg-red-500/15 text-red-400';
};

export default function LinearAlgebraPage() {
    return (
        <div className="min-h-screen bg-slate-950">
            {/* Header */}
            <div className="bg-gradient-to-r from-violet-500 to-indigo-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                    <Link href="/" className="flex items-center text-white hover:text-violet-100 transition-colors mb-8 w-fit">
                        <ArrowLeft className="h-5 w-5 mr-2" />Back to Home
                    </Link>
                    <div className="text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/20 mb-6">
                            <Grid3x3 className="h-8 w-8 text-white" />
                        </div>
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">Linear Algebra</h1>
                        <p className="text-xl text-violet-100 max-w-3xl mx-auto">
                            Matrices are not tables of numbers — they move space. Build the intuition in 2D, where you can
                            drag everything, then step into 3D only where the idea needs a third dimension.
                        </p>
                    </div>
                </div>
            </div>

            {/* Cards */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {linearAlgebraTopics.map(topic => {
                        const Icon = topic.available ? topic.icon : Construction;
                        const card = (
                            <div className="h-full flex flex-col bg-slate-900/70 rounded-2xl border border-slate-700/50 overflow-hidden hover:border-violet-500/50 transition-colors group">
                                <div className={`bg-gradient-to-br from-violet-500 to-indigo-600 p-6 ${!topic.available ? 'opacity-60' : ''}`}>
                                    <div className="flex items-center justify-between">
                                        <Icon className="h-8 w-8 text-white" />
                                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${getDifficultyColor(topic.difficulty)}`}>
                                            {topic.difficulty}
                                        </span>
                                    </div>
                                    <h3 className="text-xl font-bold text-white mt-3">{topic.name}</h3>
                                    {topic.coveredIn && (
                                        <span className="text-xs text-violet-100/80">Covered in {topic.coveredIn}</span>
                                    )}
                                    {!topic.available && (
                                        <span className="text-xs text-violet-100/70">Coming Soon</span>
                                    )}
                                </div>
                                <div className="flex-1 flex flex-col p-6 gap-4">
                                    <p className="text-slate-400 text-sm leading-relaxed">{topic.description}</p>
                                    <div className="mt-auto space-y-2 text-sm">
                                        <div className="flex justify-between items-start gap-3">
                                            <span className="text-slate-500 flex-shrink-0">Key formula</span>
                                            <code className="bg-violet-500/15 text-violet-300 px-2 py-0.5 rounded text-xs text-right">{topic.formula}</code>
                                        </div>
                                        <div className="flex justify-between items-start gap-3">
                                            <span className="text-slate-500 flex-shrink-0">Builds on</span>
                                            <code className="bg-violet-500/15 text-violet-300 px-2 py-0.5 rounded text-xs text-right">{topic.prereq}</code>
                                        </div>
                                        <div className="flex justify-between items-start gap-3">
                                            <span className="text-slate-500 flex-shrink-0">Pattern</span>
                                            <code className="bg-violet-500/15 text-violet-300 px-2 py-0.5 rounded text-xs text-right">{topic.pattern}</code>
                                        </div>
                                    </div>
                                    {!topic.available ? (
                                        <span className="text-slate-500 text-sm">Coming Soon</span>
                                    ) : (
                                        <div className="flex items-center gap-2 text-violet-400 text-sm font-medium group-hover:text-violet-300 transition-colors">
                                            {topic.coveredIn ? `Open in ${topic.coveredIn} →` : 'Start Visualization →'}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                        return topic.available ? (
                            <Link key={topic.slug} href={topic.href ?? `/linear-algebra/${topic.slug}`} className="h-full flex flex-col">{card}</Link>
                        ) : (
                            <div key={topic.slug} className="h-full flex flex-col opacity-50 cursor-not-allowed">{card}</div>
                        );
                    })}
                </div>
            </div>

            {/* Why Learn */}
            <div className="border-t border-slate-700/50 bg-slate-900/70">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <h2 className="text-2xl font-bold text-white mb-8 text-center">Why Learn Linear Algebra?</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                        {[
                            { title: 'Pictures Before Symbols', body: 'Most people meet linear algebra as rules for shuffling numbers. Seen as the plane bending — columns as where the axes land — the rules stop being arbitrary and start being obvious.' },
                            { title: 'The Engine of Machine Learning', body: 'A neural network layer is a matrix, training is least squares in disguise, and PCA is an eigenvector problem. Every model you run is linear algebra at scale.' },
                            { title: '3D Without the Headache', body: 'Planes meeting at a point, space squashed onto a line, a box\'s volume as a determinant — these are hard to imagine and easy to see. Orbit the scenes until they click.' },
                        ].map(item => (
                            <div key={item.title} className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50">
                                <h3 className="text-violet-400 font-semibold mb-2">{item.title}</h3>
                                <p className="text-slate-400 leading-relaxed">{item.body}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
