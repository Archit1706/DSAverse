import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export const metadata = {
    title: { template: '%s – Machine Learning | DSAverse', default: 'Machine Learning | DSAverse' },
    description: 'Interactive machine learning: fit a line by hand and by gradient descent, roll down a real loss surface, watch overfitting trace a U, grow a decision tree split by split, run k-means and PCA, and read a confusion matrix — every number computed live in your browser.',
    keywords: ['machine learning', 'linear regression', 'logistic regression', 'loss function', 'overfitting', 'cross-validation', 'k-nearest neighbors', 'decision tree', 'k-means', 'PCA', 'precision and recall', 'machine learning visualization'],
    openGraph: {
        title: 'Machine Learning Visualizers – DSAverse',
        description: 'Learning is a search for parameters that make a loss small. See it happen on real numbers: regression, classification, trees, clustering, PCA and the metrics that judge them.',
        images: [{ url: '/og-image.png', width: 1200, height: 630 }],
    },
    alternates: { canonical: '/machine-learning' },
};

export default function MachineLearningLayout({ children }) {
    return (
        <>
            <Navbar />
            <main className="pt-16">{children}</main>
            <Footer />
        </>
    );
}
