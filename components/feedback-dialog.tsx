"use client";

import { useMemo, useState } from "react";
import { MessageSquareQuote, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

interface FeedbackDialogProps {
  children?: React.ReactNode;
  defaultContext?: string;
}

const FEEDBACK_LABELS: Record<string, string> = {
  bug: "Bug report",
  idea: "Product idea",
  ux: "UX feedback",
  general: "General feedback",
};

export function FeedbackDialog({
  children,
  defaultContext,
}: FeedbackDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [type, setType] = useState("ux");
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");

  const contextNote = useMemo(() => {
    const parts = [defaultContext, typeof window !== "undefined" ? window.location.pathname : null]
      .filter(Boolean)
      .join(" · ");
    return parts ? `Context: ${parts}` : "";
  }, [defaultContext, isOpen]);

  const reset = () => {
    setType("ux");
    setTitle("");
    setDetails("");
  };

  const handleSubmit = async () => {
    if (!user?.email) {
      toast({
        title: "Sign in required",
        description: "Please sign in before sending feedback.",
        variant: "destructive",
      });
      return;
    }

    if (title.trim().length < 4 || details.trim().length < 10) {
      toast({
        title: "More detail helps",
        description: "Add a short title and a more complete description.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: `[${FEEDBACK_LABELS[type]}] ${title.trim()}`,
          description: `${details.trim()}${contextNote ? `\n\n${contextNote}` : ""}`,
          browserInfo:
            typeof navigator !== "undefined" ? navigator.userAgent : "",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save feedback");
      }

      toast({
        title: "Feedback received",
        description: "Thanks — this has been stored for review.",
      });
      reset();
      setIsOpen(false);
    } catch (error) {
      console.error("Error submitting feedback:", error);
      toast({
        title: "Feedback failed",
        description: "We couldn't store your feedback. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button
            type="button"
            variant="outline"
            className="gap-2 rounded-xl border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <MessageSquareQuote className="h-4 w-4 text-indigo-500" />
            Feedback
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-[calc(100%-2rem)] rounded-3xl border border-slate-200 bg-white p-0 shadow-[0_30px_80px_-30px_rgba(15,23,42,0.25)] sm:max-w-xl">
        <div className="border-b border-slate-200 px-6 py-5">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-950">
              <MessageSquareQuote className="h-5 w-5 text-indigo-500" />
              Send feedback
            </DialogTitle>
            <DialogDescription className="text-slate-500">
              Tell us what felt confusing, broken, or worth improving.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="space-y-5 px-6 py-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-800">
              Feedback type
            </label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="h-11 w-full rounded-xl border-slate-200 bg-slate-50/70">
                <SelectValue placeholder="Choose a feedback type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ux">UX feedback</SelectItem>
                <SelectItem value="bug">Bug report</SelectItem>
                <SelectItem value="idea">Product idea</SelectItem>
                <SelectItem value="general">General feedback</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-800">
              Short title
            </label>
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="What should we know?"
              className="h-11 rounded-xl border-slate-200 bg-slate-50/70"
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-800">
              Details
            </label>
            <Textarea
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              placeholder="What happened, what felt off, or what would make this better?"
              className="min-h-[150px] rounded-2xl border-slate-200 bg-slate-50/70"
              maxLength={1000}
            />
          </div>

          {contextNote ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-500">
              {contextNote}
            </div>
          ) : null}
        </div>

        <DialogFooter className="border-t border-slate-200 px-6 py-4 sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setIsOpen(false)}
            disabled={isSubmitting}
            className="rounded-xl text-slate-600 hover:bg-slate-100"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="rounded-xl bg-slate-900 text-white hover:bg-slate-800"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending
              </>
            ) : (
              "Send feedback"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
