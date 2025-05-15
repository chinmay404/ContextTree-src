import { AlertTriangle, MessageSquare, GitBranch, HelpCircle } from "lucide-react"
import AnimateInView from "./animate-in-view"

export default function ProblemSection() {
  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div>
            <AnimateInView animation="fadeRight">
              <h2 className="text-2xl md:text-3xl font-semibold tracking-tight mb-8">
                Why Traditional Chat UIs Fall Short
              </h2>
            </AnimateInView>

            <div className="space-y-8">
              <AnimateInView animation="fadeUp" delay={0.1}>
                <div className="flex gap-4 group" role="group" aria-labelledby="pp1-title">
                  <div className="bg-primary/10 p-3 rounded-lg h-fit">
                    <MessageSquare className="h-6 w-6 text-primary transition-transform group-hover:scale-105" />
                  </div>
                  <div>
                    <h3 id="pp1-title" className="text-base font-semibold mb-1">
                      Cluttered Conversations
                    </h3>
                    <p className="text-muted-foreground">
                      Side discussions mix into the main thread, making it hard to follow any single line of thought.
                    </p>
                  </div>
                </div>
              </AnimateInView>

              <AnimateInView animation="fadeUp" delay={0.2}>
                <div className="flex gap-4 group" role="group" aria-labelledby="pp2-title">
                  <div className="bg-orange-500/10 p-3 rounded-lg h-fit">
                    <GitBranch className="h-6 w-6 text-orange-500 transition-transform group-hover:scale-105" />
                  </div>
                  <div>
                    <h3 id="pp2-title" className="text-base font-semibold mb-1">
                      Lost Context
                    </h3>
                    <p className="text-muted-foreground">
                      Users struggle to return to the main topic after deep dives, disrupting their workflow and memory.
                    </p>
                  </div>
                </div>
              </AnimateInView>

              <AnimateInView animation="fadeUp" delay={0.3}>
                <div className="flex gap-4 group" role="group" aria-labelledby="pp3-title">
                  <div className="bg-blue-500/10 p-3 rounded-lg h-fit">
                    <HelpCircle className="h-6 w-6 text-blue-500 transition-transform group-hover:scale-105" />
                  </div>
                  <div>
                    <h3 id="pp3-title" className="text-base font-semibold mb-1">
                      Disrupted Learning
                    </h3>
                    <p className="text-muted-foreground">
                      Complex topics become harder to study when key threads are buried under side-conversations.
                    </p>
                  </div>
                </div>
              </AnimateInView>
            </div>
          </div>

          <AnimateInView animation="fadeLeft">
            <div className="relative">
              <div className="bg-muted rounded-xl p-6 shadow-md relative">
                <div className="relative h-[350px] md:h-[400px] w-full bg-background rounded-lg border border-border overflow-hidden">
                  {/* Problem Diagram */}
                  <div className="absolute inset-0 p-4">
                    {/* Chat UI mockup */}
                    <div className="h-full flex flex-col border border-border rounded-md overflow-hidden">
                      <div className="bg-muted/50 p-3 border-b border-border flex items-center">
                        <div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
                        <div className="w-3 h-3 rounded-full bg-yellow-500 mr-2"></div>
                        <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
                        <div className="text-xs font-medium ml-2">Traditional Chat Interface</div>
                      </div>

                      <div className="flex-1 overflow-y-auto p-4 space-y-3 relative">
                        {/* Main conversation */}
                        <div className="flex justify-start">
                          <div className="bg-muted p-2 rounded-lg max-w-[70%] text-xs">
                            Can you explain how quantum computing works?
                          </div>
                        </div>

                        <div className="flex justify-end">
                          <div className="bg-primary/10 p-2 rounded-lg max-w-[70%] text-xs">
                            Quantum computing uses quantum bits or qubits which can exist in multiple states...
                          </div>
                        </div>

                        {/* Tangent 1 - with red circle */}
                        <div className="flex justify-start relative">
                          <div className="bg-muted p-2 rounded-lg max-w-[70%] text-xs">
                            Wait, what's the difference between qubits and regular bits?
                          </div>
                          <div className="absolute -right-2 -top-2 w-6 h-6 rounded-full border-2 border-red-500 flex items-center justify-center text-[10px] font-bold text-red-500">
                            1
                          </div>
                        </div>

                        <div className="flex justify-end">
                          <div className="bg-primary/10 p-2 rounded-lg max-w-[70%] text-xs">
                            Regular bits can be either 0 or 1, while qubits can be in a superposition...
                          </div>
                        </div>

                        {/* Back to main topic */}
                        <div className="flex justify-start">
                          <div className="bg-muted p-2 rounded-lg max-w-[70%] text-xs">
                            Going back to quantum computing, what are some practical applications?
                          </div>
                        </div>

                        {/* Tangent 2 - with red circle */}
                        <div className="flex justify-start relative">
                          <div className="bg-muted p-2 rounded-lg max-w-[70%] text-xs">
                            Actually, who invented quantum computing?
                          </div>
                          <div className="absolute -right-2 -top-2 w-6 h-6 rounded-full border-2 border-red-500 flex items-center justify-center text-[10px] font-bold text-red-500">
                            2
                          </div>
                        </div>

                        <div className="flex justify-end">
                          <div className="bg-primary/10 p-2 rounded-lg max-w-[70%] text-xs">
                            The concept was proposed by Richard Feynman in 1982...
                          </div>
                        </div>

                        {/* Tangent 3 - with red circle */}
                        <div className="flex justify-start relative">
                          <div className="bg-muted p-2 rounded-lg max-w-[70%] text-xs">
                            What other contributions did Feynman make to physics?
                          </div>
                          <div className="absolute -right-2 -top-2 w-6 h-6 rounded-full border-2 border-red-500 flex items-center justify-center text-[10px] font-bold text-red-500">
                            3
                          </div>
                        </div>

                        {/* Confusion indicator */}
                        <div className="absolute bottom-4 right-4 bg-red-500/10 border border-red-500/30 rounded-lg p-2 text-xs text-red-500 flex items-center">
                          <HelpCircle className="h-3 w-3 mr-1" />
                          Wait, what was I asking about?
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Decorative elements */}
              <div className="absolute -z-10 top-1/3 left-1/4 w-48 h-48 bg-red-500/5 rounded-full blur-3xl"></div>
              <div className="absolute -z-10 bottom-1/4 right-1/4 w-64 h-64 bg-orange-500/5 rounded-full blur-3xl"></div>
            </div>
          </AnimateInView>
        </div>

        {/* Impact Callout */}
        <AnimateInView animation="fadeUp" className="mt-16">
          <div className="bg-muted/50 rounded-lg p-6 text-center max-w-3xl mx-auto">
            <div className="flex items-center justify-center gap-2 mb-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              <p className="text-lg font-semibold">
                75% of users report losing track of their original questions after branching off in a chat.
              </p>
            </div>
            <p className="text-muted-foreground">
              ContextTree helps you maintain focus while exploring multiple conversation threads.
            </p>
          </div>
        </AnimateInView>
      </div>
    </section>
  )
}
