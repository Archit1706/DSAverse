export const metadata = {
    title: 'Composition vs Inheritance',
    description: 'Visualize is-a vs has-a relationships, the fragile base class problem, and why composition leads to more flexible designs.',
    keywords: ['composition', 'inheritance', 'oop', 'design patterns', 'has-a', 'is-a'],
    openGraph: {
        title: 'Composition vs Inheritance – DSAverse',
        description: 'Is-a versus has-a, the fragile base class problem, and why composition bends where deep inheritance breaks.',
        images: [{ url: '/og-image.png' }],
    },
    alternates: { canonical: '/under-the-hood/composition-vs-inheritance' },
};
export default function Layout({ children }) { return children; }
