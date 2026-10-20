import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: 'Async/Await and the Event Loop',
    description: 'Visualize the event loop, microtask queue, macrotask queue, and how async/await suspends coroutines without blocking the thread.',
    keywords: ['async await', 'event loop', 'promises', 'asyncio', 'concurrency', 'non-blocking'],
    openGraph: {
        title: 'Async/Await and the Event Loop – DSAverse',
        description: 'Watch the microtask and macrotask queues drain, and see how await suspends a coroutine without blocking the thread.',
        images: [{ url: '/og-image.png' }],
    },
    alternates: { canonical: '/under-the-hood/async-await-and-event-loop' },
};
export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/under-the-hood/async-await-and-event-loop" />
        </>
    );
}
