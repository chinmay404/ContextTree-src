"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Icons } from "@/components/ui/icons"

interface AuthFormProps {
  type: "login" | "signup"
}

export function AuthForm({ type }: AuthFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      if (type === "signup") {
        // Register the user
        const res = await fetch("/api/register", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: formData.name,
            email: formData.email,
            password: formData.password,
          }),
        })

        const data = await res.json()

        if (!res.ok) {
          throw new Error(data.error || "Something went wrong")
        }

        // After successful registration, sign in
        await signIn("credentials", {
          email: formData.email,
          password: formData.password,
          redirect: false,
        })

        router.push("/canvas")
      } else {
        // Login
        const result = await signIn("credentials", {
          email: formData.email,
          password: formData.password,
          redirect: false,
        })

        if (result?.error) {
          throw new Error("Invalid email or password")
        }

        router.push("/canvas")
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setIsLoading(true)
    try {
      await signIn("google", { callbackUrl: "/canvas" })
    } catch (err) {
      setError("An error occurred with Google sign in")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>{type === "login" ? "Sign In" : "Create an Account"}</CardTitle>
        <CardDescription>
          {type === "login"
            ? "Enter your email and password to access your account"
            : "Fill in the details below to create your account"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          {type === "signup" && (
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                name="name"
                placeholder="Enter your name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="Enter your email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="Enter your password"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                {type === "login" ? "Signing in..." : "Creating account..."}
              </>
            ) : type === "login" ? (
              "Sign In"
            ) : (
              "Create Account"
            )}
          </Button>
        </form>
        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-white px-2 text-gray-500">Or continue with</span>
          </div>
        </div>
        <Button variant="outline" type="button" className="w-full" onClick={handleGoogleSignIn} disabled={isLoading}>
          <Icons.google className="mr-2 h-4 w-4" />
          Google
        </Button>
      </CardContent>
      <CardFooter className="flex justify-center">
        {type === "login" ? (
          <p className="text-sm text-gray-600">
            Don't have an account?{" "}
            <a href="/auth/signup" className="text-primary hover:underline">
              Sign up
            </a>
          </p>
        ) : (
          <p className="text-sm text-gray-600">
            Already have an account?{" "}
            <a href="/auth/login" className="text-primary hover:underline">
              Sign in
            </a>
          </p>
        )}
      </CardFooter>
    </Card>
  )
}
