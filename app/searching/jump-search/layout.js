export const metadata = {
    title: "Jump Search Visualizer – Block Step Search Animation",
    description: "Visualize Jump Search jumping ahead by √n steps then doing linear search within the block. O(√n) time on sorted arrays — faster than linear, simpler than binary search.",
    keywords: ["jump search", "block search", "O(√n)", "sorted array", "step search", "algorithm visualization", "algorithm animation"],
    openGraph: {
        title: "Jump Search Visualizer – DSAverse",
        description: "Interactive Jump Search visualization showing block-jumping and linear scan steps.",
        images: [{ url: "/og-image.png" }],
    },
};
export default function Layout({ children }) { return children; }
