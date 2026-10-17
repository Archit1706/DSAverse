export const metadata = {
    title: 'Union by Rank',
    description: 'Visualize union by rank: always attach the shorter tree under the taller one. Rank labels on every node show why tree height stays logarithmic.',
    keywords: ['union by rank', 'union find', 'disjoint set', 'rank heuristic', 'height bounded', 'visualization'],
    openGraph: {
        title: 'Union by Rank – DSAverse',
        description: 'Always attach the shorter tree under the taller one, with rank labels showing why height stays logarithmic.',
        images: [{ url: '/og-image.png' }],
    },
    alternates: { canonical: '/union-find/union-by-rank' },
};
export default function Layout({ children }) { return children; }
