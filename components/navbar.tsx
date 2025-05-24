import Link from "next/link"
import { SaveStatus } from "./save-status"

const Navbar = () => {
  return (
    <nav className="bg-gray-800 p-4">
      <div className="container mx-auto flex items-center justify-between">
        <Link href="/" className="text-white text-lg font-bold">
          My App
        </Link>
        <div className="flex items-center space-x-4">
          <Link href="/about" className="text-gray-300 hover:text-white">
            About
          </Link>
          <Link href="/contact" className="text-gray-300 hover:text-white">
            Contact
          </Link>
          <SaveStatus />
        </div>
      </div>
    </nav>
  )
}

export default Navbar
