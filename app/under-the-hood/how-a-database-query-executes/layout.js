export const metadata = {
    title: 'How a Database Query Executes',
    description: 'Visualize the SQL query lifecycle: parser, planner, cost-based optimizer, index scan vs full table scan, and execution.',
    keywords: ['database', 'sql', 'query planner', 'index scan', 'b-tree', 'optimizer'],
    openGraph: {
        title: 'How a Database Query Executes – DSAverse',
        description: 'Follow a SQL statement through the parser, planner, and cost-based optimizer, and see index scan beat full scan.',
        images: [{ url: '/og-image.png' }],
    },
    alternates: { canonical: '/under-the-hood/how-a-database-query-executes' },
};
export default function Layout({ children }) { return children; }
