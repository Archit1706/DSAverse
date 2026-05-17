"use client";
import React, { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { algorithmCategories } from '../data/algorithmCategories';
import { ChevronDown, Menu, X, BookOpen } from 'lucide-react';
import Link from 'next/link';

/* ── Logo SVG ─────────────────────────────────────────── */
const DSAverseLogo = () => (
    <svg width="32" height="32" viewBox="0 0 32 32" className="inline-block mr-2 flex-shrink-0" aria-hidden="true">
        <defs>
            <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%"   stopColor="#3B82F6" />
                <stop offset="50%"  stopColor="#8B5CF6" />
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

/* ── Navbar ───────────────────────────────────────────── */
export default function Navbar() {
    const pathname        = usePathname();
    const isHome          = pathname === '/';

    const [scrolled,        setScrolled]        = useState(false);
    const [activeDropdown,  setActiveDropdown]  = useState(false);
    const [mobileMenuOpen,  setMobileMenuOpen]  = useState(false);
    const timeoutRef = useRef(null);

    /* scroll listener – only meaningful on home */
    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 60);
        onScroll();                                   // initial check
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    /* close mobile menu on route change */
    useEffect(() => { setMobileMenuOpen(false); }, [pathname]);

    /* hover timeout for dropdown */
    const clearPending = () => { clearTimeout(timeoutRef.current); };
    const handleMouseEnter = () => { clearPending(); setActiveDropdown(true); };
    const handleMouseLeave = () => {
        clearPending();
        timeoutRef.current = setTimeout(() => setActiveDropdown(false), 200);
    };
    useEffect(() => () => clearPending(), []);

    /* ── theme logic ── */
    /*
     * Homepage:
     *   – not scrolled → transparent, white text
     *   – scrolled     → dark frosted glass, white text
     * All other pages:
     *   – always white, dark text
     */
    const dark = isHome;

    const navBg = dark
        ? scrolled
            ? 'bg-slate-900/95 backdrop-blur-md border-slate-800/50 shadow-lg shadow-slate-950/30'
            : 'bg-transparent border-transparent'
        : 'bg-white border-gray-100 shadow-sm';

    /* text colours */
    const linkBase   = dark ? 'text-slate-300'         : 'text-gray-700';
    const linkHover  = dark ? 'hover:text-white hover:bg-white/10' : 'hover:text-blue-600 hover:bg-blue-50';
    const btnBase    = dark ? 'text-slate-300'         : 'text-gray-700';
    const btnHover   = dark ? 'hover:text-white hover:bg-white/10' : 'hover:text-blue-600 hover:bg-blue-50';
    const chevron    = dark ? 'text-slate-400'         : 'text-gray-500';
    const hamburger  = dark
        ? 'text-slate-300 hover:text-white hover:bg-white/10'
        : 'text-gray-700 hover:text-blue-600 hover:bg-blue-50';

    /* mobile panel */
    const mobilePanelBg   = dark ? 'bg-slate-950/98 backdrop-blur-md border-slate-800' : 'bg-white border-gray-100';
    const mobileLinkBase  = dark ? 'text-slate-300 hover:text-white hover:bg-white/10' : 'text-gray-700 hover:text-blue-600 hover:bg-blue-50';
    const mobileLabel     = dark ? 'text-slate-500'  : 'text-gray-500';
    const mobileAlgoLink  = dark ? 'text-slate-400 hover:text-slate-200' : 'text-gray-600 hover:text-gray-900';

    /* cheatsheet tint */
    const cheatColor  = dark ? 'text-violet-400 hover:text-violet-200 hover:bg-white/10' : 'text-violet-600 hover:text-violet-700 hover:bg-violet-50';

    return (
        <nav
            className={`fixed top-0 inset-x-0 z-50 border-b transition-all duration-300 ${navBg}`}
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16 items-center">

                    {/* ── Logo ── */}
                    <Link href="/" className="flex items-center flex-shrink-0 gap-0">
                        <DSAverseLogo />
                        <span className="text-xl font-bold bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent tracking-tight">
                            DSAverse
                        </span>
                    </Link>

                    {/* ── Desktop nav ── */}
                    <div className="hidden md:flex items-center gap-1">

                        <Link href="/" className={`text-sm font-medium px-3 py-2 rounded-lg transition-all duration-200 ${linkBase} ${linkHover}`}>
                            Home
                        </Link>

                        {/* Visualize dropdown */}
                        <div className="relative" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
                            <button
                                className={`flex items-center gap-1 text-sm font-medium px-3 py-2 rounded-lg transition-all duration-200 ${btnBase} ${btnHover}`}
                                aria-expanded={activeDropdown}
                                aria-haspopup="true"
                            >
                                Visualize
                                <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${chevron} ${activeDropdown ? 'rotate-180' : ''}`} />
                            </button>

                            {/* Dropdown panel – always light regardless of page theme */}
                            {activeDropdown && (
                                <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-gray-100 z-[60] overflow-hidden">
                                    {/* Gradient accent strip */}
                                    <div className="h-0.5 w-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />
                                    <div className="py-3 max-h-[70vh] overflow-y-auto overscroll-contain">
                                        {algorithmCategories.map((cat, i) => (
                                            <div key={i} className="mb-2 last:mb-0 px-3">
                                                <div className={`${cat.lightColor} ${cat.borderColor} border-l-4 rounded-r-xl px-3 py-2`}>
                                                    <Link
                                                        href={`/${toCategorySlug(cat.name)}`}
                                                        className={`block font-semibold text-sm ${cat.textColor} hover:opacity-75 transition-opacity mb-1`}
                                                        onClick={() => setActiveDropdown(false)}
                                                    >
                                                        {cat.name}
                                                    </Link>
                                                    <div className="space-y-0.5">
                                                        {cat.algorithms.map((algo, j) => (
                                                            <Link
                                                                key={j}
                                                                href={`/${toCategorySlug(cat.name)}/${toCategorySlug(algo)}`}
                                                                className="block text-xs text-gray-500 hover:text-gray-900 hover:bg-black/5 px-2 py-1 rounded-lg transition-colors"
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

                        {/* Cheatsheet */}
                        <Link
                            href="/cheatsheet"
                            className={`flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-lg transition-all duration-200 ${cheatColor}`}
                        >
                            <BookOpen className="h-3.5 w-3.5" />
                            Cheatsheet
                        </Link>

                        {/* Contact */}
                        <Link
                            href="/contact"
                            className={`text-sm font-medium px-3 py-2 rounded-lg transition-all duration-200 ${linkBase} ${linkHover}`}
                        >
                            Contact
                        </Link>

                        {/* CTA pill – only visible on dark (homepage) */}
                        {dark && (
                            <Link
                                href="/sorting"
                                className="ml-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all duration-300 hover:scale-105 hover:shadow-[0_0_20px_rgba(99,102,241,0.5)]"
                                style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}
                            >
                                Start Learning
                            </Link>
                        )}
                    </div>

                    {/* ── Mobile hamburger ── */}
                    <button
                        onClick={() => setMobileMenuOpen(o => !o)}
                        className={`md:hidden p-2 rounded-lg transition-all duration-200 ${hamburger}`}
                        aria-label="Toggle menu"
                        aria-expanded={mobileMenuOpen}
                    >
                        {mobileMenuOpen
                            ? <X className="h-5 w-5" />
                            : <Menu className="h-5 w-5" />}
                    </button>
                </div>
            </div>

            {/* ── Mobile panel ── */}
            <div
                className={`md:hidden border-t max-h-[80vh] overflow-y-auto overscroll-contain transition-all duration-300 ${mobilePanelBg} ${mobileMenuOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'}`}
                style={{ display: mobileMenuOpen ? 'block' : 'none' }}
            >
                <div className="px-4 pt-3 pb-5 space-y-1">

                    <Link href="/" onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${mobileLinkBase}`}>
                        Home
                    </Link>

                    <Link href="/cheatsheet" onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${cheatColor}`}>
                        <BookOpen className="h-4 w-4" />
                        Cheatsheet
                    </Link>

                    <Link href="/contact" onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${mobileLinkBase}`}>
                        Contact
                    </Link>

                    {/* Algorithms */}
                    <div className="pt-2">
                        <p className={`px-3 py-1 text-xs font-semibold uppercase tracking-widest ${mobileLabel}`}>
                            Visualize
                        </p>
                        {algorithmCategories.map((cat, i) => (
                            <div key={i} className="mt-2">
                                <div className={`mx-1 ${cat.lightColor} ${cat.borderColor} border-l-4 rounded-r-xl p-3`}>
                                    <Link
                                        href={`/${toCategorySlug(cat.name)}`}
                                        onClick={() => setMobileMenuOpen(false)}
                                        className={`block font-semibold text-sm ${cat.textColor} mb-1.5`}
                                    >
                                        {cat.name}
                                    </Link>
                                    <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
                                        {cat.algorithms.map((algo, j) => (
                                            <Link
                                                key={j}
                                                href={`/${toCategorySlug(cat.name)}/${toCategorySlug(algo)}`}
                                                onClick={() => setMobileMenuOpen(false)}
                                                className={`text-xs px-1 py-1 rounded transition-colors truncate ${mobileAlgoLink}`}
                                            >
                                                {algo}
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Mobile CTA */}
                    <div className="pt-3">
                        <Link
                            href="/sorting"
                            onClick={() => setMobileMenuOpen(false)}
                            className="flex items-center justify-center w-full py-3 rounded-xl text-sm font-semibold text-white"
                            style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}
                        >
                            Start Learning
                        </Link>
                    </div>
                </div>
            </div>
        </nav>
    );
}
