import React from 'react'
import { BookOpen } from 'lucide-react'

const Features = () => {
    return (
        <section className="py-16 bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
            <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
                <h2 className="text-3xl font-bold mb-4">
                    Ready to Master Data Structures & Algorithms?
                </h2>
                <p className="text-xl mb-8 text-indigo-100">
                    Start your journey with interactive visualizations and comprehensive explanations
                </p>
                <button className="bg-white text-indigo-600 px-8 py-3 rounded-lg font-semibold hover:bg-indigo-50 transition-colors flex items-center justify-center mx-auto">
                    <BookOpen className="mr-2 h-5 w-5" />
                    Begin Learning Now
                </button>
            </div>
        </section>
    )
}

export default Features