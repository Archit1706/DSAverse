import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: 'How a REST API Works',
    description: 'Visualize HTTP verbs, status codes, request/response headers, JSON serialization, and REST architectural constraints.',
    keywords: ['rest', 'api', 'http', 'json', 'request', 'response'],
    openGraph: {
        title: 'How a REST API Works – DSAverse',
        description: 'HTTP verbs, status codes, headers, JSON serialization, and the constraints that actually make an API RESTful.',
        images: [{ url: '/og-image.png' }],
    },
    alternates: { canonical: '/under-the-hood/how-a-rest-api-works' },
};
export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/under-the-hood/how-a-rest-api-works" />
        </>
    );
}
