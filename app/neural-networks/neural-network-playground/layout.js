import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: 'Neural Network Playground – Build, Train and Break a Network Live',
    description: 'Pick a dataset, stack up to four hidden layers, choose the activation, optimizer, learning rate, weight decay and dropout, and train the network in your browser with every unit’s picture of the plane on view. Click a unit and a point to see its arithmetic; start every weight at 0.5 and watch eight units train as one.',
    keywords: ['neural network playground', 'interactive neural network', 'train a neural network in the browser', 'hidden units', 'decision boundary', 'weight initialization', 'symmetry breaking', 'activation functions', 'Adam optimizer'],
    openGraph: {
        title: 'Neural Network Playground – DSAverse',
        description: 'Build a network, train it live and look inside every unit — then break it on purpose.',
        images: [{ url: '/og-image.png' }],
    },
    alternates: { canonical: '/neural-networks/neural-network-playground' },
};

export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/neural-networks/neural-network-playground" />
        </>
    );
}
