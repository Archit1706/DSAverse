import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

export const metadata = {
    title: 'Dynamic Programming | DSAverse',
    description: 'Master dynamic programming with interactive visualizations and step-by-step explanations.',
    icons: {
        icon: '/favicon.ico',
    },
    openGraph: {
        title: 'Dynamic Programming | DSAverse',
        description: 'Master dynamic programming with interactive visualizations and step-by-step explanations.',
        images: '/favicon.ico',
    },
    twitter: {
        title: 'Dynamic Programming | DSAverse',
        description: 'Master dynamic programming with interactive visualizations and step-by-step explanations.',
        images: '/favicon.ico',
    },
    keywords: [
        'DSA', 'Data Structures', 'Algorithms', 'Visualizations', 'Learn', 'Dynamic Programming',
        'DP', 'Memoization', 'Tabulation', 'Fibonacci', 'Coin Change', 'Making Change',
        'Longest Common Subsequence', 'LCS', 'Knapsack', 'Edit Distance', 'Optimization',
        'Bottom-up DP', 'Top-down DP', 'Overlapping Subproblems', 'Optimal Substructure',
        'Interview Preparation', 'Competitive Programming'
    ],
    robots: 'index, follow',
    creator: 'Archit Rathod',
    publisher: 'Archit Rathod',
    applicationName: 'DSAverse',
    authors: [{ name: 'Archit Rathod', url: 'https://archit-rathod.vercel.app/' }],
    category: 'technology',
}

export default function DynamicProgrammingLayout({ children }) {
    return (
        <>
            <Navbar />
            <main>{children}</main>
            <Footer />
        </>
    )
}