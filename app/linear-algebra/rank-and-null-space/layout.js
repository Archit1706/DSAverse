import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: 'Rank and Null Space Visualizer – Squashing 3D Space',
    description: 'Watch a 3×3 matrix squash the unit cube onto a plane or a line, see the column space and the null space in 3D, and check that rank plus nullity is always 3.',
    keywords: ['rank', 'null space', 'nullity', 'column space', 'rank nullity theorem', 'kernel', 'linear algebra 3D'],
    openGraph: {
        title: 'Rank and Null Space in 3D – DSAverse',
        description: 'What survives a matrix, what is crushed to zero, and why the two add up to three.',
        images: [{ url: '/og-image.png' }],
    },
    alternates: { canonical: '/linear-algebra/rank-and-null-space' },
};

export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/linear-algebra/rank-and-null-space" />
        </>
    );
}
