import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: 'Multithreading',
    description: 'Visualize thread creation, time slicing, race conditions, mutex locks, and deadlock with animated examples.',
    keywords: ['multithreading', 'race condition', 'mutex', 'deadlock', 'thread', 'concurrency'],
    openGraph: {
        title: 'Multithreading – DSAverse',
        description: 'Thread creation, time slicing, race conditions, mutex locks, and deadlock, animated step by step.',
        images: [{ url: '/og-image.png' }],
    },
    alternates: { canonical: '/under-the-hood/multithreading' },
};
export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/under-the-hood/multithreading" />
        </>
    );
}
