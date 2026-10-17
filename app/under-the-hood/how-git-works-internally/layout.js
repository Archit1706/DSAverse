export const metadata = {
    title: 'How Git Works Internally',
    description: 'Visualize Git\'s object model: blobs, trees, commits, SHA-1 addressing, branches as pointers, and merge vs rebase as DAG transformations.',
    keywords: ['git', 'version control', 'dag', 'blob', 'tree', 'commit', 'sha1'],
    openGraph: {
        title: 'How Git Works Internally – DSAverse',
        description: 'Blobs, trees, and commits in a content-addressed DAG, with merge and rebase as graph transformations.',
        images: [{ url: '/og-image.png' }],
    },
    alternates: { canonical: '/under-the-hood/how-git-works-internally' },
};
export default function Layout({ children }) { return children; }
