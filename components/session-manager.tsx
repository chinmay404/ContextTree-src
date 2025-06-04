"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { getUserActiveSessions } from "@/lib/session-manager";
import type { CanvasSession } from "@/lib/models/canvas";
import { formatDistanceToNow } from "date-fns";

interface SessionManagerProps {
  currentSessionId: string | null;
  onForceSync: () => void;
}

export default function SessionManager({
  currentSessionId,
  onForceSync,
}: SessionManagerProps) {
  const [sessions, setSessions] = useState<CanvasSession[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [loading, setLoading] = useState(false);

  // Check for active sessions periodically
  useEffect(() => {
    const checkSessions = async () => {
      setLoading(true);
      try {
        const activeSessions = await getUserActiveSessions();

        // Filter out current session
        const otherSessions = activeSessions.filter(
          (session) => session.id !== currentSessionId
        );

        setSessions(otherSessions);

        // Show dialog if there are other active sessions
        if (otherSessions.length > 0) {
          setShowDialog(true);
        }
      } catch (error) {
        console.error("Error checking sessions:", error);
      } finally {
        setLoading(false);
      }
    };

    // Check immediately on component mount
    checkSessions();

    // Then check every 5 minutes
    const interval = setInterval(checkSessions, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [currentSessionId]);

  const handleForceSync = () => {
    onForceSync();
    setShowDialog(false);
  };

  return (
    <Dialog open={showDialog} onOpenChange={setShowDialog}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Multiple Active Sessions Detected</DialogTitle>
          <DialogDescription>
            You have other active sessions that might be editing this canvas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 my-4">
          <h3 className="font-medium">Active sessions:</h3>
          <ul className="space-y-2">
            {sessions.map((session) => (
              <li key={session.id} className="p-2 bg-gray-50 rounded-md">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium">
                      {session.deviceInfo
                        ? session.deviceInfo.substring(0, 30) + "..."
                        : "Unknown device"}
                    </p>
                    <p className="text-xs text-gray-500">
                      Last active:{" "}
                      {formatDistanceToNow(new Date(session.lastActivity))} ago
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={() => setShowDialog(false)}>
            Ignore
          </Button>
          <Button onClick={handleForceSync}>Sync Changes</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
