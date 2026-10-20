import { totalQuestions, totalPages } from '@/data/learningStats';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export const metadata = {
    title: 'Review – Spaced Repetition Practice',
    description: `Practise every algorithm on DSAverse with spaced repetition. ${totalQuestions} questions drawn from all ${totalPages} visualizers, scheduled so you revisit each one just before you would forget it.`,
    keywords: ['spaced repetition', 'active recall', 'DSA practice', 'algorithm quiz', 'interview prep', 'retrieval practice'],
    openGraph: {
        title: 'Review – DSAverse',
        description: `Spaced repetition over ${totalQuestions} questions drawn from every visualizer on the site.`,
        images: [{ url: '/og-image.png', width: 1200, height: 630 }],
    },
    alternates: { canonical: '/review' },
};

export default function ReviewLayout({ children }) {
    return (
        <>
            <Navbar />
            <main className="pt-16">{children}</main>
            <Footer />
        </>
    );
}
