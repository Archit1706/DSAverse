"use client";
import React, { useState, useEffect } from 'react';
import { Play, Code, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';

const BubbleSortVisualizer = () => {
    const [animationStep, setAnimationStep] = useState(0);
    const [sortingArray, setSortingArray] = useState([64, 34, 25, 12, 22, 11, 90]);
    const [comparing, setComparing] = useState([]);
    const [sorted, setSorted] = useState([]);

    useEffect(() => {
        const interval = setInterval(() => {
            setAnimationStep((prev) => (prev + 1) % 8);
        }, 2000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const steps = [
            { array: [64, 34, 25, 12, 22, 11, 90], comparing: [0, 1], sorted: [] },
            { array: [34, 64, 25, 12, 22, 11, 90], comparing: [1, 2], sorted: [] },
            { array: [34, 25, 64, 12, 22, 11, 90], comparing: [2, 3], sorted: [] },
            { array: [34, 25, 12, 64, 22, 11, 90], comparing: [3, 4], sorted: [] },
            { array: [34, 25, 12, 22, 64, 11, 90], comparing: [4, 5], sorted: [] },
            { array: [34, 25, 12, 22, 11, 64, 90], comparing: [5, 6], sorted: [] },
            { array: [34, 25, 12, 22, 11, 64, 90], comparing: [], sorted: [6] },
            { array: [11, 12, 22, 25, 34, 64, 90], comparing: [], sorted: [0, 1, 2, 3, 4, 5, 6] }
        ];
        const currentStep = steps[animationStep];
        setSortingArray(currentStep.array);
        setComparing(currentStep.comparing);
        setSorted(currentStep.sorted);
    }, [animationStep]);

    return (
        <div className="bg-gradient-to-br from-blue-500/20 to-purple-600/20 backdrop-blur-sm rounded-2xl p-6 border border-blue-300/30 shadow-xl">
            <div className="mb-4">
                <h3 className="text-xl font-bold mb-2 text-blue-100">Bubble Sort</h3>
                <div className="flex items-end justify-center space-x-2 h-36">
                    {sortingArray.map((value, index) => (
                        <div
                            key={index}
                            className={`flex flex-col items-center transition-all duration-700 ease-in-out ${comparing.includes(index)
                                ? 'transform scale-110 animate-pulse'
                                : sorted.includes(index)
                                    ? 'opacity-90'
                                    : ''
                                }`}
                        >
                            <div
                                className={`w-10 rounded-t-lg transition-all duration-700 ease-in-out shadow-lg ${comparing.includes(index)
                                    ? 'bg-gradient-to-t from-red-400 to-red-300 shadow-red-400/50'
                                    : sorted.includes(index)
                                        ? 'bg-gradient-to-t from-emerald-400 to-emerald-300 shadow-emerald-400/50'
                                        : 'bg-gradient-to-t from-blue-400 to-blue-300 shadow-blue-400/50'
                                    }`}
                                style={{ height: `${value * 1.2}px` }}
                            />
                            <span className="text-sm mt-2 text-blue-100 font-medium">{value}</span>
                        </div>
                    ))}
                </div>
            </div>
            <div className="text-center">
                <span className="text-sm text-blue-200 bg-blue-900/30 px-3 py-1 rounded-full">
                    {comparing.length > 0 ? `Comparing ${sortingArray[comparing[0]]} and ${sortingArray[comparing[1]]}` :
                        sorted.length === sortingArray.length ? '✨ Sorting Complete!' : 'Starting sort...'}
                </span>
            </div>
        </div>
    );
};

const SelectionSortVisualizer = () => {
    const [animationStep, setAnimationStep] = useState(0);
    const [sortingArray, setSortingArray] = useState([64, 34, 25, 12, 22, 11, 90]);
    const [current, setCurrent] = useState(-1);
    const [minimum, setMinimum] = useState(-1);
    const [sorted, setSorted] = useState([]);

    useEffect(() => {
        const interval = setInterval(() => {
            setAnimationStep((prev) => (prev + 1) % 8);
        }, 2000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const steps = [
            { array: [64, 34, 25, 12, 22, 11, 90], current: 0, minimum: 5, sorted: [] },
            { array: [11, 34, 25, 12, 22, 64, 90], current: 1, minimum: 3, sorted: [0] },
            { array: [11, 12, 25, 34, 22, 64, 90], current: 2, minimum: 4, sorted: [0, 1] },
            { array: [11, 12, 22, 34, 25, 64, 90], current: 3, minimum: 4, sorted: [0, 1, 2] },
            { array: [11, 12, 22, 25, 34, 64, 90], current: 4, minimum: -1, sorted: [0, 1, 2, 3] },
            { array: [11, 12, 22, 25, 34, 64, 90], current: 5, minimum: -1, sorted: [0, 1, 2, 3, 4] },
            { array: [11, 12, 22, 25, 34, 64, 90], current: -1, minimum: -1, sorted: [0, 1, 2, 3, 4, 5] },
            { array: [11, 12, 22, 25, 34, 64, 90], current: -1, minimum: -1, sorted: [0, 1, 2, 3, 4, 5, 6] }
        ];
        const currentStep = steps[animationStep];
        setSortingArray(currentStep.array);
        setCurrent(currentStep.current);
        setMinimum(currentStep.minimum);
        setSorted(currentStep.sorted);
    }, [animationStep]);

    return (
        <div className="bg-gradient-to-br from-emerald-500/20 to-teal-600/20 backdrop-blur-sm rounded-2xl p-6 border border-emerald-300/30 shadow-xl">
            <div className="mb-4">
                <h3 className="text-xl font-bold mb-2 text-emerald-100">Selection Sort</h3>
                <div className="flex items-end justify-center space-x-2 h-36">
                    {sortingArray.map((value, index) => (
                        <div
                            key={index}
                            className={`flex flex-col items-center transition-all duration-700 ease-in-out ${index === current
                                ? 'transform scale-110 animate-bounce'
                                : index === minimum
                                    ? 'transform scale-105 animate-pulse'
                                    : sorted.includes(index)
                                        ? 'opacity-90'
                                        : ''
                                }`}
                        >
                            <div
                                className={`w-10 rounded-t-lg transition-all duration-700 ease-in-out shadow-lg ${index === current
                                    ? 'bg-gradient-to-t from-orange-400 to-orange-300 shadow-orange-400/50'
                                    : index === minimum
                                        ? 'bg-gradient-to-t from-yellow-400 to-yellow-300 shadow-yellow-400/50'
                                        : sorted.includes(index)
                                            ? 'bg-gradient-to-t from-emerald-400 to-emerald-300 shadow-emerald-400/50'
                                            : 'bg-gradient-to-t from-teal-400 to-teal-300 shadow-teal-400/50'
                                    }`}
                                style={{ height: `${value * 1.2}px` }}
                            />
                            <span className="text-sm mt-2 text-emerald-100 font-medium">{value}</span>
                        </div>
                    ))}
                </div>
            </div>
            <div className="text-center">
                <span className="text-sm text-emerald-200 bg-emerald-900/30 px-3 py-1 rounded-full">
                    {current >= 0 ? `Finding minimum from position ${current}` :
                        sorted.length === sortingArray.length ? '✨ Sorting Complete!' : 'Starting sort...'}
                </span>
            </div>
        </div>
    );
};

const InsertionSortVisualizer = () => {
    const [animationStep, setAnimationStep] = useState(0);
    const [sortingArray, setSortingArray] = useState([64, 34, 25, 12, 22, 11, 90]);
    const [current, setCurrent] = useState(-1);
    const [sorted, setSorted] = useState([]);

    useEffect(() => {
        const interval = setInterval(() => {
            setAnimationStep((prev) => (prev + 1) % 8);
        }, 2000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const steps = [
            { array: [64, 34, 25, 12, 22, 11, 90], current: 1, sorted: [0] },
            { array: [34, 64, 25, 12, 22, 11, 90], current: 2, sorted: [0, 1] },
            { array: [25, 34, 64, 12, 22, 11, 90], current: 3, sorted: [0, 1, 2] },
            { array: [12, 25, 34, 64, 22, 11, 90], current: 4, sorted: [0, 1, 2, 3] },
            { array: [12, 22, 25, 34, 64, 11, 90], current: 5, sorted: [0, 1, 2, 3, 4] },
            { array: [11, 12, 22, 25, 34, 64, 90], current: 6, sorted: [0, 1, 2, 3, 4, 5] },
            { array: [11, 12, 22, 25, 34, 64, 90], current: -1, sorted: [0, 1, 2, 3, 4, 5, 6] },
            { array: [11, 12, 22, 25, 34, 64, 90], current: -1, sorted: [0, 1, 2, 3, 4, 5, 6] }
        ];
        const currentStep = steps[animationStep];
        setSortingArray(currentStep.array);
        setCurrent(currentStep.current);
        setSorted(currentStep.sorted);
    }, [animationStep]);

    return (
        <div className="bg-gradient-to-br from-purple-500/20 to-pink-600/20 backdrop-blur-sm rounded-2xl p-6 border border-purple-300/30 shadow-xl">
            <div className="mb-4">
                <h3 className="text-xl font-bold mb-2 text-purple-100">Insertion Sort</h3>
                <div className="flex items-end justify-center space-x-2 h-36">
                    {sortingArray.map((value, index) => (
                        <div
                            key={index}
                            className={`flex flex-col items-center transition-all duration-700 ease-in-out ${index === current
                                ? 'transform scale-110 animate-pulse'
                                : sorted.includes(index)
                                    ? 'opacity-90'
                                    : ''
                                }`}
                        >
                            <div
                                className={`w-10 rounded-t-lg transition-all duration-700 ease-in-out shadow-lg ${index === current
                                    ? 'bg-gradient-to-t from-pink-400 to-pink-300 shadow-pink-400/50'
                                    : sorted.includes(index)
                                        ? 'bg-gradient-to-t from-emerald-400 to-emerald-300 shadow-emerald-400/50'
                                        : 'bg-gradient-to-t from-purple-400 to-purple-300 shadow-purple-400/50'
                                    }`}
                                style={{ height: `${value * 1.2}px` }}
                            />
                            <span className="text-sm mt-2 text-purple-100 font-medium">{value}</span>
                        </div>
                    ))}
                </div>
            </div>
            <div className="text-center">
                <span className="text-sm text-purple-200 bg-purple-900/30 px-3 py-1 rounded-full">
                    {current >= 0 ? `Inserting element at position ${current}` :
                        sorted.length === sortingArray.length ? '✨ Sorting Complete!' : 'Starting sort...'}
                </span>
            </div>
        </div>
    );
};

const SortingCarousel = () => {
    const [currentIndex, setCurrentIndex] = useState(0);

    const visualizers = [
        { component: <BubbleSortVisualizer />, name: "Bubble Sort" },
        { component: <SelectionSortVisualizer />, name: "Selection Sort" },
        { component: <InsertionSortVisualizer />, name: "Insertion Sort" }
    ];

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % visualizers.length);
        }, 8000);
        return () => clearInterval(interval);
    }, []);

    const goToPrevious = () => {
        setCurrentIndex((prev) => (prev - 1 + visualizers.length) % visualizers.length);
    };

    const goToNext = () => {
        setCurrentIndex((prev) => (prev + 1) % visualizers.length);
    };

    return (
        <div className="relative">
            <div className="overflow-hidden rounded-2xl">
                <div
                    className="flex transition-transform duration-1000 ease-in-out"
                    style={{ transform: `translateX(-${currentIndex * 100}%)` }}
                >
                    {visualizers.map((visualizer, index) => (
                        <div key={index} className="w-full flex-shrink-0">
                            {visualizer.component}
                        </div>
                    ))}
                </div>
            </div>

            {/* Navigation buttons */}
            <button
                onClick={goToPrevious}
                className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-white/20 backdrop-blur-sm text-white p-2 rounded-full hover:bg-white/30 transition-all duration-300 shadow-lg"
            >
                <ChevronLeft className="h-5 w-5" />
            </button>
            <button
                onClick={goToNext}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-white/20 backdrop-blur-sm text-white p-2 rounded-full hover:bg-white/30 transition-all duration-300 shadow-lg"
            >
                <ChevronRight className="h-5 w-5" />
            </button>

            {/* Dots indicator */}
            <div className="flex justify-center mt-4 space-x-2">
                {visualizers.map((_, index) => (
                    <button
                        key={index}
                        onClick={() => setCurrentIndex(index)}
                        className={`w-3 h-3 rounded-full transition-all duration-300 ${index === currentIndex
                            ? 'bg-white shadow-lg scale-110'
                            : 'bg-white/40 hover:bg-white/60'
                            }`}
                    />
                ))}
            </div>

            {/* Algorithm name indicator */}
            <div className="text-center mt-3">
                <span className="text-lg font-semibold text-white/90 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full border border-white/20">
                    {visualizers[currentIndex].name}
                </span>
            </div>
        </div>
    );
};

const Hero = () => (
    <section className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 text-white min-h-screen">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-indigo-700/20"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                <div className="z-10">
                    <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-6">
                        Master Data Structures & Algorithms
                        <span className="block text-blue-200 bg-gradient-to-r from-blue-200 to-purple-200 bg-clip-text text-transparent">
                            Visually
                        </span>
                    </h1>
                    <p className="text-xl text-blue-100 mb-8 leading-relaxed">
                        Interactive visualizations, step-by-step explanations, and comprehensive examples
                        to help you understand complex algorithms and data structures with ease.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4">
                        <Link href="#explore" className="bg-white text-blue-600 px-8 py-4 rounded-xl font-semibold hover:bg-blue-50 transition-all duration-300 flex items-center justify-center shadow-xl hover:shadow-2xl transform hover:scale-105">
                            <Play className="mr-2 h-5 w-5" />
                            Start Learning
                        </Link>
                        <Link href="https://github.com/Archit1706/dsaverse" target="_blank" className="border-2 border-white text-white px-8 py-4 rounded-xl font-semibold hover:bg-white hover:text-blue-600 transition-all duration-300 flex items-center justify-center backdrop-blur-sm bg-white/10">
                            <Code className="mr-2 h-5 w-5" />
                            View Code
                        </Link>
                    </div>
                </div>
                <div className="z-10">
                    <SortingCarousel />
                </div>
            </div>
        </div>

        {/* Animated background elements */}
        <div className="absolute top-10 left-10 w-20 h-20 bg-blue-400/20 rounded-full animate-pulse"></div>
        <div className="absolute top-1/3 right-10 w-16 h-16 bg-purple-400/20 rounded-full animate-bounce"></div>
        <div className="absolute bottom-10 left-1/4 w-12 h-12 bg-indigo-400/20 rounded-full animate-ping"></div>
    </section>
);

export default Hero;