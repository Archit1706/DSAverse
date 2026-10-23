import React from 'react'
import Link from 'next/link'
import { Heart } from 'lucide-react'

/* One column per subject (see data/subjects.js), plus the tools that span them.
   The DSA column is a curated selection — all fifteen sections would swamp it;
   the full list lives in the nav and on the homepage. */
const COLUMNS = [
    {
        title: 'Practice',
        links: [
            { href: '/review', label: 'Review' },
            { href: '/compare', label: 'Compare' },
            { href: '/cheatsheet', label: 'Complexity Cheatsheet' },
            { href: '/', label: 'Home' },
            { href: '/contact', label: 'Contact' },
        ],
    },
    {
        title: 'Data Structures & Algorithms',
        links: [
            { href: '/basics', label: 'Basics' },
            { href: '/sorting', label: 'Sorting' },
            { href: '/searching', label: 'Searching' },
            { href: '/trees', label: 'Trees' },
            { href: '/graph-algorithms', label: 'Graph Algorithms' },
            { href: '/dynamic-programming', label: 'Dynamic Programming' },
            { href: '/indexing', label: 'Indexing' },
        ],
    },
    {
        title: 'CS Core',
        links: [
            { href: '/operating-systems', label: 'Operating Systems' },
            { href: '/database-systems', label: 'Database Systems' },
            { href: '/under-the-hood', label: 'Under the Hood' },
        ],
    },
];

const Footer = () => {
    return (
        <footer className="bg-gray-900 text-white py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
                    <div>
                        <h3 className="text-xl font-bold mb-4 text-white">DSAverse</h3>
                        <p className="text-gray-400 text-sm leading-relaxed">
                            Making data structures, algorithms and core computer science accessible through interactive visualizations.
                        </p>
                    </div>

                    {COLUMNS.map(col => (
                        <div key={col.title}>
                            <h4 className="font-semibold mb-4 text-white">{col.title}</h4>
                            <ul className="space-y-2 text-gray-400 text-sm">
                                {col.links.map(l => (
                                    <li key={l.href}>
                                        <Link href={l.href} className="hover:text-white transition-colors">{l.label}</Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400 text-sm flex items-center justify-center gap-1.5">
                    <span>&copy; 2025 DSAverse. Built with</span>
                    <Heart className="h-4 w-4 text-red-500 fill-red-500 flex-shrink-0" aria-label="love" />
                    <span>for better learning.</span>
                </div>
            </div>
        </footer>
    )
}

export default Footer
