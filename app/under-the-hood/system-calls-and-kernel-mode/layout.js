export const metadata = {
    title: 'System Calls and Kernel Mode',
    description: 'Visualize the user/kernel privilege boundary — protection rings, the syscall trap instruction, the syscall table, argument validation, sysret, and why a system call costs far more than a function call.',
    keywords: ['system call', 'syscall', 'kernel mode', 'user mode', 'protection rings', 'ring 0', 'trap', 'context switch', 'vdso', 'buffered io'],
};
export default function Layout({ children }) { return children; }
