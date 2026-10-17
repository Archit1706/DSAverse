export const metadata = {
    title: 'C++ Execution Pipeline',
    description: 'Visualize how C++ source code becomes machine code: preprocessor, compiler, assembler, linker, loader, and CPU execution.',
    keywords: ['c++', 'compiler', 'linker', 'elf', 'assembly', 'execution'],
    openGraph: {
        title: 'C++ Execution Pipeline – DSAverse',
        description: 'Follow C++ source through preprocessor, compiler, assembler, linker, and loader to running machine code.',
        images: [{ url: '/og-image.png' }],
    },
    alternates: { canonical: '/under-the-hood/cpp-execution-pipeline' },
};
export default function Layout({ children }) { return children; }
