import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: 'Volumes of Revolution in 3D – Disk and Washer Methods',
    description: 'Spin a region around the x-axis in 3D and slice the solid into disks or washers. Watch the stacked volumes converge on the exact integral for a cone, a sphere, a paraboloid and a hollow washer solid, with every slice\'s πR²Δx shown.',
    keywords: ['volumes of revolution', 'disk method', 'washer method', 'solid of revolution', 'volume integral', 'volume of a cone', 'volume of a sphere', '3D calculus', 'calculus visualization'],
    openGraph: {
        title: 'Volumes of Revolution in 3D – DSAverse',
        description: 'Spin a region into a solid, slice it into disks and washers, and add them up into an integral.',
        images: [{ url: '/og-image.png' }],
    },
    alternates: { canonical: '/integral-calculus/volumes-of-revolution' },
};

export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/integral-calculus/volumes-of-revolution" />
        </>
    );
}
