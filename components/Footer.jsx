import React from 'react'
import Link from 'next/link'
import { Heart } from 'lucide-react'

const Footer = () => {
    return (
        <footer className="bg-gray-900 text-white py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
                    <div>
                        <h3 className="text-xl font-bold mb-4 text-white">DSAverse</h3>
                        <p className="text-gray-400 text-sm leading-relaxed">
                            Making data structures and algorithms accessible through interactive visualizations.
                        </p>
                    </div>

                    <div>
                        <h4 className="font-semibold mb-4 text-white">Quick Links</h4>
                        <ul className="space-y-2 text-gray-400 text-sm">
                            <li><Link href="/" className="hover:text-white transition-colors">Home</Link></li>
                            <li><Link href="/contact" className="hover:text-white transition-colors">Contact</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-semibold mb-4 text-white">Categories</h4>
                        <ul className="space-y-2 text-gray-400 text-sm">
                            <li><Link href="/sorting" className="hover:text-white transition-colors">Sorting</Link></li>
                            <li><Link href="/searching" className="hover:text-white transition-colors">Searching</Link></li>
                            <li><Link href="/dynamic-programming" className="hover:text-white transition-colors">Dynamic Programming</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-semibold mb-4 text-white">More</h4>
                        <ul className="space-y-2 text-gray-400 text-sm">
                            <li><Link href="/basics" className="hover:text-white transition-colors">Basics</Link></li>
                            <li><Link href="/recursion" className="hover:text-white transition-colors">Recursion</Link></li>
                            <li><Link href="/heap-like-data-structures" className="hover:text-white transition-colors">Heap Structures</Link></li>
                        </ul>
                    </div>
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
