export const metadata = {
    title: 'Virtual Memory and Paging',
    description: 'Visualize virtual address spaces, page tables, TLB cache, page faults, and how every process gets its own 4GB address space.',
    keywords: ['virtual memory', 'paging', 'page table', 'tlb', 'page fault', 'mmu'],
    openGraph: {
        title: 'Virtual Memory and Paging – DSAverse',
        description: 'Page tables, the TLB, page faults, and how every process gets its own private virtual address space.',
        images: [{ url: '/og-image.png' }],
    },
    alternates: { canonical: '/under-the-hood/virtual-memory-and-paging' },
};
export default function Layout({ children }) { return children; }
