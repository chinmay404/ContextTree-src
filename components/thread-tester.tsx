"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { useThread } from "@/components/thread-provider";
import { useToast } from "@/components/ui/use-toast";
import { createNewThread } from "@/app/actions/threads";

export default function ThreadTester() {
  const { threads, currentThread, selectThread, refreshThreads } = useThread();
  const { toast } = useToast();

  const handleCreateTestThread = async () => {
    try {
      const testThread = await createNewThread(
        "Test Thread",
        "A test thread for demo"
      );
      await refreshThreads();
      toast({
        title: "Success",
        description: "Test thread created successfully",
      });
    } catch (error) {
      console.error("Error creating test thread:", error);
      toast({
        title: "Error",
        description: "Failed to create test thread",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="p-4 bg-white border rounded-lg shadow-sm">
      <h3 className="text-lg font-semibold mb-4">Thread Management Test</h3>

      <div className="space-y-4">
        <div>
          <Button onClick={handleCreateTestThread}>Create Test Thread</Button>
        </div>

        <div>
          <h4 className="font-medium mb-2">Current Thread:</h4>
          <p className="text-sm text-gray-600">
            {currentThread ? currentThread.title : "None selected"}
          </p>
        </div>

        <div>
          <h4 className="font-medium mb-2">
            Available Threads ({threads.length}):
          </h4>
          <div className="space-y-2">
            {threads.map((thread) => (
              <div
                key={thread.threadId}
                className={`p-2 border rounded cursor-pointer ${
                  currentThread?.threadId === thread.threadId
                    ? "bg-blue-50 border-blue-300"
                    : "hover:bg-gray-50"
                }`}
                onClick={() => selectThread(thread.threadId)}
              >
                <div className="font-medium">{thread.title}</div>
                <div className="text-xs text-gray-500">
                  Created: {new Date(thread.createdAt).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
