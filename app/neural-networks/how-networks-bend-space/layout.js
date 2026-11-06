import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: 'How Networks Bend Space – Watch Each Layer Stretch, Shift and Squash the Plane Until a Straight Line Splits the Classes',
    description: 'Carry a whole grid and 160 points through a trained tanh network: the matrix stretches, the bias shifts, tanh squashes, and after two layers a straight cut separates two moons. Then a ring that no stack of 2-unit layers can cut, and one 3-unit layer that lifts it into 3D.',
    keywords: ['how neural networks work', 'hidden layer representation', 'decision boundary', 'tanh', 'linear separability', 'manifold', 'topology of neural networks', 'network width', 'neural networks'],
    openGraph: {
        title: 'How Networks Bend Space – DSAverse',
        description: 'No straight line splits the two moons. Two tanh layers bend the plane until one does. Then a ring that 80 networks with 2 units per layer could not cut, and one layer of 3 units that can.',
        images: [{ url: '/og-image.png' }],
    },
    alternates: { canonical: '/neural-networks/how-networks-bend-space' },
};

export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/neural-networks/how-networks-bend-space" />
        </>
    );
}
