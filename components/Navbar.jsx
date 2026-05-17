"use client";
import React, { useState, useEffect, useRef } from 'react';
import { algorithmCategories } from '../data/algorithmCategories';
import { ChevronDown, Menu, X, Code2 } from 'lucide-react';
import Link from 'next/link';

const DSAverseLogo = () => (
    <svg width="32" height="32" viewBox="0 0 32 32" className="inline-block mr-2" aria-hidden="true">
        <defs>
            <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3B82F6" />
                <stop offset="50%" stopColor="#8B5CF6" />
                <stop offset="100%" stopColor="#EC4899" />
            </linearGradient>
        </defs>
        <polygon points="16,2 27,8 27,24 16,30 5,24 5,8" fill="url(#logoGradient)" stroke="none" />
        <g fill="white" opacity="0.9">
            <circle cx="16" cy="10" r="1.5" />
            <circle cx="12" cy="16" r="1.2" />
            <circle cx="20" cy="16" r="1.2" />
            <circle cx="10" cy="22" r="1" />
            <circle cx="14" cy="22" r="1" />
            <circle cx="18" cy="22" r="1" />
            <circle cx="22" cy="22" r="1" />
            <line x1="16" y1="11" x2="12" y2="15" stroke="white" strokeWidth="1" opacity="0.8" />
            <line x1="16" y1="11" x2="20" y2="15" stroke="white" strokeWidth="1" opacity="0.8" />
            <line x1="12" y1="17" x2="10" y2="21" stroke="white" strokeWidth="1" opacity="0.6" />
            <line x1="12" y1="17" x2="14" y2="21" stroke="white" strokeWidth="1" opacity="0.6" />
            <line x1="20" y1="17" x2="18" y2="21" stroke="white" strokeWidth="1" opacity="0.6" />
            <line x1="20" y1="17" x2="22" y2="21" stroke="white" strokeWidth="1" opacity="0.6" />
        </g>
    </svg>
);

const toCategorySlug = (name) =>
    name.toLowerCase().replace(/[:\s]+/g, '-').replace(/[()]/g, '');

const Navbar = () => {
    const [activeDropdown, setActiveDropdown] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const timeoutRef = useRef(null);

    const clearPendingClose = () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
    };

    const handleMouseEnter = () => {
        clearPendingClose();
        setActiveDropdown(true);
    };

    const handleMouseLeave = () => {
        clearPendingClose();
        timeoutRef.current = setTimeout(() => setActiveDropdown(false), 200);
    };

    useEffect(() => () => clearPendingClose(), []);

    const closeMobile = () => setMobileMenuOpen(false);

    return (
        <nav className="bg-white shadow-md sticky top-0 z-50 border-b border-gray-100">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16 items-center">
                    {/* Logo */}
                    <Link href="/" className="flex items-center flex-shrink-0">
                        <DSAverseLogo />
                        <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                            DSAverse
                        </span>
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center space-x-6">
                        <Link
                            href="/"
                            className="text-gray-700 hover:text-blue-600 transition-colors duration-200 font-medium px-3 py-2 rounded-md hover:bg-blue-50"
                        >
                            Home
                        </Link>

                        {/* Visualize Dropdown */}
                        <div
                            className="relative"
                            onMouseEnter={handleMouseEnter}
                            onMouseLeave={handleMouseLeave}
                        >
                            <button
                                className="text-gray-700 hover:text-blue-600 transition-colors duration-200 flex items-center font-medium px-3 py-2 rounded-md hover:bg-blue-50"
                                aria-expanded={activeDropdown}
                                aria-haspopup="true"
                            >
                                Visualize
                                <ChevronDown
                                    className={`ml-1 h-4 w-4 transition-transform duration-200 ${activeDropdown ? 'rotate-180' : ''}`}
                                />
                            </button>

                            {activeDropdown && (
                                <div className="absolute top-full right-0 mt-1 w-64 bg-white rounded-xl shadow-2xl border border-gray-100 z-[60]">
                                    <div className="py-3 max-h-[70vh] overflow-y-auto overscroll-contain">
                                        {algorithmCategories.map((category, i) => (
                                            <div key={i} className="mb-3 last:mb-0 px-3">
                                                <div className={`${category.lightColor} ${category.borderColor} border-l-4 rounded-r-lg px-3 py-2`}>
                                                    <Link
                                                        href={`/${toCategorySlug(category.name)}`}
                                                        className={`block font-semibold text-sm ${category.textColor} hover:opacity-75 transition-opacity mb-1`}
                                                        onClick={() => setActiveDropdown(false)}
                                                    >
                                                        {category.name}
                                                    </Link>
                                                    <div className="space-y-0.5">
                                                        {category.algorithms.map((algo, j) => (
                                                            <Link
                                                                key={j}
                                                                href={`/${toCategorySlug(category.name)}/${toCategorySlug(algo)}`}
                                                                className="block text-xs text-gray-600 hover:text-gray-900 hover:bg-white/60 px-2 py-1 rounded transition-colors"
                                                                onClick={() => setActiveDropdown(false)}
                                                            >
                                                                {algo}
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

                        <Link
                            href="/contact"
                            className="text-gray-700 hover:text-blue-600 transition-colors duration-200 font-medium px-3 py-2 rounded-md hover:bg-blue-50"
                        >
                            Contact
                        </Link>
                    </div>

                    {/* Mobile menu button */}
                    <button
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="md:hidden text-gray-700 hover:text-blue-600 transition-colors p-2 rounded-md hover:bg-blue-50"
                        aria-label="Toggle menu"
                        aria-expanded={mobileMenuOpen}
                    >
                        {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                    </button>
                </div>
            </div>

            {/* Mobile Navigation */}
            {mobileMenuOpen && (
                <div className="md:hidden bg-white border-t border-gray-100 max-h-[80vh] overflow-y-auto overscroll-contain">
                    <div className="px-4 pt-2 pb-4 space-y-1">
                        <Link
                            href="/"
                            onClick={closeMobile}
                            className="block px-3 py-2 text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors font-medium"
                        >
                            Home
                        </Link>
                        <Link
                            href="/contact"
                            onClick={closeMobile}
                            className="block px-3 py-2 text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors font-medium"
                        >
                            Contact
                        </Link>

                        <div className="pt-2">
                            <p className="px-3 py-1 text-gray-500 font-semibold text-xs uppercase tracking-wider">
                                Visualize
                            </p>
                            {algorithmCategories.map((category, i) => (
                                <div key={i} className="mt-2">
                                    <div className={`mx-1 ${category.lightColor} ${category.borderColor} border-l-4 rounded-r-lg p-3`}>
                                        <Link
                                            href={`/${toCategorySlug(category.name)}`}
                                            onClick={closeMobile}
                                            className={`block font-semibold text-sm ${category.textColor} mb-1`}
                                        >
                                            {category.name}
                                        </Link>
                                        <div className="space-y-0.5">
                                            {category.algorithms.map((algo, j) => (
                                                <Link
                                                    key={j}
                                                    href={`/${toCategorySlug(category.name)}/${toCategorySlug(algo)}`}
                                                    onClick={closeMobile}
                                                    className="block text-xs text-gray-600 hover:text-gray-900 px-2 py-1 rounded transition-colors"
                                                >
                                                    {algo}
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
