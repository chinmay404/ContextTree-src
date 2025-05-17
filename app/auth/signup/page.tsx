import { AuthForm } from "@/components/auth/auth-form"

export default function SignupPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Create an account</h1>
          <p className="text-sm text-muted-foreground">Enter your information to create an account</p>
        </div>
        <AuthForm type="signup" />
      </div>
    </div>
  )
}
