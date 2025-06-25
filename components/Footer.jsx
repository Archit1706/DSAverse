import React from 'react'

const Footer = () => {
    return (
        <footer className="bg-gray-900 text-white py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    <div>
                        <h3 className="text-xl font-bold mb-4">DSAverse</h3>
                        <p className="text-gray-400">
                            Making data structures and algorithms accessible through interactive visualizations.
                        </p>
                    </div>

                    <div>
                        <h4 className="font-semibold mb-4">Quick Links</h4>
                        <ul className="space-y-2 text-gray-400">
                            <li><a href="/about" className="hover:text-white transition-colors">About</a></li>
                            <li><a href="/documentation" className="hover:text-white transition-colors">Documentation</a></li>
                            <li><a href="/contact" className="hover:text-white transition-colors">Contact</a></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-semibold mb-4">Categories</h4>
                        <ul className="space-y-2 text-gray-400">
                            <li><a href="/sorting" className="hover:text-white transition-colors">Sorting</a></li>
                            <li><a href="/graph-algorithms" className="hover:text-white transition-colors">Graph Algorithms</a></li>
                            <li><a href="/dynamic-programming" className="hover:text-white transition-colors">Dynamic Programming</a></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-semibold mb-4">More Categories</h4>
                        <ul className="space-y-2 text-gray-400">
                            <li><a href="/indexing" className="hover:text-white transition-colors">Indexing</a></li>
                            <li><a href="/searching" className="hover:text-white transition-colors">Searching</a></li>
                            <li><a href="/recursion" className="hover:text-white transition-colors">Recursion</a></li>
                        </ul>
                    </div>
                </div>

                <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
                    <p>&copy; 2025 DSAverse. Built with ❤️ for better learning.</p>
                </div>
            </div>
        </footer>
    )
}

export default Footer