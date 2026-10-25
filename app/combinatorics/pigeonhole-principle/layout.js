import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: 'Pigeonhole Principle Visualizer – Forced Collisions and the Handshake Puzzle',
    description: 'Drop pigeons into holes as kindly as possible and watch a collision become unavoidable: n pigeons in m holes force a hole with at least ⌈n / m⌉. Then a surprise: in any group of people, two have shaken the same number of hands — try to build a counterexample.',
    keywords: ['pigeonhole principle', 'generalized pigeonhole principle', 'ceiling n over m', 'handshake problem', 'socks problem', 'existence proof', 'combinatorics'],
    openGraph: {
        title: 'Pigeonhole Principle – DSAverse',
        description: 'More pigeons than holes means a shared hole. See why, then use it to prove two people always shook the same number of hands.',
        images: [{ url: '/og-image.png' }],
    },
    alternates: { canonical: '/combinatorics/pigeonhole-principle' },
};

export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/combinatorics/pigeonhole-principle" />
        </>
    );
}
