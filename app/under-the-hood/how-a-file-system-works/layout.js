export const metadata = {
    title: 'How a File System Works',
    description: 'Visualize disk blocks, inodes, directory entries, path resolution, hard links vs symlinks, the page cache, and journaling for crash consistency.',
    keywords: ['file system', 'inode', 'directory entry', 'path resolution', 'hard link', 'symlink', 'page cache', 'fsync', 'journaling', 'ext4'],
    openGraph: {
        title: 'How a File System Works – DSAverse',
        description: 'Inodes, directory entries, path resolution, hard links versus symlinks, the page cache, and journaling.',
        images: [{ url: '/og-image.png' }],
    },
    alternates: { canonical: '/under-the-hood/how-a-file-system-works' },
};
export default function Layout({ children }) { return children; }
