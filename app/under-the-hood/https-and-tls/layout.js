import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: 'HTTPS and TLS',
    description: 'Visualize certificate chains, Diffie-Hellman key exchange, and the TLS 1.3 handshake that secures every HTTPS connection.',
    keywords: ['https', 'tls', 'ssl', 'certificate', 'diffie-hellman', 'encryption'],
    openGraph: {
        title: 'HTTPS and TLS – DSAverse',
        description: 'Certificate chains, Diffie-Hellman key exchange, and the TLS 1.3 handshake behind every HTTPS request.',
        images: [{ url: '/og-image.png' }],
    },
    alternates: { canonical: '/under-the-hood/https-and-tls' },
};
export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/under-the-hood/https-and-tls" />
        </>
    );
}
