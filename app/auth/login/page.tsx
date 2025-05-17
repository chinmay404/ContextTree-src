import { AuthForm } from "@/components/auth/auth-form"
import Link from "next/link"

export default function LoginPage() {
  return (
    <div className="container flex flex-col items-center justify-center min-h-screen py-12">
      <Link href="/" className="mb-8 text-2xl font-bold tracking-tight">
        ContextTree
      </Link>
      <AuthForm type="login" />
    </div>
  )
}
