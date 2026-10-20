import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: 'Inheritance and MRO',
    description: 'Visualize C3 linearization step by step, the diamond problem, how super() walks the MRO chain, and multiple inheritance.',
    keywords: ['inheritance', 'mro', 'c3 linearization', 'super', 'python', 'oop'],
    openGraph: {
        title: 'Inheritance and MRO – DSAverse',
        description: 'C3 linearization step by step, the diamond problem, and how super() walks the method resolution order.',
        images: [{ url: '/og-image.png' }],
    },
    alternates: { canonical: '/under-the-hood/inheritance-and-mro' },
};
export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/under-the-hood/inheritance-and-mro" />
        </>
    );
}
