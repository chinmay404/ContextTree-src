"use client";

import type React from "react";

import ContextTree from "@/components/conversation-canvas";
import { ReactFlowProvider } from "reactflow";
import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/components/ui/use-toast";
import LeftSidebar from "@/components/LeftSidebar";
import Navbar from "@/components/Navbar";

// Error handler component to catch ResizeObserver errors
function ErrorHandler({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      if (event.message.includes("ResizeObserver")) {
        // Prevent the error from being displayed in the console
        event.preventDefault();
      }
    };

    window.addEventListener("error", handleError);
    return () => window.removeEventListener("error", handleError);
  }, []);

  return <>{children}</>;
}

// Database connection status component
function DatabaseStatus() {
  const { toast } = useToast();
  const [status, setStatus] = useState<"checking" | "connected" | "error">(
    "checking"
  );

  useEffect(() => {
    const checkConnection = async () => {
      try {
        const response = await fetch("/api/db-status");
        const data = await response.json();

        if (data.connected) {
          console.log("✅ Database connected:", data.message);
          setStatus("connected");
          toast({
            title: "Database Connected",
            description: "Successfully connected to MongoDB",
            duration: 3000,
          });
        } else {
          console.error("❌ Database connection error:", data.message);
          setStatus("error");
          toast({
            title: "Database Connection Error",
            description: data.message,
            variant: "destructive",
            duration: 5000,
          });
        }
      } catch (error) {
        console.error("Failed to check database status:", error);
        setStatus("error");
        toast({
          title: "Database Status Check Failed",
          description: "Could not verify database connection",
          variant: "destructive",
          duration: 5000,
        });
      }
    };

    checkConnection();
  }, [toast]);

  return null;
}

export default function CanvasPage() {
  return (
    <ErrorHandler>
      <ReactFlowProvider>
        <main className="flex min-h-screen flex-col bg-slate-50 text-foreground">
          <div className="container mx-auto flex flex-col md:flex-row flex-1 p-6 gap-6">
            {/* Sidebar */}
            <aside className="w-full md:w-1/4 bg-white rounded-xl shadow-lg p-4">
              {/* ...existing LeftSidebar component... */}
              <LeftSidebar />
            </aside>
            {/* Main Canvas Area */}
            <section className="flex-1 flex flex-col bg-white rounded-xl shadow-lg overflow-hidden">
              {/* Navbar Header */}
              <header className="bg-background p-4 border-b border-border">
                <Navbar />
              </header>
              {/* Canvas */}
              <div className="flex-1 p-4">
                <ContextTree />
              </div>
            </section>
          </div>
          {/* Status and Toast */}
          <DatabaseStatus />
          <Toaster />
        </main>
      </ReactFlowProvider>
    </ErrorHandler>
  );
}
