"use client"

import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowRight, LogIn } from "lucide-react"

export default function Home() {
  const { data: session } = useSession()

  return (
    <div className="flex flex-col min-h-screen">
      <header className="border-b border-border">
        <div className="container flex items-center justify-between py-4">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold">Conversation Canvas</h1>
          </div>
          <div>
            {session ? (
              <Link href="/dashboard">
                <Button>
                  Dashboard <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            ) : (
              <Link href="/login">
                <Button>
                  Login <LogIn className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="py-20">
          <div className="container">
            <div className="max-w-3xl mx-auto text-center">
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
                Visualize Your Conversations
              </h1>
              <p className="mt-6 text-lg text-muted-foreground">
                Create, connect, and visualize conversation flows with our intuitive canvas tool.
              </p>
              <div className="mt-10 flex items-center justify-center gap-4">
                {session ? (
                  <Link href="/dashboard">
                    <Button size="lg">
                      Go to Dashboard <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                ) : (
                  <Link href="/login">
                    <Button size="lg">
                      Get Started <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 bg-muted/50">
          <div className="container">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-card p-6 rounded-lg shadow-sm">
                <h3 className="text-xl font-semibold mb-3">Visual Canvas</h3>
                <p className="text-muted-foreground">
                  Drag, drop, and connect conversation nodes to create complex conversation flows.
                </p>
              </div>
              <div className="bg-card p-6 rounded-lg shadow-sm">
                <h3 className="text-xl font-semibold mb-3">AI Integration</h3>
                <p className="text-muted-foreground">
                  Connect with various AI models to simulate and test your conversation designs.
                </p>
              </div>
              <div className="bg-card p-6 rounded-lg shadow-sm">
                <h3 className="text-xl font-semibold mb-3">Collaboration</h3>
                <p className="text-muted-foreground">
                  Share your conversation designs with team members and collaborate in real-time.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-6">
        <div className="container">
          <p className="text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} Conversation Canvas. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
