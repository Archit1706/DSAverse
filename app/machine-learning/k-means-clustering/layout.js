import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: 'k-Means Clustering – Assign, Update, Bad Starts and the Elbow',
    description: 'Assign every point to its nearest centre, move every centre to its points\' mean, repeat. Predict which centre a point joins, watch the objective fall at every half-step, see a bad start get trapped, and why the lowest J cannot choose k.',
    keywords: ['k-means', 'k-means clustering', 'clustering', 'k-means++', 'lloyd algorithm', 'elbow method', 'voronoi', 'unsupervised learning', 'machine learning'],
    openGraph: {
        title: 'k-Means Clustering – DSAverse',
        description: 'On nine blobs, 170 of 200 random starts end trapped in a worse clustering; k-means++ halves that, and keeping the best of ten starts fixes it. Run live in the browser.',
        images: [{ url: '/og-image.png' }],
    },
    alternates: { canonical: '/machine-learning/k-means-clustering' },
};

export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/machine-learning/k-means-clustering" />
        </>
    );
}
