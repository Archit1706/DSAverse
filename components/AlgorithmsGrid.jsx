import React from 'react';
import { ArrowRight } from 'lucide-react';
import { algorithmCategories } from '../data/algorithmCategories';
import Link from 'next/link';

const AlgorithmsGrid = () => (
    <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                    Explore All Algorithms & Data Structures
                </h2>
                <p className="text-xl text-gray-600">
                    Choose from our comprehensive collection organized by category
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {algorithmCategories.map((category, index) => (
                    <div key={index} className={`${category.lightColor} rounded-xl p-6 ${category.borderColor} border-2 hover:shadow-lg transition-shadow`}>
                        <div className="flex items-center mb-4">
                            <div className={`w-4 h-4 ${category.color} rounded-full mr-3`}></div>
                            <h3 className={`text-xl font-bold ${category.textColor}`}>
                                {category.name}
                            </h3>
                        </div>

                        <div className="grid grid-cols-1 gap-2">
                            {category.algorithms.map((algorithm, algorithmIndex) => (
                                <Link
                                    key={algorithmIndex}
                                    href={`/${category.name.toLowerCase().replace(/[:\s]+/g, '-').replace(/[()]/g, '')}/${algorithm.toLowerCase().replace(/[:\s]+/g, '-').replace(/[()]/g, '')}`}
                                    className={`flex items-center justify-between p-3 rounded-lg hover:bg-white transition-colors group ${category.textColor}`}
                                >
                                    <span className="font-medium">{algorithm}</span>
                                    <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </Link>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </section>
);

export default AlgorithmsGrid;