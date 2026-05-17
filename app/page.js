import React from 'react';
import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import Features from '@/components/Features';
import AlgorithmsGrid from '@/components/AlgorithmsGrid';
import CTA from '@/components/CTA';
import Footer from '@/components/Footer';

export default function HomePage() {
    return (
        <div className="bg-slate-950">
            <Navbar />
            <Hero />
            <Features />
            <AlgorithmsGrid />
            <CTA />
            <Footer />
        </div>
    );
}
