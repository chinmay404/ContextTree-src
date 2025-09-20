"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Mail, User, CheckCircle, Loader2 } from "lucide-react";
import LiquidEther from "@/components/LiquidEther";

interface FormData {
  name: string;
  email: string;
}

interface FormErrors {
  name?: string;
  email?: string;
  submit?: string;
}

export default function WaitlistPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>({ name: "", email: "" });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    } else if (formData.name.trim().length < 2) {
      newErrors.name = "Name must be at least 2 characters";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear errors when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);
    setErrors({});

    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to join waitlist");
      }

      setIsSubmitted(true);
    } catch (error) {
      console.error("Waitlist submission error:", error);
      setErrors({
        submit:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-slate-50 to-slate-100">
      {/* LiquidEther Background */}
      <div className="absolute inset-0 z-0">
        <LiquidEther
          colors={["#F8FAFC", "#F1F5F9", "#E2E8F0"]}
          mouseForce={3}
          cursorSize={60}
          isViscous={true}
          viscous={50}
          iterationsViscous={16}
          iterationsPoisson={16}
          resolution={0.2}
          isBounce={false}
          autoDemo={true}
          autoSpeed={0.1}
          autoIntensity={0.3}
          takeoverDuration={1.0}
          autoResumeDelay={6000}
          autoRampDuration={2.0}
          style={{ width: "100%", height: "100%" }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="p-6 flex items-center justify-between"
        >
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-800 transition-colors group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span className="font-medium">Back to Home</span>
          </button>

          {/* Tree Logo */}
          <div className="flex items-center">
            <div className="w-8 h-8 text-slate-600">
              <svg
                width="32"
                height="32"
                viewBox="0 0 100 100"
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* Root node (top) */}
                <rect
                  x="35"
                  y="10"
                  width="30"
                  height="20"
                  rx="4"
                  ry="4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                />

                {/* Connection lines */}
                <path
                  d="M50 30 L50 45 M35 55 L50 45 L65 55"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                />

                {/* Left child node */}
                <rect
                  x="15"
                  y="65"
                  width="25"
                  height="20"
                  rx="4"
                  ry="4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                />

                {/* Right child node */}
                <rect
                  x="60"
                  y="65"
                  width="25"
                  height="20"
                  rx="4"
                  ry="4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                />
              </svg>
            </div>
          </div>
        </motion.div>

        {/* Main Content */}
        <div className="flex-1 flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="w-full max-w-md"
          >
            <AnimatePresence mode="wait">
              {!isSubmitted ? (
                <motion.div
                  key="form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                  className="backdrop-blur-md bg-white/20 border border-white/30 rounded-2xl p-8 shadow-2xl"
                >
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                    className="text-center mb-8"
                  >
                    <h1 className="text-3xl font-bold text-slate-800 mb-2">
                      Join the Waitlist
                    </h1>
                    <p className="text-slate-600">
                      Be among the first to experience the future of AI
                      conversation design
                    </p>
                  </motion.div>

                  <form onSubmit={handleSubmit} className="space-y-6">
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4, delay: 0.4 }}
                    >
                      <Label
                        htmlFor="name"
                        className="text-slate-700 font-medium"
                      >
                        Full Name
                      </Label>
                      <div className="relative mt-2">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <Input
                          id="name"
                          type="text"
                          value={formData.name}
                          onChange={(e) =>
                            handleInputChange("name", e.target.value)
                          }
                          placeholder="Enter your full name"
                          className={`pl-10 h-12 bg-white/30 border-white/40 focus:border-white/60 backdrop-blur-sm ${
                            errors.name
                              ? "border-red-300 focus:border-red-400"
                              : ""
                          }`}
                          disabled={isSubmitting}
                        />
                      </div>
                      {errors.name && (
                        <motion.p
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-red-600 text-sm mt-1"
                        >
                          {errors.name}
                        </motion.p>
                      )}
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4, delay: 0.5 }}
                    >
                      <Label
                        htmlFor="email"
                        className="text-slate-700 font-medium"
                      >
                        Email Address
                      </Label>
                      <div className="relative mt-2">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) =>
                            handleInputChange("email", e.target.value)
                          }
                          placeholder="Enter your email address"
                          className={`pl-10 h-12 bg-white/30 border-white/40 focus:border-white/60 backdrop-blur-sm ${
                            errors.email
                              ? "border-red-300 focus:border-red-400"
                              : ""
                          }`}
                          disabled={isSubmitting}
                        />
                      </div>
                      {errors.email && (
                        <motion.p
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-red-600 text-sm mt-1"
                        >
                          {errors.email}
                        </motion.p>
                      )}
                    </motion.div>

                    {errors.submit && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="p-4 bg-red-50/80 backdrop-blur-sm border border-red-200/50 rounded-xl"
                      >
                        <p className="text-red-700 text-sm text-center">
                          {errors.submit}
                        </p>
                      </motion.div>
                    )}

                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.6 }}
                    >
                      <Button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full h-12 bg-slate-800 hover:bg-slate-900 text-white font-medium rounded-xl transition-all duration-200 group"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin mr-2" />
                            Joining Waitlist...
                          </>
                        ) : (
                          <>
                            Join Waitlist
                            <ArrowLeft className="w-5 h-5 ml-2 rotate-180 group-hover:translate-x-1 transition-transform" />
                          </>
                        )}
                      </Button>
                    </motion.div>
                  </form>

                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.6, delay: 0.7 }}
                    className="mt-6 text-xs text-slate-500 text-center"
                  >
                    We'll never share your information. Unsubscribe at any time.
                  </motion.p>
                </motion.div>
              ) : (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.6, type: "spring", bounce: 0.4 }}
                  className="backdrop-blur-md bg-white/20 border border-white/30 rounded-2xl p-8 shadow-2xl text-center"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{
                      duration: 0.6,
                      delay: 0.2,
                      type: "spring",
                      bounce: 0.6,
                    }}
                    className="w-20 h-20 mx-auto mb-6 bg-green-100 rounded-full flex items-center justify-center"
                  >
                    <CheckCircle className="w-10 h-10 text-green-600" />
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.4 }}
                  >
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">
                      Thank You!
                    </h2>
                    <p className="text-slate-600 mb-6">
                      You've been successfully added to our waitlist. We'll
                      notify you as soon as ContextTree is ready!
                    </p>

                    <Button
                      onClick={() => router.push("/")}
                      className="bg-slate-800 hover:bg-slate-900 text-white"
                    >
                      Back to Home
                    </Button>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
