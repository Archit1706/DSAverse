import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: 'Linear Regression – Gradient Descent and the Normal Equations',
    description: 'Drag ten points and watch gradient descent refit the line while a ball rolls down the real loss bowl in 3D. The normal equations, XᵀXθ = Xᵀy, land on the very same line in one step — every number computed live.',
    keywords: ['linear regression', 'least squares', 'normal equations', 'gradient descent', 'loss surface', 'mean squared error', 'closed form solution', 'learning rate', 'machine learning'],
    openGraph: {
        title: 'Linear Regression – DSAverse',
        description: 'Two routes to the best line: roll down the loss bowl, or solve XᵀXθ = Xᵀy. They meet at the same point.',
        images: [{ url: '/og-image.png' }],
    },
    alternates: { canonical: '/machine-learning/linear-regression' },
};

export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/machine-learning/linear-regression" />
        </>
    );
}
