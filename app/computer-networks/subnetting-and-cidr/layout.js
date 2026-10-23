import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: "Subnetting and CIDR Calculator – Bits, Masks and Host Ranges",
    description: "See an IPv4 address as 32 bits, apply a CIDR prefix mask with a bitwise AND, derive the network and broadcast addresses and the usable host range, and test whether two hosts share a subnet — every bit animated.",
    keywords: ["subnetting", "CIDR", "subnet mask", "IPv4", "network address", "broadcast address", "usable hosts", "prefix length", "same subnet", "bitwise AND", "subnet calculator"],
    openGraph: {
        title: "Subnetting and CIDR – DSAverse",
        description: "An IPv4 address as 32 bits under a mask: network, broadcast, host range and the same-subnet test.",
        images: [{ url: "/og-image.png" }],
    },
    alternates: { canonical: "/computer-networks/subnetting-and-cidr" },
};
export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/computer-networks/subnetting-and-cidr" />
        </>
    );
}
