export const metadata = {
    title: "Tower of Hanoi Visualizer – Recursive Disk Move Animation",
    description: "Visualize the Tower of Hanoi puzzle solved recursively: move n disks from source to destination using an auxiliary peg. Watch 2ⁿ-1 moves unfold. The iconic example of recursion.",
    keywords: ["tower of hanoi", "hanoi visualization", "recursive hanoi", "disk movement", "2^n moves", "algorithm visualization"],
    openGraph: {
        title: "Tower of Hanoi Visualizer – DSAverse",
        description: "Interactive Tower of Hanoi recursive disk-move animation.",
        images: [{ url: "/og-image.png" }],
    },
};
export default function Layout({ children }) { return children; }
