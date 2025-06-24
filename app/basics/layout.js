import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

export default function BasicsLayout({ children }) {
    return (
        <>
            <Navbar />
            <main>{children}</main>
            <Footer />
        </>
    )
}