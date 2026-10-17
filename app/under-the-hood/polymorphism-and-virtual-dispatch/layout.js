export const metadata = {
    title: 'Polymorphism and Virtual Dispatch',
    description: 'Visualize C++ vtables in memory, vptr layout, virtual function dispatch chain, and the cost of virtual vs non-virtual calls.',
    keywords: ['polymorphism', 'vtable', 'virtual dispatch', 'cpp', 'oop', 'vptr'],
    openGraph: {
        title: 'Polymorphism and Virtual Dispatch – DSAverse',
        description: 'C++ vtables and vptr layout in memory, the dispatch chain, and what a virtual call actually costs.',
        images: [{ url: '/og-image.png' }],
    },
    alternates: { canonical: '/under-the-hood/polymorphism-and-virtual-dispatch' },
};
export default function Layout({ children }) { return children; }
