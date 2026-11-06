import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: 'Principal Component Analysis – Directions of Spread, Eigenvectors and Flattening',
    description: 'Hunt for the direction a cloud of points spreads most, see that it is an eigenvector of the covariance matrix, flatten 2D and 3D data onto the top components, and watch a change of units swing the answer. Every number computed live.',
    keywords: ['principal component analysis', 'PCA', 'covariance matrix', 'eigenvectors', 'explained variance', 'dimensionality reduction', 'standardisation', 'machine learning'],
    openGraph: {
        title: 'Principal Component Analysis – DSAverse',
        description: 'On 200 labelled clouds, a threshold on the top component separated the classes better than one on the second in only 40. PCA keeps spread, not signal.',
        images: [{ url: '/og-image.png' }],
    },
    alternates: { canonical: '/machine-learning/principal-component-analysis' },
};

export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/machine-learning/principal-component-analysis" />
        </>
    );
}
