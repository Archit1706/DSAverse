export const metadata = {
    title: 'How the Browser Renders a Page',
    description: 'Visualize the browser rendering pipeline — HTML parsing into the DOM, CSSOM construction, the render tree, layout, paint, and compositing — plus why reflow costs more than repaint.',
    keywords: ['browser rendering', 'critical rendering path', 'dom', 'cssom', 'render tree', 'layout reflow', 'paint', 'compositing', 'layout thrashing'],
    openGraph: {
        title: 'How the Browser Renders a Page – DSAverse',
        description: 'DOM and CSSOM into a render tree, then layout, paint, and compositing, and why reflow costs more than repaint.',
        images: [{ url: '/og-image.png' }],
    },
    alternates: { canonical: '/under-the-hood/how-the-browser-renders-a-page' },
};
export default function Layout({ children }) { return children; }
