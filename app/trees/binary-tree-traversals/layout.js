export const metadata = {
    title: 'Binary Tree Traversals Visualizer – DSAverse',
    description: 'Animate Inorder, Preorder, Postorder, and Level-Order traversals with a recursive call-stack panel.',
    keywords: ['inorder', 'preorder', 'postorder', 'level order', 'binary tree traversal', 'BFS', 'DFS'],
    openGraph: {
        title: 'Binary Tree Traversals Visualizer – DSAverse',
        description: 'Animate inorder, preorder, postorder, and level-order traversals alongside a live recursive call-stack panel.',
        images: [{ url: '/og-image.png' }],
    },
    alternates: { canonical: '/trees/binary-tree-traversals' },
};
export default function Layout({ children }) { return children; }
