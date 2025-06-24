"use client";

import React from 'react';
import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import Features from '@/components/Features';
import AlgorithmsGrid from '@/components/AlgorithmsGrid';
import CTA from '@/components/CTA';
import Footer from '@/components/Footer';

const DSAVisualizer = () => {

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100">
      <Navbar />
      <Hero />
      <Features />
      <AlgorithmsGrid />
      <CTA />
      <Footer />
    </div>
  );
};

export default DSAVisualizer;