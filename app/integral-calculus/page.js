import Link from 'next/link';
import {
    ArrowLeft, ChartArea, ChartColumn, Activity, Repeat, SplitSquareHorizontal, BetweenHorizontalStart,
    Cylinder, Calculator, Construction,
} from 'lucide-react';

export const metadata = {
    // Just the name: the root layout's "%s | DSAverse" template adds the suffix.
    title: 'Integral Calculus',
    description: 'Interactive integral calculus: Riemann sums, signed area, the Fundamental Theorem of Calculus, substitution, integration by parts, area between curves, volumes of revolution in 3D, and numerical integration.',
};

/* Math cards describe a page by its key formula and the page it builds on,
   in place of time and space complexity. The order mirrors the nav. */
const pages = [
    {
        name: 'Riemann Sums',
        slug: 'riemann-sums',
        icon: ChartColumn,
        description: 'Fill the area under a curve with rectangles — left, right or midpoint — and watch the error shrink as the rectangles get thinner.',
        formula: 'Σ f(xᵢ) Δx',
        prereq: 'Limits',
        pattern: 'Rectangles Under a Curve',
        difficulty: 'Beginner',
        available: true,
    },
    {
        name: 'The Definite Integral',
        slug: 'the-definite-integral',
        icon: ChartArea,
        description: 'The limit of Riemann sums is a signed area: pieces above the axis count positive, pieces below count negative.',
        formula: '∫ₐᵇ f(x) dx = lim n→∞ Σ f(xᵢ) Δx',
        prereq: 'Riemann Sums',
        pattern: 'Signed Area',
        difficulty: 'Beginner',
        available: true,
    },
    {
        name: 'Fundamental Theorem of Calculus',
        slug: 'fundamental-theorem-of-calculus',
        icon: Activity,
        description: 'Sweep the right edge of an area along the axis and plot how much has accumulated. The slope of that curve at every x is exactly f(x).',
        formula: 'd/dx ∫ₐˣ f(t) dt = f(x)',
        prereq: 'The Definite Integral',
        pattern: 'Accumulation',
        difficulty: 'Intermediate',
        available: true,
    },
    {
        name: 'Integration by Substitution',
        slug: 'integration-by-substitution',
        icon: Repeat,
        description: 'Change the variable and the axis stretches: each thin strip gets wider by u′(x) and shorter by the same factor, so the area survives intact.',
        formula: '∫ f(g(x)) g′(x) dx = ∫ f(u) du',
        prereq: 'Fundamental Theorem of Calculus',
        pattern: 'Change of Variable',
        difficulty: 'Intermediate',
        available: true,
    },
    {
        name: 'Integration by Parts',
        slug: 'integration-by-parts',
        icon: SplitSquareHorizontal,
        description: 'Trace the curve (u, v) and the rectangle under its end point splits into two regions: ∫u dv on one side of the curve and ∫v du on the other.',
        formula: '∫ u dv = uv − ∫ v du',
        prereq: 'Derivative Rules',
        pattern: 'The Product Rule Reversed',
        difficulty: 'Intermediate',
        available: true,
    },
    {
        name: 'Area Between Curves',
        slug: 'area-between-curves',
        icon: BetweenHorizontalStart,
        description: 'Find where two curves meet, then add up thin strips of height top minus bottom — splitting the range wherever the curves swap places.',
        formula: 'A = ∫ₐᵇ (top − bottom) dx',
        prereq: 'The Definite Integral',
        pattern: 'Vertical Strips',
        difficulty: 'Intermediate',
        available: true,
    },
    {
        name: 'Volumes of Revolution',
        slug: 'volumes-of-revolution',
        icon: Cylinder,
        description: 'Spin a region around an axis in 3D. Slice the solid into disks or washers, add up their volumes, and watch the total converge on a cone, a sphere or a paraboloid.',
        formula: 'V = ∫ₐᵇ π f(x)² dx',
        prereq: 'Area Between Curves',
        pattern: 'Disks and Washers',
        difficulty: 'Advanced',
        available: true,
    },
    {
        name: 'Numerical Integration',
        slug: 'numerical-integration',
        icon: Calculator,
        description: 'Trapezoids, midpoints and Simpson\'s parabolas side by side. Double n and the errors fall by 4, 4 and 16 — straight lines on a log scale.',
        formula: 'Simpson: (Δx/3)(f₀ + 4f₁ + 2f₂ + … + fₙ)',
        prereq: 'Riemann Sums',
        pattern: 'Error Orders',
        difficulty: 'Advanced',
        available: true,
    },
];

const getDifficultyColor = (d) => {
    if (d === 'Beginner') return 'bg-slate-950/60 text-green-300';
    if (d === 'Intermediate') return 'bg-slate-950/60 text-yellow-300';
    return 'bg-slate-950/60 text-red-300';
};

export default function IntegralCalculusPage() {
    return (
        <div className="min-h-screen bg-slate-950">
            {/* Header */}
            <div className="bg-gradient-to-r from-teal-500 to-cyan-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                    <Link href="/" className="flex items-center text-white hover:text-teal-100 transition-colors mb-8 w-fit">
                        <ArrowLeft className="h-5 w-5 mr-2" />Back to Home
                    </Link>
                    <div className="text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/20 mb-6">
                            <ChartArea className="h-8 w-8 text-white" />
                        </div>
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">Integral Calculus</h1>
                        <p className="text-xl text-teal-50 max-w-3xl mx-auto">
                            The mathematics of accumulation. Fill an area with rectangles, let them get thin, and the sum
                            becomes an integral — an area, a volume, a total — tied back to derivatives by one theorem.
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
                            <div className="h-full flex flex-col bg-slate-900/70 rounded-2xl border border-slate-700/50 overflow-hidden hover:border-teal-500/50 transition-colors group">
                                <div className={`bg-gradient-to-br from-teal-500 to-cyan-600 p-6 ${!page.available ? 'opacity-60' : ''}`}>
                                    <div className="flex items-center justify-between">
                                        <Icon className="h-8 w-8 text-white" />
                                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${getDifficultyColor(page.difficulty)}`}>
                                            {page.difficulty}
                                        </span>
                                    </div>
                                    <h3 className="text-xl font-bold text-white mt-3">{page.name}</h3>
                                    {!page.available && (
                                        <span className="text-xs text-teal-50/80">Coming Soon</span>
                                    )}
                                </div>
                                <div className="flex-1 flex flex-col p-6 gap-4">
                                    <p className="text-slate-400 text-sm leading-relaxed">{page.description}</p>
                                    <div className="mt-auto space-y-2 text-sm">
                                        <div className="flex justify-between items-start gap-3">
                                            <span className="text-slate-500 flex-shrink-0">Key formula</span>
                                            <code className="bg-teal-500/15 text-teal-300 px-2 py-0.5 rounded text-xs text-right">{page.formula}</code>
                                        </div>
                                        <div className="flex justify-between gap-3">
                                            <span className="text-slate-500">Builds on</span>
                                            <code className="bg-teal-500/15 text-teal-300 px-2 py-0.5 rounded text-xs text-right">{page.prereq}</code>
                                        </div>
                                        <div className="flex justify-between gap-3">
                                            <span className="text-slate-500">Pattern</span>
                                            <code className="bg-teal-500/15 text-teal-300 px-2 py-0.5 rounded text-xs text-right">{page.pattern}</code>
                                        </div>
                                    </div>
                                    {!page.available ? (
                                        <span className="text-slate-500 text-sm">Coming Soon</span>
                                    ) : (
                                        <div className="flex items-center gap-2 text-teal-400 text-sm font-medium group-hover:text-teal-300 transition-colors">
                                            Start Visualization →
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                        return page.available ? (
                            <Link key={page.slug} href={`/integral-calculus/${page.slug}`} className="h-full flex flex-col">{card}</Link>
                        ) : (
                            <div key={page.slug} className="h-full flex flex-col opacity-50 cursor-not-allowed">{card}</div>
                        );
                    })}
                </div>
            </div>

            {/* Why Learn */}
            <div className="border-t border-slate-700/50 bg-slate-900/70">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <h2 className="text-2xl font-bold text-white mb-8 text-center">Why Learn Integral Calculus?</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                        {[
                            { title: 'Totals from Rates', body: 'Distance from speed, charge from current, work from force: whenever you know how fast something accumulates, the integral gives the total.' },
                            { title: 'Probability Lives Here', body: 'Every continuous probability is an area under a density curve, and every expected value is an integral. Statistics is integration in disguise.' },
                            { title: 'Computers Integrate Numerically', body: 'Most integrals have no closed form. Physics engines, finance models and ML all rely on the trapezoid and Simpson rules — and on knowing how fast their errors shrink.' },
                        ].map(item => (
                            <div key={item.title} className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50">
                                <h3 className="text-teal-400 font-semibold mb-2">{item.title}</h3>
                                <p className="text-slate-400 leading-relaxed">{item.body}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
