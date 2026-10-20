import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: 'How Containers Work',
    description: 'Visualize containers as ordinary processes — PID, mount, network, UTS and user namespaces, cgroup resource limits, overlay filesystem layers with copy-on-write, build cache ordering, and how all of it differs from a VM.',
    keywords: ['containers', 'docker', 'namespaces', 'cgroups', 'overlayfs', 'copy on write', 'image layers', 'build cache', 'containers vs vms', 'pid 1'],
    openGraph: {
        title: 'How Containers Work – DSAverse',
        description: 'Namespaces, cgroups, and copy-on-write overlay layers: why a container is just an ordinary fenced-off process.',
        images: [{ url: '/og-image.png' }],
    },
    alternates: { canonical: '/under-the-hood/how-containers-work' },
};
export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/under-the-hood/how-containers-work" />
        </>
    );
}
