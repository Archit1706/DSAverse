import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: 'Activation Functions – Sigmoid, Tanh, ReLU and GELU, Their Slopes, and Why a Network Needs Them',
    description: 'Drag z along six activation functions and read their values and slopes, watch ReLU hinges bend a line into a curve, and train real networks with and without an activation to see two linear layers collapse into one line.',
    keywords: ['activation functions', 'sigmoid', 'tanh', 'ReLU', 'leaky ReLU', 'GELU', 'saturation', 'nonlinearity', 'vanishing gradient', 'neural networks'],
    openGraph: {
        title: 'Activation Functions – DSAverse',
        description: 'On 200 wave datasets, two hidden layers with no activation never beat the best straight line; one layer of ReLU units had a median 13× lower error. The bend is the whole point.',
        images: [{ url: '/og-image.png' }],
    },
    alternates: { canonical: '/neural-networks/activation-functions' },
};

export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/neural-networks/activation-functions" />
        </>
    );
}
