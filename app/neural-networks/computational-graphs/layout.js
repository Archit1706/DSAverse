import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: 'Computational Graphs – How Autograd Records Each Operation and Replays the Tape Backwards',
    description: 'Run L = (wx + b − y)² through a real autograd engine: each operation records its value and its local derivatives on a tape, the tape replays newest first, and a value used twice sums the gradients from both uses.',
    keywords: ['computational graph', 'autograd', 'automatic differentiation', 'reverse mode', 'chain rule', 'gradient tape', 'local derivative', 'gradient accumulation', 'neural networks'],
    openGraph: {
        title: 'Computational Graphs – DSAverse',
        description: 'Every operation stores its local derivatives as plain numbers; the backward pass multiplies them in reverse. Then use w twice and watch its gradient become a sum.',
        images: [{ url: '/og-image.png' }],
    },
    alternates: { canonical: '/neural-networks/computational-graphs' },
};

export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/neural-networks/computational-graphs" />
        </>
    );
}
