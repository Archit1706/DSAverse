import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: 'Processes vs Threads',
    description: 'Visualize virtual address spaces, process control blocks, fork() semantics, and why threads share heap but not stack.',
    keywords: ['processes', 'threads', 'fork', 'address space', 'pcb', 'scheduling'],
    openGraph: {
        title: 'Processes vs Threads – DSAverse',
        description: 'Virtual address spaces, process control blocks, fork() semantics, and why threads share heap but not stack.',
        images: [{ url: '/og-image.png' }],
    },
    alternates: { canonical: '/under-the-hood/processes-vs-threads' },
};
export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/under-the-hood/processes-vs-threads" />
        </>
    );
}
