import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export const metadata = {
    title: { template: '%s – Neural Networks | DSAverse', default: 'Neural Networks | DSAverse' },
    description: 'Interactive neural networks: a perceptron learning live, activation functions, a forward pass you can trace by hand, networks bending space, computational graphs, backpropagation, optimizers racing on a 3D loss surface, vanishing gradients, normalization, dropout and a full playground — every number computed in your browser.',
    keywords: ['neural network', 'perceptron', 'activation function', 'forward pass', 'backpropagation', 'computational graph', 'optimizer', 'Adam', 'vanishing gradients', 'batch normalization', 'dropout', 'weight decay', 'neural network playground'],
    openGraph: {
        title: 'Neural Network Visualizers – DSAverse',
        description: 'A neuron is a weighted sum and a bend. Stack them, train them with the chain rule, and watch real networks learn — and fail — on numbers small enough to read.',
        images: [{ url: '/og-image.png', width: 1200, height: 630 }],
    },
    alternates: { canonical: '/neural-networks' },
};

export default function NeuralNetworksLayout({ children }) {
    return (
        <>
            <Navbar />
            <main className="pt-16">{children}</main>
            <Footer />
        </>
    );
}
