import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: 'Gaussian Elimination Visualizer – Row Operations and Three Planes in 3D',
    description: 'Row-reduce a 3×3 system step by step to echelon form and RREF while three planes in 3D keep meeting at the same point — or never meet, or share a whole line.',
    keywords: ['gaussian elimination', 'row reduction', 'row echelon form', 'RREF', 'system of linear equations', 'planes intersection 3D', 'Gauss-Jordan'],
    openGraph: {
        title: 'Gaussian Elimination in 3D – DSAverse',
        description: 'Row operations change the planes but never the point they share.',
        images: [{ url: '/og-image.png' }],
    },
    alternates: { canonical: '/linear-algebra/gaussian-elimination' },
};

export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/linear-algebra/gaussian-elimination" />
        </>
    );
}
