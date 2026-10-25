import Link from 'next/link';
import {
    ArrowLeft, TrendingUp, ArrowRightToLine, Variable, ChartSpline, Package, Crosshair, Waves,
    Mountain, Footprints, Construction,
} from 'lucide-react';

export const metadata = {
    // Just the name: the root layout's "%s | DSAverse" template adds the suffix.
    title: 'Differential Calculus',
    description: 'Interactive differential calculus: limits from both sides, the derivative as a shrinking secant, the product and chain rules as pictures, curve sketching with f′ and f″, optimisation, Newton\'s method, Taylor series, gradients and gradient descent.',
};

/* Math cards describe a page by its key formula and the page it builds on,
   in place of time and space complexity. The order mirrors the nav. */
const pages = [
    {
        name: 'Limits',
        slug: 'limits',
        icon: ArrowRightToLine,
        description: 'Walk towards a point from the left and from the right. A removable hole, a jump and an asymptote, then an ε–δ band you can tighten.',
        formula: 'lim x→a f(x) = L',
        prereq: 'Functions and graphs',
        pattern: 'Approach from Both Sides',
        difficulty: 'Beginner',
        available: true,
    },
    {
        name: 'The Derivative',
        slug: 'the-derivative',
        icon: TrendingUp,
        description: 'A secant line through two points of a curve, pulled together until it becomes the tangent — with the difference quotient updating live.',
        formula: 'f′(x) = lim h→0 (f(x + h) − f(x)) / h',
        prereq: 'Limits',
        pattern: 'Secant to Tangent',
        difficulty: 'Beginner',
        available: true,
    },
    {
        name: 'Derivative Rules',
        slug: 'derivative-rules',
        icon: Variable,
        description: 'The power rule, the product rule as a rectangle growing on two sides, and the chain rule as rates multiplying through a composition.',
        formula: '(uv)′ = u′v + uv′,  (f∘g)′ = f′(g)·g′',
        prereq: 'The Derivative',
        pattern: 'Rules from Pictures',
        difficulty: 'Intermediate',
        available: true,
    },
    {
        name: 'Graphing with Derivatives',
        slug: 'graphing-with-derivatives',
        icon: ChartSpline,
        description: 'f, f′ and f″ stacked on one x-axis. Rising and falling, bending up and down, maxima, minima and inflection points, all tied together.',
        formula: 'f′ > 0 ⇒ f rises,  f″ > 0 ⇒ f bends up',
        prereq: 'Derivative Rules',
        pattern: 'Sign Analysis',
        difficulty: 'Intermediate',
        available: true,
    },
    {
        name: 'Optimization',
        slug: 'optimization',
        icon: Package,
        description: 'Cut squares from the corners of a sheet and fold it into an open box. Which cut holds the most? Find it where the tangent goes flat.',
        formula: 'V′(x) = 0 at the best cut',
        prereq: 'Graphing with Derivatives',
        pattern: 'Critical Points',
        difficulty: 'Intermediate',
        available: true,
    },
    {
        name: "Newton's Method",
        slug: 'newtons-method',
        icon: Crosshair,
        description: 'Follow the tangent down to the x-axis, then do it again. Correct digits double each step near a root — until a bad start sends it cycling or flying off.',
        formula: 'xₙ₊₁ = xₙ − f(xₙ) / f′(xₙ)',
        prereq: 'The Derivative',
        pattern: 'Tangent Iteration',
        difficulty: 'Intermediate',
        available: true,
    },
    {
        name: 'Taylor Series',
        slug: 'taylor-series',
        icon: Waves,
        description: 'Add one term at a time and watch the polynomial hug sin x and eˣ. For ln(1 + x), see exactly where adding terms stops helping.',
        formula: 'f(x) = ∑ f⁽ⁿ⁾(a) (x − a)ⁿ / n!',
        prereq: 'Derivative Rules',
        pattern: 'Polynomial Approximation',
        difficulty: 'Advanced',
        available: true,
    },
    {
        name: 'Partial Derivatives and Gradients',
        slug: 'partial-derivatives-and-gradients',
        icon: Mountain,
        description: 'Slice a surface along x and along y to get the two partial slopes, then see the gradient on the contour map — always perpendicular to the level curves.',
        formula: '∇f = (∂f/∂x, ∂f/∂y)',
        prereq: 'The Derivative',
        pattern: 'Slices of a Surface',
        difficulty: 'Advanced',
        available: true,
    },
    {
        name: 'Gradient Descent',
        slug: 'gradient-descent',
        icon: Footprints,
        description: 'A ball stepping downhill on a loss surface in 3D and on its contour map. Slide the learning rate from crawling to converging to zigzagging to blowing up.',
        formula: 'x ← x − η ∇f(x)',
        prereq: 'Partial Derivatives and Gradients',
        pattern: 'Iterative Optimisation',
        difficulty: 'Advanced',
        available: true,
    },
];

const getDifficultyColor = (d) => {
    if (d === 'Beginner') return 'bg-slate-950/60 text-green-300';
    if (d === 'Intermediate') return 'bg-slate-950/60 text-yellow-300';
    return 'bg-slate-950/60 text-red-300';
};

export default function DifferentialCalculusPage() {
    return (
        <div className="min-h-screen bg-slate-950">
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-500 to-green-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                    <Link href="/" className="flex items-center text-white hover:text-emerald-100 transition-colors mb-8 w-fit">
                        <ArrowLeft className="h-5 w-5 mr-2" />Back to Home
                    </Link>
                    <div className="text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/20 mb-6">
                            <TrendingUp className="h-8 w-8 text-white" />
                        </div>
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">Differential Calculus</h1>
                        <p className="text-xl text-emerald-50 max-w-3xl mx-auto">
                            The mathematics of change. Squeeze a secant into a tangent, read a curve&apos;s shape from its
                            derivatives, and follow slopes to roots, to maxima and down a loss surface.
                        </p>
                    </div>
                </div>
            </div>

            {/* Cards */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {pages.map(page => {
                        const Icon = page.available ? page.icon : Construction;
                        const card = (
                            <div className="h-full flex flex-col bg-slate-900/70 rounded-2xl border border-slate-700/50 overflow-hidden hover:border-emerald-500/50 transition-colors group">
                                <div className={`bg-gradient-to-br from-emerald-500 to-green-600 p-6 ${!page.available ? 'opacity-60' : ''}`}>
                                    <div className="flex items-center justify-between">
                                        <Icon className="h-8 w-8 text-white" />
                                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${getDifficultyColor(page.difficulty)}`}>
                                            {page.difficulty}
                                        </span>
                                    </div>
                                    <h3 className="text-xl font-bold text-white mt-3">{page.name}</h3>
                                    {!page.available && (
                                        <span className="text-xs text-emerald-50/80">Coming Soon</span>
                                    )}
                                </div>
                                <div className="flex-1 flex flex-col p-6 gap-4">
                                    <p className="text-slate-400 text-sm leading-relaxed">{page.description}</p>
                                    <div className="mt-auto space-y-2 text-sm">
                                        <div className="flex justify-between items-start gap-3">
                                            <span className="text-slate-500 flex-shrink-0">Key formula</span>
                                            <code className="bg-emerald-500/15 text-emerald-300 px-2 py-0.5 rounded text-xs text-right">{page.formula}</code>
                                        </div>
                                        <div className="flex justify-between gap-3">
                                            <span className="text-slate-500">Builds on</span>
                                            <code className="bg-emerald-500/15 text-emerald-300 px-2 py-0.5 rounded text-xs text-right">{page.prereq}</code>
                                        </div>
                                        <div className="flex justify-between gap-3">
                                            <span className="text-slate-500">Pattern</span>
                                            <code className="bg-emerald-500/15 text-emerald-300 px-2 py-0.5 rounded text-xs text-right">{page.pattern}</code>
                                        </div>
                                    </div>
                                    {!page.available ? (
                                        <span className="text-slate-500 text-sm">Coming Soon</span>
                                    ) : (
                                        <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium group-hover:text-emerald-300 transition-colors">
                                            Start Visualization →
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                        return page.available ? (
                            <Link key={page.slug} href={`/differential-calculus/${page.slug}`} className="h-full flex flex-col">{card}</Link>
                        ) : (
                            <div key={page.slug} className="h-full flex flex-col opacity-50 cursor-not-allowed">{card}</div>
                        );
                    })}
                </div>
            </div>

            {/* Why Learn */}
            <div className="border-t border-slate-700/50 bg-slate-900/70">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <h2 className="text-2xl font-bold text-white mb-8 text-center">Why Learn Differential Calculus?</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                        {[
                            { title: 'Every Model Is Trained With It', body: 'Gradient descent is the derivative put to work: every neural network learns by following ∂loss/∂weight downhill, millions of parameters at a time.' },
                            { title: 'Best, Fastest, Cheapest', body: 'Any question that asks for the largest volume, the shortest time or the lowest cost becomes "where is the derivative zero?" — and then a picture tells you which one wins.' },
                            { title: 'How Computers Compute', body: 'Square roots come from Newton\'s method, sin and eˣ from Taylor polynomials. The functions in a maths library are calculus run a few steps at a time.' },
                        ].map(item => (
                            <div key={item.title} className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50">
                                <h3 className="text-emerald-400 font-semibold mb-2">{item.title}</h3>
                                <p className="text-slate-400 leading-relaxed">{item.body}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
