"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, useInView } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Zap,
  ArrowRight,
  Eye,
  GitBranch,
  Play,
  CheckCircle,
  AlertTriangle,
  Route,
  Layers,
  Monitor,
  Network,
  Star,
} from "lucide-react";

// Enhanced Interactive Node Component
const EnhancedNode = ({ 
  type, 
  label, 
  active = false, 
  delay = 0,
}: { 
  type: 'user' | 'ai' | 'branch' | 'context' | 'thread';
  label: string;
  active?: boolean;
  delay?: number;
}) => {
  const getNodeStyle = () => {
    switch (type) {
      case 'user':
        return 'bg-blue-50 border-blue-200 text-blue-900';
      case 'ai':
        return 'bg-emerald-50 border-emerald-200 text-emerald-900';
      case 'branch':
        return 'bg-amber-50 border-amber-200 text-amber-900';
      case 'context':
        return 'bg-purple-50 border-purple-200 text-purple-900';
      case 'thread':
        return 'bg-indigo-50 border-indigo-200 text-indigo-900';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-900';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className={`
        relative px-4 py-3 rounded-xl border-2 text-sm font-medium
        ${getNodeStyle()}
        ${active ? 'ring-2 ring-blue-300 ring-opacity-50' : ''}
        shadow-sm hover:shadow-md transition-all duration-300
      `}
    >
      {label}
      {active && (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full animate-pulse" />
      )}
    </motion.div>
  );
};

// Animated Branch Line Component
const BranchLine = ({ delay = 0 }: { delay?: number }) => {
  return (
    <motion.div
      initial={{ scaleX: 0 }}
      animate={{ scaleX: 1 }}
      transition={{ duration: 0.8, delay }}
      className="h-0.5 bg-blue-300 origin-left"
    />
  );
};

export function LandingPage() {
  const router = useRouter();

  const features = [
    {
      icon: <Eye className="h-6 w-6" />,
      title: "Visual Node-Based Canvas",
      description:
        "Drag, drop, and connect nodes for human + AI conversations. See your entire flow at a glance.",
    },
    {
      icon: <Route className="h-6 w-6" />,
      title: "Context Linking",
      description:
        "Each branch inherits only the relevant context, keeping conversations clear and preventing drift.",
    },
    {
      icon: <Network className="h-6 w-6" />,
      title: "Multiple LLMs per Graph",
      description:
        "Compare GPT, Claude, or local models side by side within the same conversation flow.",
    },
    {
      icon: <GitBranch className="h-6 w-6" />,
      title: "Branching & Checkpoints",
      description:
        "Fork flows, experiment safely, and roll back to milestones without losing progress.",
    },
    {
      icon: <Play className="h-6 w-6" />,
      title: "Simulation & Debugging Tools",
      description:
        "Step through conversations, monitor tokens, latency, and costs at every node.",
    },
    {
      icon: <Monitor className="h-6 w-6" />,
      title: "Real-time Analytics",
      description:
        "Monitor performance, track conversation success rates, and optimize your flows with data.",
    },
  ];

  const handleGetStarted = () => {
    router.push("/auth/signin");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-50">
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
              variant="outline"
              className="border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Sign In
            </Button>
          </motion.div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="px-6 py-24">
        <div className="max-w-6xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <Badge
              variant="outline"
              className="mb-6 border-gray-300 text-gray-700 bg-white"
            >
              Beta • Join the Waitlist
            </Badge>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-light text-gray-900 mb-6 leading-tight">
              Conversations with AI,<br />
              <span className="text-gray-600">
                Made Transparent and Controllable
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 mb-12 max-w-4xl mx-auto font-light leading-relaxed">
              Build AI conversations you can actually understand, debug, and control. 
              Map every interaction on a visual canvas, branch safely, and never lose context again.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="flex flex-col sm:flex-row gap-4 justify-center mb-16"
          >
            <Button
              onClick={handleGetStarted}
              size="lg"
              className="bg-gray-900 hover:bg-gray-800 text-white border-0 px-8 py-3 rounded-lg font-medium shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
            >
              Join Waitlist
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 px-8 py-3 rounded-lg font-medium transition-all duration-300"
            >
              View Demo
            </Button>
          </motion.div>

          {/* Interactive Conversation Branching Demo */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="mt-16 max-w-5xl mx-auto"
          >
            <div className="bg-white rounded-3xl p-8 border border-gray-200 shadow-lg">
              <div className="text-center mb-8">
                <h3 className="text-xl font-medium text-gray-900 mb-2">
                  Live Conversation with Thread Branching
                </h3>
                <p className="text-sm text-gray-600">
                  Watch how new messages create explorable conversation threads
                </p>
              </div>
              
              {/* Main Conversation Flow */}
              <div className="space-y-6">
                {/* Initial Exchange */}
                <div className="flex justify-center">
                  <div className="space-y-4 w-full max-w-md">
                    <EnhancedNode type="user" label="User: How does pricing work?" delay={0.8} />
                    <div className="flex justify-center">
                      <BranchLine delay={1.2} />
                    </div>
                    <EnhancedNode type="ai" label="AI: We have 3 tiers: Starter, Pro, Enterprise" delay={1.6} />
                  </div>
                </div>

                {/* Branching Point */}
                <div className="relative">
                  <div className="flex justify-center mb-4">
                    <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse" />
                  </div>
                  
                  {/* New Message Creates Branches */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 2.0 }}
                    className="text-center mb-6"
                  >
                    <div className="inline-block bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-sm text-amber-800">
                      <span className="font-medium">New Message:</span> "What about enterprise features?"
                    </div>
                  </motion.div>

                  {/* Three Branching Paths */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Original Thread Continues */}
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 2.4 }}
                      className="space-y-4"
                    >
                      <div className="text-center mb-3">
                        <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">
                          Thread A: Pricing Details
                        </span>
                      </div>
                      <EnhancedNode type="thread" label="Continue: Starter is $29/mo..." />
                      <div className="flex justify-center">
                        <BranchLine delay={2.8} />
                      </div>
                      <EnhancedNode type="context" label="Context: Basic pricing info" />
                    </motion.div>

                    {/* New Enterprise Thread */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 2.6 }}
                      className="space-y-4"
                    >
                      <div className="text-center mb-3">
                        <span className="text-xs font-medium text-indigo-600 bg-indigo-100 px-2 py-1 rounded">
                          Thread B: Enterprise Focus
                        </span>
                      </div>
                      <EnhancedNode type="thread" label="New: Enterprise includes..." active />
                      <div className="flex justify-center">
                        <BranchLine delay={3.0} />
                      </div>
                      <EnhancedNode type="context" label="Context: Enterprise features loaded" />
                    </motion.div>

                    {/* Alternative Response Thread */}
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 2.8 }}
                      className="space-y-4"
                    >
                      <div className="text-center mb-3">
                        <span className="text-xs font-medium text-purple-600 bg-purple-100 px-2 py-1 rounded">
                          Thread C: Comparison
                        </span>
                      </div>
                      <EnhancedNode type="thread" label="Compare: Let me show you..." />
                      <div className="flex justify-center">
                        <BranchLine delay={3.2} />
                      </div>
                      <EnhancedNode type="context" label="Context: Comparison data" />
                    </motion.div>
                  </div>
                </div>

                {/* Key Benefits */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 3.6 }}
                  className="mt-8 pt-6 border-t border-gray-100"
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                    <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
                      <div className="w-2 h-2 bg-blue-400 rounded-full" />
                      <span>Each thread inherits only relevant context</span>
                    </div>
                    <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
                      <div className="w-2 h-2 bg-emerald-400 rounded-full" />
                      <span>No conversation drift between threads</span>
                    </div>
                    <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
                      <div className="w-2 h-2 bg-purple-400 rounded-full" />
                      <span>Explore multiple conversation paths</span>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
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
              Key Features
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto font-light">
              Everything you need to build transparent, controllable AI
              conversations.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const colorMap = [
                { bg: 'bg-blue-100', text: 'text-blue-600', hover: 'group-hover:bg-blue-600' },
                { bg: 'bg-emerald-100', text: 'text-emerald-600', hover: 'group-hover:bg-emerald-600' },
                { bg: 'bg-purple-100', text: 'text-purple-600', hover: 'group-hover:bg-purple-600' },
                { bg: 'bg-amber-100', text: 'text-amber-600', hover: 'group-hover:bg-amber-600' },
                { bg: 'bg-rose-100', text: 'text-rose-600', hover: 'group-hover:bg-rose-600' },
                { bg: 'bg-indigo-100', text: 'text-indigo-600', hover: 'group-hover:bg-indigo-600' },
              ];
              const colors = colorMap[index % colorMap.length];
              
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="group"
                >
                  <Card className="bg-white border-gray-200 hover:shadow-lg hover:border-gray-300 transition-all duration-300 h-full">
                    <CardContent className="p-8">
                      <div className={`w-12 h-12 ${colors.bg} rounded-xl flex items-center justify-center mb-6 ${colors.text} ${colors.hover} group-hover:text-white transition-all duration-300`}>
                        {feature.icon}
                      </div>
                      <h3 className="text-xl font-medium mb-3 text-gray-900">
                        {feature.title}
                      </h3>
                      <p className="text-gray-600 font-light leading-relaxed">
                        {feature.description}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-12 bg-white border-t border-gray-100">
        <div className="max-w-6xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h3 className="text-2xl font-medium text-gray-900 mb-4">
              Ready to make AI conversations transparent?
            </h3>
            <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
              Join our beta program and be among the first to experience truly controllable AI conversations.
            </p>
            <Button
              onClick={handleGetStarted}
              size="lg"
              className="bg-gray-900 hover:bg-gray-800 text-white px-8 py-3 rounded-lg font-medium shadow-lg hover:shadow-xl transition-all duration-300"
            >
              Join Beta Waitlist
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <div className="mt-8 pt-8 border-t border-gray-100">
              <p className="text-sm text-gray-500">
                © 2024 ContextTree. Making AI conversations transparent and controllable.
              </p>
            </div>
          </motion.div>
        </div>
      </footer>
    </div>
  );
}
