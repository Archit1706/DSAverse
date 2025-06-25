import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

export default function ContactLayout({ children }) {
    return (
        <>
            <Navbar />
            <main>{children}</main>
            <Footer />
        </>
    )
}