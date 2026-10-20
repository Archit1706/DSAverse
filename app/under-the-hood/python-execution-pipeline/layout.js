import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: 'Python Execution Pipeline',
    description: 'Visualize how Python source code becomes execution: lexing, parsing, AST, bytecode compilation, and the CPython VM step by step.',
    keywords: ['python', 'bytecode', 'ast', 'cpython', 'interpreter', 'execution'],
    openGraph: {
        title: 'Python Execution Pipeline – DSAverse',
        description: 'Lexing, parsing, AST construction, bytecode compilation, and the CPython VM executing it step by step.',
        images: [{ url: '/og-image.png' }],
    },
    alternates: { canonical: '/under-the-hood/python-execution-pipeline' },
};
export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/under-the-hood/python-execution-pipeline" />
        </>
    );
}
