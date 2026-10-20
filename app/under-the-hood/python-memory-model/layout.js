import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: 'Python Memory Model',
    description: 'Visualize Python memory internals: PyObject, reference counting, the small int cache, closures, and LEGB name resolution.',
    keywords: ['python', 'memory', 'reference counting', 'pyobject', 'heap', 'stack'],
    openGraph: {
        title: 'Python Memory Model – DSAverse',
        description: 'PyObject layout, reference counting, the small integer cache, closures, and LEGB name resolution.',
        images: [{ url: '/og-image.png' }],
    },
    alternates: { canonical: '/under-the-hood/python-memory-model' },
};
export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/under-the-hood/python-memory-model" />
        </>
    );
}
