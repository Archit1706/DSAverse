export const metadata = {
    title: 'Floating Point and IEEE 754',
    description: 'Visualize why 0.1 + 0.2 is not 0.3 — binary fractions, the sign/exponent/mantissa bit layout of a double, round-to-nearest-even, ULP spacing, catastrophic cancellation, and NaN.',
    keywords: ['floating point', 'ieee 754', 'double precision', 'mantissa', 'exponent', 'rounding error', 'ulp', 'epsilon comparison', 'nan', 'catastrophic cancellation'],
    openGraph: {
        title: 'Floating Point and IEEE 754 – DSAverse',
        description: 'Why 0.1 + 0.2 isn\'t 0.3: sign, exponent and mantissa bits, round-to-nearest-even, ULP spacing, and NaN.',
        images: [{ url: '/og-image.png' }],
    },
    alternates: { canonical: '/under-the-hood/floating-point-and-ieee-754' },
};
export default function Layout({ children }) { return children; }
