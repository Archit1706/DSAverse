"use client";
import React, { useState, useEffect } from 'react';
import { algorithmCategories } from '../data/algorithmCategories';
import { ChevronDown, Menu, X, Code2 } from 'lucide-react';
import Link from 'next/link';

const DSAverseLogo = () => (
    <svg width="32" height="32" viewBox="0 0 32 32" className="inline-block mr-2">
        <defs>
            <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3B82F6" />
                <stop offset="50%" stopColor="#8B5CF6" />
                <stop offset="100%" stopColor="#EC4899" />
            </linearGradient>
        </defs>

        {/* Outer hexagon */}
        <polygon
            points="16,2 27,8 27,24 16,30 5,24 5,8"
            fill="url(#logoGradient)"
            stroke="none"
        />

        {/* Inner geometric pattern representing data structures */}
        <g fill="white" opacity="0.9">
            {/* Tree structure */}
            <circle cx="16" cy="10" r="1.5" />
            <circle cx="12" cy="16" r="1.2" />
            <circle cx="20" cy="16" r="1.2" />
            <circle cx="10" cy="22" r="1" />
            <circle cx="14" cy="22" r="1" />
            <circle cx="18" cy="22" r="1" />
            <circle cx="22" cy="22" r="1" />

            {/* Connecting lines */}
            <line x1="16" y1="11" x2="12" y2="15" stroke="white" strokeWidth="1" opacity="0.8" />
            <line x1="16" y1="11" x2="20" y2="15" stroke="white" strokeWidth="1" opacity="0.8" />
            <line x1="12" y1="17" x2="10" y2="21" stroke="white" strokeWidth="1" opacity="0.6" />
            <line x1="12" y1="17" x2="14" y2="21" stroke="white" strokeWidth="1" opacity="0.6" />
            <line x1="20" y1="17" x2="18" y2="21" stroke="white" strokeWidth="1" opacity="0.6" />
            <line x1="20" y1="17" x2="22" y2="21" stroke="white" strokeWidth="1" opacity="0.6" />
        </g>
    </svg>
);

const Navbar = () => {
    const [activeDropdown, setActiveDropdown] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [dropdownTimeout, setDropdownTimeout] = useState(null);

    const handleMouseEnter = () => {
        if (dropdownTimeout) {
            clearTimeout(dropdownTimeout);
            setDropdownTimeout(null);
        }
        setActiveDropdown(true);
    };

    const handleMouseLeave = () => {
        const timeout = setTimeout(() => {
            setActiveDropdown(false);
        }, 150); // Small delay to prevent flickering
        setDropdownTimeout(timeout);
    };

    useEffect(() => {
        return () => {
            if (dropdownTimeout) {
                clearTimeout(dropdownTimeout);
            }
        };
    }, [dropdownTimeout]);

    return (
        <nav className="bg-white shadow-lg sticky top-0 z-50 border-b border-gray-100">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    {/* Logo and Brand */}
                    <div className="flex items-center">
                        <div className="flex-shrink-0 flex items-center">
                            <DSAverseLogo />
                            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                                DSAverse
                            </h1>
                        </div>
                    </div>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center space-x-8">
                        <a
                            href="/"
                            className="text-gray-700 hover:text-blue-600 transition-all duration-200 font-medium px-3 py-2 rounded-md hover:bg-blue-50"
                        >
                            Home
                        </a>

                        <div className="relative">
                            <button
                                className="text-gray-700 hover:text-blue-600 transition-all duration-200 flex items-center font-medium px-3 py-2 rounded-md hover:bg-blue-50"
                                onMouseEnter={handleMouseEnter}
                                onMouseLeave={handleMouseLeave}
                            >
                                Visualize
                                <ChevronDown className={`ml-1 h-4 w-4 transition-transform duration-200 ${activeDropdown ? 'rotate-180' : ''}`} />
                            </button>

                            {activeDropdown && (
                                <div
                                    className="absolute top-full -left-20 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden max-w-[220px]"
                                    onMouseEnter={handleMouseEnter}
                                    onMouseLeave={handleMouseLeave}
                                >
                                    <div className="py-3 overflow-y-auto max-h-[500px]">
                                        {algorithmCategories.map((category, categoryIndex) => (
                                            <div key={categoryIndex} className="mb-3 last:mb-0">
                                                <div className={`px-4 py-2 ${category.lightColor} ${category.borderColor} border-l-4 mx-2 rounded-r-lg`}>
                                                    <h3 className={`font-semibold text-md ${category.textColor} mb-2`}>
                                                        {category.name}
                                                    </h3>
                                                    <div className="space-y-1">
                                                        {category.algorithms.map((algorithm, algorithmIndex) => (
                                                            <Link
                                                                key={algorithmIndex}
                                                                href={`/${category.name.toLowerCase().replace(/[:\s]+/g, '-').replace(/[()]/g, '')}/${algorithm.toLowerCase().replace(/[:\s]+/g, '-').replace(/[()]/g, '')}`}
                                                                className="block text-md text-gray-600 hover:text-gray-900 hover:bg-white/50 px-2 py-1 rounded transition-colors duration-150"
                                                            >
                                                                {algorithm}
                                                            </Link>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Mobile menu button */}
                    <div className="md:hidden flex items-center">
                        <button
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className="text-gray-700 hover:text-blue-600 transition-colors p-2 rounded-md hover:bg-blue-50"
                        >
                            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Navigation */}
            {mobileMenuOpen && (
                <div className="md:hidden bg-white border-t border-gray-100">
                    <div className="px-4 pt-2 pb-3 space-y-1">
                        <a
                            href="/"
                            className="block px-3 py-2 text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors font-medium"
                        >
                            Home
                        </a>

                        <div className="pt-2">
                            <h3 className="px-3 py-2 text-gray-900 font-semibold text-sm">Visualize</h3>
                            {algorithmCategories.map((category, categoryIndex) => (
                                <div key={categoryIndex} className="mb-3">
                                    <div className={`mx-3 ${category.lightColor} ${category.borderColor} border-l-4 rounded-r-lg p-3`}>
                                        <h4 className={`font-medium text-sm ${category.textColor} mb-2`}>
                                            {category.name}
                                        </h4>
                                        <div className="space-y-1">
                                            {category.algorithms.map((algorithm, algorithmIndex) => (
                                                <Link
                                                    key={algorithmIndex}
                                                    href={`/${category.name.toLowerCase().replace(/[:\s]+/g, '-').replace(/[()]/g, '')}/${algorithm.toLowerCase().replace(/[:\s]+/g, '-').replace(/[()]/g, '')}`}
                                                    className="block text-xs text-gray-600 hover:text-gray-900 px-2 py-1 rounded transition-colors"
                                                >
                                                    {algorithm}
                                                </Link>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </nav>
    );
};

export default Navbar;