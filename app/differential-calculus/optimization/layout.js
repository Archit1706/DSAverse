import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: 'Optimization Visualizer – The Open Box Problem',
    description: 'Cut squares from the corners of a 30 cm sheet and fold it into an open box. Watch the volume curve rise and fall as the cut grows, see the tangent go flat at the best cut, and solve V′(x) = 0 to find it exactly: one sixth of the side, for any sheet.',
    keywords: ['optimization', 'calculus optimization', 'open box problem', 'maximum volume', 'critical points', 'first derivative test', 'applied derivatives', 'calculus visualization'],
    openGraph: {
        title: 'Optimization: The Open Box – DSAverse',
        description: 'Which corner cut makes the biggest box? Find it where the tangent to the volume curve goes flat.',
        images: [{ url: '/og-image.png' }],
    },
    alternates: { canonical: '/differential-calculus/optimization' },
};

export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/differential-calculus/optimization" />
        </>
    );
}
