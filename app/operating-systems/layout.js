import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export const metadata = {
    title: { template: '%s – Operating Systems | DSAverse', default: 'Operating Systems | DSAverse' },
    description: 'Interactive visualizations of operating system algorithms — CPU scheduling, page replacement, memory allocation, deadlock avoidance and detection, disk scheduling, and the classic synchronization problems.',
    keywords: ['operating systems', 'CPU scheduling', 'round robin', 'page replacement', 'LRU', 'banker\'s algorithm', 'deadlock', 'disk scheduling', 'race condition', 'semaphore', 'producer consumer', 'dining philosophers', 'OS visualization'],
    openGraph: {
        title: 'Operating Systems Visualizers – DSAverse',
        description: 'Watch a scheduler build its Gantt chart, page frames fill and evict, a disk head sweep, and threads race, block and deadlock.',
        images: [{ url: '/og-image.png', width: 1200, height: 630 }],
    },
    alternates: { canonical: '/operating-systems' },
};

export default function OperatingSystemsLayout({ children }) {
    return (
        <>
            <Navbar />
            <main className="pt-16">{children}</main>
            <Footer />
        </>
    );
}
