import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: 'Decision Trees – Gini Impurity, the Threshold Scan and Greedy Growth',
    description: 'Score every threshold on every feature by weighted Gini impurity, keep the lowest, and repeat inside each side. Predict which candidates beat the best so far, watch the plane split into boxes, see an unlimited tree memorise its data, and measure how greedy growth fails on XOR.',
    keywords: ['decision tree', 'gini impurity', 'decision tree split', 'CART', 'tree depth', 'overfitting', 'greedy algorithm', 'xor', 'machine learning'],
    openGraph: {
        title: 'Decision Trees – DSAverse',
        description: 'On XOR, greedy depth-2 trees average 64% on new points; the best depth-2 tree, found by brute force, averages 90%. Every split searched live.',
        images: [{ url: '/og-image.png' }],
    },
    alternates: { canonical: '/machine-learning/decision-trees' },
};

export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/machine-learning/decision-trees" />
        </>
    );
}
