import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: 'Classification Metrics – Confusion Matrix, Precision, Recall, ROC and the Accuracy Trap',
    description: 'Slide a threshold over a real logistic regression\'s scores and watch the confusion matrix, precision, recall, F1 and the ROC and precision–recall curves move together — then see a 95%-accurate test that finds nobody.',
    keywords: ['classification metrics', 'confusion matrix', 'precision', 'recall', 'F1 score', 'ROC curve', 'AUC', 'precision-recall curve', 'class imbalance', 'machine learning'],
    openGraph: {
        title: 'Classification Metrics – DSAverse',
        description: 'On 200 screening sets with 5% positives, saying no to everyone was at least as accurate as a fitted model on 118. Accuracy hides what precision and recall show.',
        images: [{ url: '/og-image.png' }],
    },
    alternates: { canonical: '/machine-learning/classification-metrics' },
};

export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/machine-learning/classification-metrics" />
        </>
    );
}
