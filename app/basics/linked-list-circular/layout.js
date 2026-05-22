export const metadata = {
    title: "Circular Linked List Visualizer",
    description: "Visualize a circular singly linked list where the tail node points back to head. Insert, delete, and search while seeing the circular connection animate in real time.",
    keywords: ["circular linked list", "tail points to head", "circular buffer", "round-robin", "data structures", "algorithm visualization"],
    openGraph: {
        title: "Circular Linked List Visualizer – Basics | DSAverse",
        description: "Watch the circular connection update as you insert and delete nodes in a circular singly linked list.",
        images: [{ url: "/og-image.png" }],
    },
};
export default function Layout({ children }) { return children; }
