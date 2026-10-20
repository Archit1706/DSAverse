import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: 'What Happens When You Search a URL',
    description: 'Visualize all 8 stages: DNS resolution, TCP handshake, TLS handshake, HTTP request, server pipeline, HTTP response, and browser rendering.',
    keywords: ['dns', 'tcp', 'tls', 'http', 'browser', 'rendering', 'critical rendering path', 'url', 'network'],
    openGraph: {
        title: 'What Happens When You Search a URL – DSAverse',
        description: 'All eight stages, from DNS lookup and the TCP/TLS handshakes to the server pipeline and browser render.',
        images: [{ url: '/og-image.png' }],
    },
    alternates: { canonical: '/under-the-hood/what-happens-when-you-search-a-url' },
};
export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/under-the-hood/what-happens-when-you-search-a-url" />
        </>
    );
}
