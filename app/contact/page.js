"use client";
import React, { useState } from 'react';

const ContactPage = () => {
    const [formStatus, setFormStatus] = useState('Send Feedback');

    const handleSubmit = (e) => {
        e.preventDefault();
        setFormStatus('Sending...');
        setTimeout(() => {
            setFormStatus('Thank you! ✓');
            setTimeout(() => {
                setFormStatus('Send Feedback');
                e.target.reset();
            }, 2000);
        }, 1000);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-400 to-purple-600 p-5 font-sans">
            <div className="max-w-4xl mx-auto bg-white/95 backdrop-blur rounded-3xl shadow-2xl overflow-hidden animate-fade-in-up">
                <div className="relative bg-gradient-to-br from-indigo-600 to-purple-700 text-white text-center p-10 overflow-hidden">
                    <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(255,255,255,0.05)_10px,rgba(255,255,255,0.05)_20px)] animate-drift" />
                    <h1 className="relative z-10 text-4xl font-bold mb-2">Contact DSAverse</h1>
                    <p className="relative z-10 text-lg opacity-90">We'd love to hear from you! Share your feedback, suggestions, or collaborate with us.</p>
                </div>

                <div className="p-10 space-y-12">
                    <div>
                        <h2 className="text-2xl text-indigo-700 font-semibold flex items-center gap-2 mb-6">
                            <svg className="w-6 h-6" viewBox="0 0 24 24">
                                <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
                            </svg>
                            Send us your feedback
                        </h2>

                        <form onSubmit={handleSubmit} className="bg-gray-50 border-2 border-gray-200 rounded-xl p-8 transition hover:shadow-lg hover:border-indigo-600 space-y-6">
                            <div>
                                <label className="block font-semibold text-gray-700 mb-2">Name</label>
                                <input type="text" name="name" required className="w-full p-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                            </div>

                            <div>
                                <label className="block font-semibold text-gray-700 mb-2">Email</label>
                                <input type="email" name="email" required className="w-full p-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                            </div>

                            <div>
                                <label className="block font-semibold text-gray-700 mb-2">Feedback Type</label>
                                <select name="type" required className="w-full p-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300">
                                    <option value="">Select feedback type</option>
                                    <option value="bug">Bug Report</option>
                                    <option value="feature">Feature Request</option>
                                    <option value="improvement">Improvement Suggestion</option>
                                    <option value="collaboration">Collaboration Inquiry</option>
                                    <option value="general">General Feedback</option>
                                </select>
                            </div>

                            <div>
                                <label className="block font-semibold text-gray-700 mb-2">Your Message</label>
                                <textarea name="message" rows="5" required placeholder="Tell us what's on your mind..." className="w-full p-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300"></textarea>
                            </div>

                            <button type="submit" className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold py-3 rounded-lg transition-transform hover:-translate-y-1 hover:shadow-xl">
                                {formStatus}
                            </button>
                        </form>
                    </div>

                    <div>
                        <h2 className="text-2xl text-indigo-700 font-semibold flex items-center gap-2 mb-6">
                            <svg className="w-6 h-6" viewBox="0 0 24 24">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                            </svg>
                            Get in touch
                        </h2>

                        <div className="grid gap-5 sm:grid-cols-2">
                            <div className="bg-gray-50 border-2 border-gray-200 rounded-xl p-6 text-center hover:border-indigo-600 hover:shadow-lg transition relative overflow-hidden">
                                <h3 className="text-indigo-700 font-semibold mb-2">📧 Email</h3>
                                <a href="mailto:architrathod77@gmail.com" className="text-gray-600 font-medium hover:text-indigo-600 transition">architrathod77@gmail.com</a>
                            </div>

                            <div className="bg-gray-50 border-2 border-gray-200 rounded-xl p-6 text-center hover:border-indigo-600 hover:shadow-lg transition relative overflow-hidden">
                                <h3 className="text-indigo-700 font-semibold mb-2">🚀 GitHub</h3>
                                <a href="https://github.com/Archit1706/dsaverse" target="_blank" rel="noopener noreferrer" className="text-gray-600 font-medium hover:text-indigo-600 transition">
                                    github.com/Archit1706/dsaverse
                                </a>
                            </div>
                        </div>

                        <div className="bg-gradient-to-r from-emerald-500 to-emerald-700 text-white rounded-xl p-6 mt-8 relative overflow-hidden">
                            <div className="absolute top-4 right-6 text-5xl opacity-20">🚀</div>
                            <h3 className="text-xl font-bold mb-4">🌟 Open Source Collaboration</h3>
                            <p className="mb-1"><strong>DSAverse is open source!</strong> We welcome developers from around the world to contribute, add new features, or create amazing visualizations.</p>
                            <ul className="list-disc ml-5 mt-2 space-y-1">
                                <li>Submit pull requests on GitHub</li>
                                <li>Add new algorithms and data structures</li>
                                <li>Improve existing visualizations</li>
                                <li>Help with documentation and tutorials</li>
                                <li>Report bugs and suggest enhancements</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tailwind Animations */}
            <style>{`
        @keyframes drift {
          0% { transform: translateX(-100px) translateY(-100px); }
          100% { transform: translateX(100px) translateY(100px); }
        }
        .animate-drift {
          animation: drift 20s linear infinite;
        }
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.8s ease-out;
        }
      `}</style>
        </div>
    );
};

export default ContactPage;
