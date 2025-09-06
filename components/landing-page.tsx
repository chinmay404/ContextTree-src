"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, useScroll, useTransform, useInView } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Zap,
  Brain,
  Network,
  ArrowRight,
  BarChart3,
  Shield,
  Globe,
  Workflow,
  Star,
  MessageSquare,
  Layers,
} from "lucide-react";

// Animated Counter Component
const AnimatedCounter = ({
  from,
  to,
  duration = 2,
}: {
  from: number;
  to: number;
  duration?: number;
}) => {
  const nodeRef = useRef<HTMLSpanElement>(null);
  const inView = useInView(nodeRef);

  useEffect(() => {
    if (!inView) return;

    const node = nodeRef.current;
    if (!node) return;

    const increment = (to - from) / (duration * 60); // 60fps
    let current = from;

    const timer = setInterval(() => {
      current += increment;
      if (current >= to) {
        current = to;
        clearInterval(timer);
      }
      node.textContent = Math.floor(current).toLocaleString();
    }, 1000 / 60);

    return () => clearInterval(timer);
  }, [inView, from, to, duration]);

  return <span ref={nodeRef}>{from}</span>;
};

export function LandingPage() {
  const router = useRouter();

  const features = [
    {
      icon: <Brain className="h-6 w-6" />,
      title: "AI-Powered Flow Builder",
      description:
        "Create intelligent conversation flows with our advanced AI assistant that understands context and user intent.",
    },
    {
      icon: <Network className="h-6 w-6" />,
      title: "Visual Node Editor",
      description:
        "Drag-and-drop interface for building complex conversational trees with real-time preview and testing.",
    },
    {
      icon: <Zap className="h-6 w-6" />,
      title: "Real-time Testing",
      description:
        "Test your conversations instantly with our built-in simulator and get immediate feedback on flow logic.",
    },
    {
      icon: <BarChart3 className="h-6 w-6" />,
      title: "Advanced Analytics",
      description:
        "Track user interactions, conversion rates, and optimize your conversational experiences with detailed insights.",
    },
    {
      icon: <Shield className="h-6 w-6" />,
      title: "Enterprise Security",
      description:
        "Bank-grade security with end-to-end encryption, compliance features, and advanced user management.",
    },
    {
      icon: <Globe className="h-6 w-6" />,
      title: "Multi-Channel Deploy",
      description:
        "Deploy your conversational AI across multiple platforms with one-click integration and seamless scaling.",
    },
  ];

  const handleGetStarted = () => {
    router.push("/auth/signin");
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="px-6 py-6 border-b border-gray-100">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="text-2xl font-semibold text-gray-900"
          >
            ContextTree
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <Button 
              onClick={handleGetStarted}
              className="bg-gray-900 hover:bg-gray-800 text-white border-0"
            >
              Get Started
            </Button>
          </motion.div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="px-6 py-24">
        <div className="max-w-5xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="space-y-8"
          >
            <Badge className="bg-gray-100 text-gray-600 border-gray-200 text-sm px-3 py-1">
              AI-Powered Conversation Builder
            </Badge>
            
            <h1 className="text-5xl md:text-7xl font-light text-gray-900 leading-tight">
              Build Better
              <br />
              <span className="font-normal">Conversations</span>
            </h1>
            
            <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed font-light">
              Create intelligent, context-aware conversation flows with our visual editor. 
              Design, test, and deploy conversational AI that understands your users.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
              <Button 
                onClick={handleGetStarted}
                size="lg" 
                className="bg-gray-900 hover:bg-gray-800 text-white border-0 px-8 py-3"
              >
                Start Building
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button 
                variant="outline" 
                size="lg"
                className="border-gray-300 text-gray-700 hover:bg-gray-50 px-8 py-3"
              >
                View Demo
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="px-6 py-16 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="grid grid-cols-2 md:grid-cols-4 gap-8"
          >
            {[
              { number: 10000, suffix: "+", label: "Conversations Created" },
              { number: 95, suffix: "%", label: "User Satisfaction" },
              { number: 500, suffix: "+", label: "Enterprises Served" },
              { number: 24, suffix: "/7", label: "Support Available" },
            ].map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl md:text-4xl font-light text-gray-900 mb-2">
                  <AnimatedCounter from={0} to={stat.number} />
                  {stat.suffix}
                </div>
                <div className="text-gray-600 text-sm">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="px-6 py-24">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-light text-gray-900 mb-4">
              Powerful Features
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto font-light">
              Everything you need to create, test, and deploy intelligent conversational experiences.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="group"
              >
                <Card className="bg-white border-gray-200 hover:shadow-md transition-all duration-300 h-full">
                  <CardContent className="p-8">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mb-6 text-gray-700 group-hover:bg-gray-900 group-hover:text-white transition-all duration-300">
                      {feature.icon}
                    </div>
                    <h3 className="text-xl font-medium mb-3 text-gray-900">
                      {feature.title}
                    </h3>
                    <p className="text-gray-600 leading-relaxed font-light">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="px-6 py-24 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-light text-gray-900 mb-4">
              How It Works
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto font-light">
              Create professional conversation flows in three simple steps.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              {
                step: "01",
                title: "Design Your Flow",
                description: "Use our intuitive visual editor to create conversation paths, add AI responses, and set up logic branches.",
                icon: <Workflow className="h-6 w-6" />,
              },
              {
                step: "02", 
                title: "Test & Refine",
                description: "Run real-time simulations to test user interactions and optimize your conversation logic.",
                icon: <MessageSquare className="h-6 w-6" />,
              },
              {
                step: "03",
                title: "Deploy Anywhere",
                description: "Launch your conversation flows across multiple platforms with seamless integration.",
                icon: <Layers className="h-6 w-6" />,
              },
            ].map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <div className="relative mb-8">
                  <div className="w-16 h-16 bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-4 text-white">
                    {step.icon}
                  </div>
                  <div className="absolute -top-2 -right-6 w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center text-xs font-medium text-gray-700">
                    {step.step}
                  </div>
                </div>
                <h3 className="text-xl font-medium mb-4 text-gray-900">
                  {step.title}
                </h3>
                <p className="text-gray-600 leading-relaxed font-light">
                  {step.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="px-6 py-24">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-light text-gray-900 mb-4">
              What Our Users Say
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                name: "Sarah Johnson",
                role: "Product Manager",
                company: "TechCorp",
                content: "ContextTree transformed how we handle customer interactions. The visual flow builder is incredibly intuitive.",
                rating: 5,
              },
              {
                name: "Michael Chen",
                role: "AI Engineer", 
                company: "StartupX",
                content: "The real-time testing feature saved us countless hours. We can iterate quickly and deploy with confidence.",
                rating: 5,
              },
              {
                name: "Emily Rodriguez",
                role: "Customer Success",
                company: "Enterprise Inc",
                content: "Our conversation completion rates improved by 40% after implementing ContextTree's intelligent flows.",
                rating: 5,
              },
            ].map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <Card className="bg-white border-gray-200 h-full">
                  <CardContent className="p-8">
                    <div className="flex mb-4">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="h-4 w-4 text-gray-400 fill-current" />
                      ))}
                    </div>
                    <p className="text-gray-700 mb-6 leading-relaxed font-light italic">
                      "{testimonial.content}"
                    </p>
                    <div>
                      <div className="font-medium text-gray-900">{testimonial.name}</div>
                      <div className="text-sm text-gray-600">
                        {testimonial.role} at {testimonial.company}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-6 py-24 bg-gray-50">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="bg-white border border-gray-200 rounded-2xl p-12"
          >
            <h2 className="text-4xl md:text-5xl font-light mb-6 text-gray-900">
              Ready to Transform 
              <br />
              Your Conversations?
            </h2>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto font-light">
              Join thousands of teams building better conversational experiences with ContextTree.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                onClick={handleGetStarted}
                size="lg" 
                className="bg-gray-900 hover:bg-gray-800 text-white border-0 px-8 py-3"
              >
                Start Building Today
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button 
                variant="outline" 
                size="lg"
                className="border-gray-300 text-gray-700 hover:bg-gray-50 px-8 py-3"
              >
                Schedule Demo
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-16 px-6">
        <div className="max-w-6xl mx-auto text-center">
          <div className="text-2xl font-semibold text-gray-900 mb-4">
            ContextTree
          </div>
          <p className="text-gray-600 mb-8 font-light">
            Building the future of conversational AI, one flow at a time.
          </p>
          <div className="text-gray-500 text-sm">
            © 2025 ContextTree. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
