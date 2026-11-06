import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: 'Backpropagation – The Chain Rule, Step by Step',
    description: 'Step through backpropagation on a real computation graph: every gradient is upstream × local, gradients add where paths meet, and each one is checked live against finite differences. Then train a network on XOR and break it on purpose.',
    keywords: ['backpropagation', 'backprop', 'chain rule', 'computational graph', 'autograd', 'gradient', 'neural network training', 'finite differences', 'gradient check', 'XOR'],
    openGraph: {
        title: 'Backpropagation – DSAverse',
        description: 'Backprop is the chain rule run in reverse. Step through every gradient on a real graph, then watch a network learn XOR.',
        images: [{ url: '/og-image.png' }],
    },
    alternates: { canonical: '/neural-networks/backpropagation' },
};

export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/neural-networks/backpropagation" />
        </>
    );
}
