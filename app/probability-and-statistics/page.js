import Link from 'next/link';
import {
    ArrowLeft, Dice5, Dices, Filter, Microscope, Scale, ChartColumn, ChartSpline, Target, ChartBarBig, Cake,
    Construction,
} from 'lucide-react';

export const metadata = {
    // Just the name: the root layout's "%s | DSAverse" template adds the suffix.
    title: 'Probability and Statistics',
    description: 'Interactive probability and statistics: sample spaces and events, conditional probability, Bayes\' theorem, expectation and variance, the binomial and normal distributions, the law of large numbers, the central limit theorem and the birthday paradox.',
};

/* Math cards describe a page by its key formula and the page it builds on,
   in place of time and space complexity. */
const pages = [
    {
        name: 'Sample Spaces and Events',
        slug: 'sample-spaces-and-events',
        icon: Dices,
        description: 'All 36 rolls of two dice on one grid and the 8 paths of three coins. Events are sets of outcomes — highlight them, then take unions, intersections and complements.',
        formula: 'P(E) = |E| / |Ω|',
        prereq: 'Counting Principle',
        pattern: 'Equally Likely Outcomes',
        difficulty: 'Beginner',
        available: true,
    },
    {
        name: 'Conditional Probability',
        slug: 'conditional-probability',
        icon: Filter,
        description: 'Knowing B happened shrinks the sample space to B. See it on the dice grid, then drag the splits of an area model and watch P(A | B) change.',
        formula: 'P(A | B) = P(A ∩ B) / P(B)',
        prereq: 'Sample Spaces and Events',
        pattern: 'Shrinking the Space',
        difficulty: 'Beginner',
        available: true,
    },
    {
        name: "Bayes' Theorem",
        slug: 'bayes-theorem',
        icon: Microscope,
        description: 'A thousand people, a rare condition and a good test. Slide the base rate, sensitivity and false-positive rate and see why most positives are false alarms.',
        formula: 'P(H | E) = P(E | H) P(H) / P(E)',
        prereq: 'Conditional Probability',
        pattern: 'Updating Beliefs',
        difficulty: 'Intermediate',
        available: true,
    },
    {
        name: 'Random Variables and Expectation',
        slug: 'random-variables-and-expectation',
        icon: Scale,
        description: 'A distribution as bars on a beam. The expected value is where it balances, and the variance measures how far the weight sits from that point. Drag the bars.',
        formula: 'E[X] = ∑ x · p(x)',
        prereq: 'Sample Spaces and Events',
        pattern: 'Weighted Average',
        difficulty: 'Beginner',
        available: true,
    },
    {
        name: 'Binomial Distribution',
        slug: 'binomial-distribution',
        icon: ChartColumn,
        description: 'Balls bounce left or right through a Galton board and pile up in bins. The pile takes the shape of C(n, k) pᵏ (1 − p)ⁿ⁻ᵏ — change n and p and drop more.',
        formula: 'P(X = k) = C(n, k) pᵏ (1 − p)ⁿ⁻ᵏ',
        prereq: 'Random Variables and Expectation',
        pattern: 'Repeated Trials',
        difficulty: 'Intermediate',
        available: true,
    },
    {
        name: 'Normal Distribution',
        slug: 'normal-distribution',
        icon: ChartSpline,
        description: 'Slide μ and σ, drag two points along the axis, and read off the area between them. The 68–95–99.7 rule and z-scores fall out of one curve.',
        formula: 'f(x) = e^(−(x − μ)² / 2σ²) / (σ√(2π))',
        prereq: 'Binomial Distribution',
        pattern: 'Continuous Density',
        difficulty: 'Intermediate',
        available: true,
    },
    {
        name: 'Law of Large Numbers',
        slug: 'law-of-large-numbers',
        icon: Target,
        description: 'Roll a die thousands of times and track the running average. It wanders at first, then settles on 3.5 inside a band that narrows like 1 / √n.',
        formula: 'X̄ₙ → μ as n → ∞',
        prereq: 'Random Variables and Expectation',
        pattern: 'Convergence',
        difficulty: 'Intermediate',
        available: true,
    },
    {
        name: 'Central Limit Theorem',
        slug: 'central-limit-theorem',
        icon: ChartBarBig,
        description: 'Draw samples from a lopsided distribution and average each one. The averages pile up into a bell curve whose width shrinks as σ / √n.',
        formula: 'X̄ₙ ≈ N(μ, σ² / n)',
        prereq: 'Law of Large Numbers',
        pattern: 'Sampling Distribution',
        difficulty: 'Advanced',
        available: true,
    },
    {
        name: 'Birthday Paradox',
        slug: 'birthday-paradox',
        icon: Cake,
        description: 'With only 23 people the chance of a shared birthday passes 50%. The exact curve against a seeded simulation, and the pairs that explain it.',
        formula: 'P = 1 − ∏ (365 − i) / 365',
        prereq: 'Sample Spaces and Events',
        pattern: 'Complement Counting',
        difficulty: 'Beginner',
        available: true,
    },
];

/* Translucent badges wash out on a rose header, so these sit on a dark backing. */
const getDifficultyColor = (d) => {
    if (d === 'Beginner') return 'bg-slate-950/60 text-green-300';
    if (d === 'Intermediate') return 'bg-slate-950/60 text-yellow-300';
    return 'bg-slate-950/60 text-red-300';
};

export default function ProbabilityAndStatisticsPage() {
    return (
        <div className="min-h-screen bg-slate-950">
            {/* Header */}
            <div className="bg-gradient-to-r from-rose-500 to-red-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                    <Link href="/" className="flex items-center text-white hover:text-rose-100 transition-colors mb-8 w-fit">
                        <ArrowLeft className="h-5 w-5 mr-2" />Back to Home
                    </Link>
                    <div className="text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/20 mb-6">
                            <Dice5 className="h-8 w-8 text-white" />
                        </div>
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">Probability and Statistics</h1>
                        <p className="text-xl text-rose-50 max-w-3xl mx-auto">
                            Probability is counting with weights; statistics is reasoning back from data. Roll dice, test a
                            thousand people, drop balls through a Galton board and watch averages settle — every simulation
                            here is seeded, so you can replay it.
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
                            <div className="h-full flex flex-col bg-slate-900/70 rounded-2xl border border-slate-700/50 overflow-hidden hover:border-rose-500/50 transition-colors group">
                                <div className={`bg-gradient-to-br from-rose-500 to-red-600 p-6 ${!page.available ? 'opacity-60' : ''}`}>
                                    <div className="flex items-center justify-between">
                                        <Icon className="h-8 w-8 text-white" />
                                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${getDifficultyColor(page.difficulty)}`}>
                                            {page.difficulty}
                                        </span>
                                    </div>
                                    <h3 className="text-xl font-bold text-white mt-3">{page.name}</h3>
                                    {page.coveredIn && (
                                        <span className="text-xs text-rose-50/90">Covered in {page.coveredIn}</span>
                                    )}
                                    {!page.available && (
                                        <span className="text-xs text-rose-50/80">Coming Soon</span>
                                    )}
                                </div>
                                <div className="flex-1 flex flex-col p-6 gap-4">
                                    <p className="text-slate-400 text-sm leading-relaxed">{page.description}</p>
                                    <div className="mt-auto space-y-2 text-sm">
                                        <div className="flex justify-between items-start gap-3">
                                            <span className="text-slate-500 flex-shrink-0">Key formula</span>
                                            <code className="bg-rose-500/15 text-rose-300 px-2 py-0.5 rounded text-xs text-right">{page.formula}</code>
                                        </div>
                                        <div className="flex justify-between gap-3">
                                            <span className="text-slate-500">Builds on</span>
                                            <code className="bg-rose-500/15 text-rose-300 px-2 py-0.5 rounded text-xs text-right">{page.prereq}</code>
                                        </div>
                                        <div className="flex justify-between gap-3">
                                            <span className="text-slate-500">Pattern</span>
                                            <code className="bg-rose-500/15 text-rose-300 px-2 py-0.5 rounded text-xs text-right">{page.pattern}</code>
                                        </div>
                                    </div>
                                    {!page.available ? (
                                        <span className="text-slate-500 text-sm">Coming Soon</span>
                                    ) : (
                                        <div className="flex items-center gap-2 text-rose-400 text-sm font-medium group-hover:text-rose-300 transition-colors">
                                            {page.coveredIn ? `Open in ${page.coveredIn} →` : 'Start Visualization →'}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                        return page.available ? (
                            <Link key={page.slug} href={page.href ?? `/probability-and-statistics/${page.slug}`} className="h-full flex flex-col">{card}</Link>
                        ) : (
                            <div key={page.slug} className="h-full flex flex-col opacity-50 cursor-not-allowed">{card}</div>
                        );
                    })}
                </div>
            </div>

            {/* Why Learn */}
            <div className="border-t border-slate-700/50 bg-slate-900/70">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <h2 className="text-2xl font-bold text-white mb-8 text-center">Why Learn Probability and Statistics?</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                        {[
                            { title: 'Intuition Misleads', body: 'A 99%-accurate test, a room of 23 people, a streak of heads — the obvious answer is usually wrong. A picture of the whole sample space is the fastest fix.' },
                            { title: 'Randomised Algorithms Need It', body: 'Hashing, quicksort\'s pivot, Bloom filters, load balancing and A/B tests all rest on expectation, variance and the way averages concentrate.' },
                            { title: 'Data Is Everywhere', body: 'Every metric, survey and benchmark is a sample. The law of large numbers and the central limit theorem say how much one can be trusted.' },
                        ].map(item => (
                            <div key={item.title} className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50">
                                <h3 className="text-rose-400 font-semibold mb-2">{item.title}</h3>
                                <p className="text-slate-400 leading-relaxed">{item.body}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
