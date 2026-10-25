import Link from 'next/link';
import {
    ArrowLeft, Combine, Network, ListOrdered, Group, Triangle, Sigma, Star, Blend, Bird,
    Shuffle, Layers, Calculator, Construction,
} from 'lucide-react';

export const metadata = {
    // Just the name: the root layout's "%s | DSAverse" template adds the suffix.
    title: 'Combinatorics',
    description: 'Interactive combinatorics: the counting principle as a growing decision tree, permutations and combinations, Pascal\'s triangle, the binomial theorem in 3D, stars and bars, inclusion-exclusion and the pigeonhole principle.',
};

/* Cards come in two flavours:
     - built here          -> links to /combinatorics/<slug>
     - covered elsewhere   -> `href` + `coveredIn` link out to the existing page
   Math cards describe a page by its key formula and the page it builds on,
   in place of time and space complexity. */
const pages = [
    {
        name: 'Counting Principle',
        slug: 'counting-principle',
        icon: Network,
        description: 'A decision tree that grows one stage at a time: every choice multiplies the leaves. Then the addition rule for either-or cases.',
        formula: 'total = n₁ × n₂ × … × nₖ',
        prereq: 'Multiplication',
        pattern: 'Multiplication Rule',
        difficulty: 'Beginner',
        available: true,
    },
    {
        name: 'Permutations',
        slug: 'permutations',
        icon: ListOrdered,
        description: 'Fill k slots from n items and watch the choices shrink — n, n − 1, n − 2 — or stay at n when repeats are allowed.',
        formula: 'P(n, k) = n! / (n − k)!',
        prereq: 'Counting Principle',
        pattern: 'Ordered Selection',
        difficulty: 'Beginner',
        available: true,
    },
    {
        name: 'Combinations',
        slug: 'combinations',
        icon: Group,
        description: 'List every ordered pick, then gather the k! orderings of each set into one row. What is left is nCr.',
        formula: 'C(n, k) = n! / (k! (n − k)!)',
        prereq: 'Permutations',
        pattern: 'Unordered Selection',
        difficulty: 'Beginner',
        available: true,
    },
    {
        name: "Pascal's Triangle",
        slug: 'pascals-triangle',
        icon: Triangle,
        description: 'Build each row by adding the two numbers above. Find C(n, k), its mirror image, the hockey stick and the row sums of 2ⁿ.',
        formula: 'C(n, k) = C(n − 1, k − 1) + C(n − 1, k)',
        prereq: 'Combinations',
        pattern: 'Recurrence',
        difficulty: 'Beginner',
        available: true,
    },
    {
        name: 'Binomial Theorem',
        slug: 'binomial-theorem',
        icon: Sigma,
        description: 'Expand (a + b)ⁿ by picking a or b from each factor, and see why the coefficients are C(n, k) — with (a + b)³ as a cube cut into 8 blocks.',
        formula: '(a + b)ⁿ = ∑ C(n, k) aⁿ⁻ᵏ bᵏ',
        prereq: "Pascal's Triangle",
        pattern: 'Expansion',
        difficulty: 'Intermediate',
        available: true,
    },
    {
        name: 'Stars and Bars',
        slug: 'stars-and-bars',
        icon: Star,
        description: 'Share n identical items among k bins by dragging k − 1 bars through a row of stars. Every arrangement is one distribution.',
        formula: 'C(n + k − 1, k − 1)',
        prereq: 'Combinations',
        pattern: 'Bijection',
        difficulty: 'Intermediate',
        available: true,
    },
    {
        name: 'Inclusion-Exclusion',
        slug: 'inclusion-exclusion',
        icon: Blend,
        description: 'Count a union of overlapping sets by adding, subtracting and adding back — with a tally on every Venn region so nothing is counted twice.',
        formula: '|A ∪ B ∪ C| = ∑|A| − ∑|A ∩ B| + |A ∩ B ∩ C|',
        prereq: 'Counting Principle',
        pattern: 'Overcount Correction',
        difficulty: 'Intermediate',
        available: true,
    },
    {
        name: 'Pigeonhole Principle',
        slug: 'pigeonhole-principle',
        icon: Bird,
        description: 'More pigeons than holes forces a collision. Then a surprise: in any group, two people have shaken the same number of hands.',
        formula: 'some hole holds ≥ ⌈n / m⌉',
        prereq: 'Counting Principle',
        pattern: 'Existence Proof',
        difficulty: 'Intermediate',
        available: true,
    },
    {
        name: 'Generating Permutations',
        slug: 'generating-permutations',
        href: '/recursion/permutations',
        coveredIn: 'Recursion',
        icon: Shuffle,
        description: 'The code side of permutations: build every ordering with recursion and backtracking, one choice per level of the call tree.',
        formula: 'n! orderings',
        prereq: 'Permutations',
        pattern: 'Backtracking',
        difficulty: 'Intermediate',
        available: true,
    },
    {
        name: 'Generating Subsets',
        slug: 'generating-subsets',
        href: '/recursion/subsets-power-set',
        coveredIn: 'Recursion',
        icon: Layers,
        description: 'Include or exclude each element in turn: the 2ⁿ leaves of the recursion tree are exactly the subsets that Pascal\'s rows count.',
        formula: '2ⁿ subsets',
        prereq: 'Combinations',
        pattern: 'Include / Exclude',
        difficulty: 'Intermediate',
        available: true,
    },
    {
        name: 'Factorial (Recursion)',
        slug: 'factorial-recursion',
        href: '/recursion/factorial',
        coveredIn: 'Recursion',
        icon: Calculator,
        description: 'n! = n × (n − 1)! computed by recursion, with the call stack growing and unwinding — the number every page here divides by.',
        formula: 'n! = n × (n − 1)!',
        prereq: 'Multiplication',
        pattern: 'Recursion',
        difficulty: 'Beginner',
        available: true,
    },
];

/* Translucent badges wash out on a fuchsia header, so these sit on a dark backing. */
const getDifficultyColor = (d) => {
    if (d === 'Beginner') return 'bg-slate-950/60 text-green-300';
    if (d === 'Intermediate') return 'bg-slate-950/60 text-yellow-300';
    return 'bg-slate-950/60 text-red-300';
};

export default function CombinatoricsPage() {
    return (
        <div className="min-h-screen bg-slate-950">
            {/* Header */}
            <div className="bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                    <Link href="/" className="flex items-center text-white hover:text-fuchsia-100 transition-colors mb-8 w-fit">
                        <ArrowLeft className="h-5 w-5 mr-2" />Back to Home
                    </Link>
                    <div className="text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/20 mb-6">
                            <Combine className="h-8 w-8 text-white" />
                        </div>
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">Combinatorics</h1>
                        <p className="text-xl text-fuchsia-50 max-w-3xl mx-auto">
                            Combinatorics is counting without listing. Grow a decision tree, fill slots, regroup
                            orderings, build Pascal&apos;s triangle and slide bars through stars — and see where every
                            formula comes from.
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
                            <div className="h-full flex flex-col bg-slate-900/70 rounded-2xl border border-slate-700/50 overflow-hidden hover:border-fuchsia-500/50 transition-colors group">
                                <div className={`bg-gradient-to-br from-fuchsia-500 to-purple-600 p-6 ${!page.available ? 'opacity-60' : ''}`}>
                                    <div className="flex items-center justify-between">
                                        <Icon className="h-8 w-8 text-white" />
                                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${getDifficultyColor(page.difficulty)}`}>
                                            {page.difficulty}
                                        </span>
                                    </div>
                                    <h3 className="text-xl font-bold text-white mt-3">{page.name}</h3>
                                    {page.coveredIn && (
                                        <span className="text-xs text-fuchsia-50/90">Covered in {page.coveredIn}</span>
                                    )}
                                    {!page.available && (
                                        <span className="text-xs text-fuchsia-50/80">Coming Soon</span>
                                    )}
                                </div>
                                <div className="flex-1 flex flex-col p-6 gap-4">
                                    <p className="text-slate-400 text-sm leading-relaxed">{page.description}</p>
                                    <div className="mt-auto space-y-2 text-sm">
                                        <div className="flex justify-between items-start gap-3">
                                            <span className="text-slate-500 flex-shrink-0">Key formula</span>
                                            <code className="bg-fuchsia-500/15 text-fuchsia-300 px-2 py-0.5 rounded text-xs text-right">{page.formula}</code>
                                        </div>
                                        <div className="flex justify-between gap-3">
                                            <span className="text-slate-500">Builds on</span>
                                            <code className="bg-fuchsia-500/15 text-fuchsia-300 px-2 py-0.5 rounded text-xs">{page.prereq}</code>
                                        </div>
                                        <div className="flex justify-between gap-3">
                                            <span className="text-slate-500">Pattern</span>
                                            <code className="bg-fuchsia-500/15 text-fuchsia-300 px-2 py-0.5 rounded text-xs">{page.pattern}</code>
                                        </div>
                                    </div>
                                    {!page.available ? (
                                        <span className="text-slate-500 text-sm">Coming Soon</span>
                                    ) : (
                                        <div className="flex items-center gap-2 text-fuchsia-400 text-sm font-medium group-hover:text-fuchsia-300 transition-colors">
                                            {page.coveredIn ? `Open in ${page.coveredIn} →` : 'Start Visualization →'}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                        return page.available ? (
                            <Link key={page.slug} href={page.href ?? `/combinatorics/${page.slug}`} className="h-full flex flex-col">{card}</Link>
                        ) : (
                            <div key={page.slug} className="h-full flex flex-col opacity-50 cursor-not-allowed">{card}</div>
                        );
                    })}
                </div>
            </div>

            {/* Why Learn */}
            <div className="border-t border-slate-700/50 bg-slate-900/70">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <h2 className="text-2xl font-bold text-white mb-8 text-center">Why Learn Combinatorics?</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                        {[
                            { title: 'Probability Starts Here', body: 'Every "equally likely" probability is a count divided by a count. Poker hands, birthday collisions and lottery odds are combinatorics problems first.' },
                            { title: 'Algorithms Count Too', body: 'How many subsets a brute-force search tries, how many paths a grid has, how many interleavings two threads allow — complexity analysis is counting.' },
                            { title: 'Formulas You Can Rebuild', body: 'nPr, nCr and stars and bars are not facts to memorise. Each comes from one picture, and once you have seen the picture you can rebuild the formula.' },
                        ].map(item => (
                            <div key={item.title} className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50">
                                <h3 className="text-fuchsia-400 font-semibold mb-2">{item.title}</h3>
                                <p className="text-slate-400 leading-relaxed">{item.body}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
