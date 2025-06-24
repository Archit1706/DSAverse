"use client";
import React, { useState, useEffect } from 'react';
import { algorithmCategories } from '../data/algorithmCategories';
import { ChevronDown, Menu, X } from 'lucide-react';

const Navbar = () => {

    const navigationItems = algorithmCategories.map(category => ({
        name: category.name,
        items: category.algorithms
    }));

    const [activeDropdown, setActiveDropdown] = useState(null);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    return (
        <nav className="bg-white shadow-lg sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    <div className="flex items-center">
                        <div className="flex-shrink-0">
                            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                                DSA Visualizer
                            </h1>
                        </div>
                    </div>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center space-x-8">
                        <a href="#" className="text-gray-700 hover:text-blue-600 transition-colors">Home</a>

                        {navigationItems.map((item, index) => (
                            <div key={index} className="relative">
                                <button
                                    className="text-gray-700 hover:text-blue-600 transition-colors flex items-center"
                                    onMouseEnter={() => setActiveDropdown(index)}
                                    onMouseLeave={() => setActiveDropdown(null)}
                                >
                                    {item.name}
                                    <ChevronDown className="ml-1 h-4 w-4" />
                                </button>

                                {activeDropdown === index && (
                                    <div
                                        className="absolute top-full left-0 mt-2 w-64 bg-white rounded-lg shadow-xl border z-50"
                                        onMouseEnter={() => setActiveDropdown(index)}
                                        onMouseLeave={() => setActiveDropdown(null)}
                                    >
                                        <div className="py-2">
                                            {item.items.map((algorithm, algorithmIndex) => (
                                                <a
                                                    key={algorithmIndex}
                                                    href={`#${algorithm.toLowerCase().replace(/\s+/g, '-')}`}
                                                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                                                >
                                                    {algorithm}
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Mobile menu button */}
                    <div className="md:hidden flex items-center">
                        <button
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className="text-gray-700"
                        >
                            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Navigation */}
            {mobileMenuOpen && (
                <div className="md:hidden bg-white border-t">
                    <div className="px-2 pt-2 pb-3 space-y-1">
                        <a href="#" className="block px-3 py-2 text-gray-700">Home</a>
                        {navigationItems.map((item, index) => (
                            <div key={index}>
                                <button className="w-full text-left px-3 py-2 text-gray-700 font-medium">
                                    {item.name}
                                </button>
                                <div className="pl-6">
                                    {item.items.map((algorithm, algorithmIndex) => (
                                        <a
                                            key={algorithmIndex}
                                            href={`#${algorithm.toLowerCase().replace(/\s+/g, '-')}`}
                                            className="block px-3 py-1 text-sm text-gray-600"
                                        >
                                            {algorithm}
                                        </a>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </nav>
    )
}

export default Navbar