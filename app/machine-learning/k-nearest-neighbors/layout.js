import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: 'k-Nearest Neighbours – Distance, the Vote, the Decision Map and Choosing k',
    description: 'Classify a point by polling the k training points closest to it. Count the votes yourself, watch the decision map go from islands at k = 1 to one broad sweep at k = 39, see millimetres wreck the neighbours, and measure why distance stops meaning much in a thousand dimensions.',
    keywords: ['k-nearest neighbors', 'knn', 'k nearest neighbours classifier', 'choosing k', 'feature scaling', 'standardization', 'curse of dimensionality', 'decision boundary', 'machine learning'],
    openGraph: {
        title: 'k-Nearest Neighbours – DSAverse',
        description: 'k = 1 scores 100% on its own training points and memorises the noise. Watch the vote, the map and the units trap, all computed live.',
        images: [{ url: '/og-image.png' }],
    },
    alternates: { canonical: '/machine-learning/k-nearest-neighbors' },
};

export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/machine-learning/k-nearest-neighbors" />
        </>
    );
}
