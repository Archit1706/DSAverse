import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: 'Classes, Objects and Memory',
    description: 'Visualize how Python classes and instances live in memory: __dict__, __class__ pointer, method lookup chain, and metaclasses.',
    keywords: ['oop', 'classes', 'objects', 'memory', 'python', 'method resolution'],
    openGraph: {
        title: 'Classes, Objects and Memory – DSAverse',
        description: 'See how Python instances live in memory: the instance __dict__, the __class__ pointer, and the method lookup chain.',
        images: [{ url: '/og-image.png' }],
    },
    alternates: { canonical: '/under-the-hood/classes-objects-and-memory' },
};
export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/under-the-hood/classes-objects-and-memory" />
        </>
    );
}
