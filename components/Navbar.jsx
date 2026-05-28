"use client";
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { algorithmCategories } from '../data/algorithmCategories';
import {
    ChevronDown, Menu, X, BookOpen, ArrowRight,
    Layers, RefreshCw, ArrowUpDown, Search as SearchIcon,
    Database, Brain, GitBranch, BarChart2, ArrowLeftRight,
    Cpu, Type, GitMerge, TreePine, Scissors,
} from 'lucide-react';
import Link from 'next/link';

/* ── Logo ─────────────────────────────────────────────── */
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
            <circle cx="10" cy="22" r="1"   />
            <circle cx="14" cy="22" r="1"   />
            <circle cx="18" cy="22" r="1"   />
            <circle cx="22" cy="22" r="1"   />
            <line x1="16" y1="11" x2="12" y2="15" stroke="white" strokeWidth="1" opacity="0.8" />
            <line x1="16" y1="11" x2="20" y2="15" stroke="white" strokeWidth="1" opacity="0.8" />
            <line x1="12" y1="17" x2="10" y2="21" stroke="white" strokeWidth="1" opacity="0.6" />
            <line x1="12" y1="17" x2="14" y2="21" stroke="white" strokeWidth="1" opacity="0.6" />
            <line x1="20" y1="17" x2="18" y2="21" stroke="white" strokeWidth="1" opacity="0.6" />
            <line x1="20" y1="17" x2="22" y2="21" stroke="white" strokeWidth="1" opacity="0.6" />
        </g>
    </svg>
);

/* ── Category meta (icon + gradient) ─────────────────── */
const CAT_META = {
    'Basics':                    { icon: <Layers    className="w-3.5 h-3.5" />, grad: 'from-blue-500    to-cyan-500'   },
    'Recursion':                 { icon: <RefreshCw className="w-3.5 h-3.5" />, grad: 'from-emerald-500 to-teal-500'  },
    'Sorting':                   { icon: <ArrowUpDown className="w-3.5 h-3.5"/>, grad: 'from-orange-500 to-amber-500' },
    'Searching':                 { icon: <SearchIcon className="w-3.5 h-3.5" />, grad: 'from-red-500    to-rose-500'  },
    'Heap-like Data Structures': { icon: <Database  className="w-3.5 h-3.5" />, grad: 'from-amber-500  to-yellow-500'},
    'Dynamic Programming':       { icon: <Brain     className="w-3.5 h-3.5" />, grad: 'from-rose-500   to-pink-600'  },
    'Graph Algorithms':                   { icon: <GitBranch     className="w-3.5 h-3.5" />, grad: 'from-cyan-500   to-sky-600'     },
    'Two Pointers and Sliding Window':    { icon: <ArrowLeftRight className="w-3.5 h-3.5"/>, grad: 'from-violet-500 to-purple-600'  },
    'Bit Manipulation':                   { icon: <Cpu           className="w-3.5 h-3.5" />, grad: 'from-teal-500   to-cyan-600'    },
    'String Algorithms':                  { icon: <Type          className="w-3.5 h-3.5" />, grad: 'from-fuchsia-500 to-pink-600'   },
    'Backtracking':                       { icon: <GitMerge      className="w-3.5 h-3.5" />, grad: 'from-indigo-500  to-purple-600' },
    'Trees':                              { icon: <TreePine      className="w-3.5 h-3.5" />, grad: 'from-lime-500    to-green-600'   },
    'Divide and Conquer':                 { icon: <Scissors      className="w-3.5 h-3.5" />, grad: 'from-sky-500     to-blue-600'    },
};

/* ── Animated brand name ─────────────────────────────── */
const GLYPHS = '01ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz[]{}()<>#$';
const BRAND  = 'DSAverse';
const DSA_LEN = 3; // first 3 chars get white, rest get gradient

function AnimatedBrand() {
    // all locked on first render → shows final styled version immediately,
    // then scramble fires on mount
    const [locked, setLocked]   = useState(BRAND.length);
    const [glyphs, setGlyphs]   = useState(() => BRAND.split(''));
    const timerRef  = useRef(null);
    const running   = useRef(false);

    const runScramble = useCallback(() => {
        if (running.current) return;
        running.current = true;
        clearTimeout(timerRef.current);
        setLocked(0);

        let frame = 0;
        const tick = () => {
            frame++;
            // scramble freely for first 6 frames, then lock one char per 2 frames
            const newLocked = Math.max(0, Math.floor((frame - 6) / 2));

            setGlyphs(
                BRAND.split('').map((c, i) =>
                    i < newLocked
                        ? c
                        : GLYPHS[Math.floor(Math.random() * GLYPHS.length)]
                )
            );
            setLocked(newLocked);

            if (newLocked < BRAND.length) {
                timerRef.current = setTimeout(tick, 55);
            } else {
                running.current = false;
            }
        };
        tick();
    }, []);

    // auto-run once after mount
    useEffect(() => {
        const t = setTimeout(runScramble, 600);
        return () => clearTimeout(t);
    }, [runScramble]);

    useEffect(() => () => clearTimeout(timerRef.current), []);

    const allLocked = locked >= BRAND.length;

    return (
        <Link
            href="/"
            onMouseEnter={runScramble}
            className="group flex items-center flex-shrink-0"
        >
            <DSAverseLogo />
            <span className="font-mono flex items-center leading-none select-none">
                {/* < */}
                <span className="text-indigo-400/50 text-sm font-light
                               group-hover:text-indigo-400 transition-colors duration-300">
                    &lt;
                </span>

                {/* Main brand text */}
                {allLocked ? (
                    /* ── Resolved: full styled version ── */
                    <>
                        <span className="text-white font-bold text-[17px] tracking-tight">
                            DSA
                        </span>
                        <span
                            className="font-bold text-[17px] tracking-tight gradient-text animate-gradient"
                            style={{ backgroundImage: 'linear-gradient(135deg,#818cf8,#c084fc,#f472b6,#818cf8)' }}
                        >
                            verse
                        </span>
                    </>
                ) : (
                    /* ── Scrambling: char-by-char with lock-in ── */
                    glyphs.map((char, i) => (
                        <span
                            key={i}
                            className={`font-bold text-[17px] tracking-tight transition-colors duration-75 ${
                                i < locked
                                    ? i < DSA_LEN ? 'text-white' : 'text-violet-400'
                                    : 'text-indigo-300/50'
                            }`}
                        >
                            {char}
                        </span>
                    ))
                )}

                {/* /> */}
                <span className="text-pink-400/40 text-sm font-light ml-0.5
                               group-hover:text-pink-400/80 transition-colors duration-300">
                    &thinsp;/&gt;
                </span>
            </span>
        </Link>
    );
}

/* Filter to categories that actually have pages */
const PAGES_EXIST = new Set([
    'Basics', 'Recursion', 'Sorting', 'Searching',
    'Heap-like Data Structures', 'Dynamic Programming',
    'Graph Algorithms', 'Two Pointers and Sliding Window',
    'Bit Manipulation', 'String Algorithms', 'Backtracking', 'Trees',
    'Divide and Conquer',
]);
const VALID_CATS = algorithmCategories.filter(c => PAGES_EXIST.has(c.name));

const toSlug = (name) => name.toLowerCase().replace(/[:\s]+/g, '-').replace(/[()]/g, '');

/* ── Mega-menu dropdown ───────────────────────────────── */
function MegaMenu({ onClose }) {
    return (
        <div className="absolute top-full right-0 mt-2 z-[60]
                        w-[700px] max-w-[calc(100vw-2rem)]
                        bg-slate-900/98 backdrop-blur-xl
                        rounded-2xl border border-slate-700/60
                        shadow-2xl shadow-slate-950/70
                        overflow-hidden flex flex-col
                        max-h-[calc(100vh-5rem)]">

            {/* top gradient strip */}
            <div className="h-px w-full"
                style={{ background: 'linear-gradient(90deg,#3b82f6,#8b5cf6,#ec4899)' }} />

            {/* header row */}
            <div className="px-4 pt-3 pb-2 flex items-center justify-between flex-shrink-0">
                <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                    Visualize
                </span>
                <span className="text-[11px] text-slate-600 font-mono">
                    {VALID_CATS.reduce((n, c) => n + c.algorithms.length, 0)}+ algorithms
                </span>
            </div>

            {/* 3-column category grid */}
            <div className="px-3 pb-3 overflow-y-auto flex-1 grid grid-cols-3 gap-1">
                {VALID_CATS.map((cat) => {
                    const meta = CAT_META[cat.name] ?? { icon: <BarChart2 className="w-3.5 h-3.5"/>, grad: 'from-slate-500 to-slate-600' };
                    const slug = toSlug(cat.name);
                    return (
                        <div key={cat.name}
                            className="group rounded-xl p-3 hover:bg-slate-800/70 transition-all duration-150">

                            {/* category header → links to category page */}
                            <Link href={`/${slug}`} onClick={onClose}
                                className="flex items-center gap-2 mb-2">
                                <div className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center
                                               bg-gradient-to-br ${meta.grad} text-white shadow-sm
                                               group-hover:scale-110 transition-transform duration-200`}>
                                    {meta.icon}
                                </div>
                                <span className="font-semibold text-xs text-slate-300 leading-tight
                                               group-hover:text-white transition-colors">
                                    {cat.name}
                                </span>
                            </Link>

                            {/* algorithm link list */}
                            <div className="ml-[36px] space-y-0.5">
                                {cat.algorithms.slice(0, 3).map(algo => (
                                    <Link
                                        key={algo}
                                        href={`/${slug}/${toSlug(algo)}`}
                                        onClick={onClose}
                                        className="block text-xs text-slate-500 hover:text-slate-200
                                                  py-0.5 truncate transition-colors duration-100"
                                    >
                                        {algo}
                                    </Link>
                                ))}
                                {cat.algorithms.length > 3 && (
                                    <Link href={`/${slug}`} onClick={onClose}
                                        className="flex items-center gap-0.5 text-[11px] text-slate-600
                                                  hover:text-indigo-400 transition-colors pt-0.5">
                                        +{cat.algorithms.length - 3} more
                                        <ArrowRight className="w-2.5 h-2.5" />
                                    </Link>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* footer bar */}
            <div className="border-t border-slate-800/60 bg-slate-900/60
                           px-4 py-2.5 flex items-center justify-between flex-shrink-0">
                <Link href="/cheatsheet" onClick={onClose}
                    className="flex items-center gap-1.5 text-xs text-slate-400
                              hover:text-violet-400 transition-colors">
                    <BookOpen className="w-3.5 h-3.5" />
                    Complexity Cheatsheet
                </Link>
                <Link href="/" onClick={onClose}
                    className="flex items-center gap-1 text-xs text-slate-600
                              hover:text-slate-300 transition-colors">
                    All categories
                    <ArrowRight className="w-3 h-3" />
                </Link>
            </div>
        </div>
    );
}

/* ── Navbar ───────────────────────────────────────────── */
export default function Navbar() {
    const pathname = usePathname();
    const isHome   = pathname === '/';

    const [scrolled,       setScrolled]       = useState(false);
    const [activeDropdown, setActiveDropdown] = useState(false);
    const [mobileOpen,     setMobileOpen]     = useState(false);
    const timeoutRef = useRef(null);

    /* scroll — makes homepage start transparent */
    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 60);
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    /* close mobile on navigate */
    useEffect(() => { setMobileOpen(false); setActiveDropdown(false); }, [pathname]);

    /* hover timeout */
    const clearPending = () => clearTimeout(timeoutRef.current);
    const onEnter = () => { clearPending(); setActiveDropdown(true); };
    const onLeave = () => { clearPending(); timeoutRef.current = setTimeout(() => setActiveDropdown(false), 200); };
    useEffect(() => () => clearPending(), []);

    /* ── bg ──
       Home + not scrolled → transparent
       Everywhere else     → solid dark
    */
    const navBg = isHome && !scrolled
        ? 'bg-transparent border-transparent'
        : 'bg-slate-900/95 backdrop-blur-md border-slate-800/50 shadow-lg shadow-slate-950/30';

    return (
        <nav className={`fixed top-0 inset-x-0 z-50 border-b transition-all duration-300 ${navBg}`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="relative flex justify-between h-16 items-center">

                    {/* Logo */}
                    <AnimatedBrand />

                    {/* Desktop nav */}
                    <div className="hidden md:flex items-center gap-1">

                        <Link href="/"
                            className="text-sm font-medium px-3 py-2 rounded-lg
                                      text-slate-300 hover:text-white hover:bg-white/10
                                      transition-all duration-200">
                            Home
                        </Link>

                        {/* Visualize mega-menu */}
                        <div onMouseEnter={onEnter} onMouseLeave={onLeave}>
                            <button
                                className="flex items-center gap-1 text-sm font-medium px-3 py-2 rounded-lg
                                          text-slate-300 hover:text-white hover:bg-white/10
                                          transition-all duration-200"
                                aria-expanded={activeDropdown}
                                aria-haspopup="true"
                            >
                                Visualize
                                <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200
                                                        ${activeDropdown ? 'rotate-180' : ''}`} />
                            </button>
                            {activeDropdown && <MegaMenu onClose={() => setActiveDropdown(false)} />}
                        </div>

                        <Link href="/cheatsheet"
                            className="flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-lg
                                      text-violet-400 hover:text-violet-200 hover:bg-white/10
                                      transition-all duration-200">
                            <BookOpen className="h-3.5 w-3.5" />
                            Cheatsheet
                        </Link>

                        <Link href="/contact"
                            className="text-sm font-medium px-3 py-2 rounded-lg
                                      text-slate-300 hover:text-white hover:bg-white/10
                                      transition-all duration-200">
                            Contact
                        </Link>

                        {/* CTA pill — homepage only */}
                        {isHome && (
                            <Link href="/sorting"
                                className="ml-2 px-4 py-2 rounded-xl text-sm font-semibold text-white
                                          transition-all duration-300 hover:scale-105
                                          hover:shadow-[0_0_20px_rgba(99,102,241,0.5)]"
                                style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
                                Start Learning
                            </Link>
                        )}
                    </div>

                    {/* Hamburger */}
                    <button
                        onClick={() => setMobileOpen(o => !o)}
                        className="md:hidden p-2 rounded-lg text-slate-300 hover:text-white
                                  hover:bg-white/10 transition-all duration-200"
                        aria-label="Toggle menu"
                        aria-expanded={mobileOpen}
                    >
                        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                    </button>
                </div>
            </div>

            {/* ── Mobile panel ── */}
            {mobileOpen && (
                <div className="md:hidden border-t border-slate-800/60
                               bg-slate-950/98 backdrop-blur-xl
                               max-h-[80vh] overflow-y-auto overscroll-contain">
                    <div className="px-4 pt-3 pb-6 space-y-1">

                        {/* Top links */}
                        <Link href="/" onClick={() => setMobileOpen(false)}
                            className="flex items-center px-3 py-2.5 rounded-xl text-sm font-medium
                                      text-slate-300 hover:text-white hover:bg-white/10 transition-colors">
                            Home
                        </Link>
                        <Link href="/cheatsheet" onClick={() => setMobileOpen(false)}
                            className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium
                                      text-violet-400 hover:text-violet-200 hover:bg-white/10 transition-colors">
                            <BookOpen className="h-4 w-4" />
                            Cheatsheet
                        </Link>
                        <Link href="/contact" onClick={() => setMobileOpen(false)}
                            className="flex items-center px-3 py-2.5 rounded-xl text-sm font-medium
                                      text-slate-300 hover:text-white hover:bg-white/10 transition-colors">
                            Contact
                        </Link>

                        {/* Categories */}
                        <div className="pt-3">
                            <p className="px-3 py-1 text-[11px] font-semibold uppercase
                                        tracking-widest text-slate-600 mb-2">
                                Visualize
                            </p>

                            <div className="space-y-2">
                                {VALID_CATS.map((cat) => {
                                    const meta = CAT_META[cat.name] ?? { icon: null, grad: 'from-slate-500 to-slate-600' };
                                    const slug = toSlug(cat.name);
                                    return (
                                        <div key={cat.name}
                                            className="rounded-2xl border border-slate-800/80
                                                      bg-slate-900/60 overflow-hidden">
                                            {/* category header */}
                                            <Link href={`/${slug}`} onClick={() => setMobileOpen(false)}
                                                className="flex items-center gap-3 px-4 py-3
                                                          hover:bg-slate-800/60 transition-colors">
                                                <div className={`flex-shrink-0 w-7 h-7 rounded-lg
                                                              flex items-center justify-center
                                                              bg-gradient-to-br ${meta.grad} text-white`}>
                                                    {meta.icon}
                                                </div>
                                                <span className="font-semibold text-sm text-slate-200">
                                                    {cat.name}
                                                </span>
                                                <ArrowRight className="w-3.5 h-3.5 text-slate-600 ml-auto" />
                                            </Link>

                                            {/* algorithm grid */}
                                            <div className="px-4 pb-3 grid grid-cols-2 gap-x-3 gap-y-0.5
                                                          border-t border-slate-800/60 pt-2">
                                                {cat.algorithms.slice(0, 6).map(algo => (
                                                    <Link
                                                        key={algo}
                                                        href={`/${slug}/${toSlug(algo)}`}
                                                        onClick={() => setMobileOpen(false)}
                                                        className="text-xs text-slate-500 hover:text-slate-200
                                                                  py-1 truncate transition-colors"
                                                    >
                                                        {algo}
                                                    </Link>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* CTA */}
                        <div className="pt-4">
                            <Link href="/sorting" onClick={() => setMobileOpen(false)}
                                className="flex items-center justify-center w-full py-3 rounded-xl
                                          text-sm font-semibold text-white gap-2"
                                style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
                                Start Learning
                                <ArrowRight className="w-4 h-4" />
                            </Link>
                        </div>
                    </div>
                </div>
            )}
        </nav>
    );
}
