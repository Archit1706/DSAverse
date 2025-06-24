import React from 'react';
import { Play, Code } from 'lucide-react';
import BubbleSortVisualizer from './BubbleSortVisualizer';

const Hero = () => (
    <section className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                <div>
                    <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-6">
                        Master Data Structures & Algorithms
                        <span className="block text-blue-200">Visually</span>
                    </h1>
                    <p className="text-xl text-blue-100 mb-8 leading-relaxed">
                        Interactive visualizations, step-by-step explanations, and comprehensive examples
                        to help you understand complex algorithms and data structures with ease.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4">
                        <button className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors flex items-center justify-center">
                            <Play className="mr-2 h-5 w-5" />
                            Start Learning
                        </button>
                        <button className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-blue-600 transition-colors flex items-center justify-center">
                            <Code className="mr-2 h-5 w-5" />
                            View Code
                        </button>
                    </div>
                </div>
                <BubbleSortVisualizer />
            </div>
        </div>
    </section>
);

export default Hero;