"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useByokStatus } from "@/hooks/use-byok-status";
import type { ByokProvider } from "@/lib/byok";
import { cn } from "@/lib/utils";
import { KeyRound, Loader2, ShieldCheck, Trash2 } from "lucide-react";

type ApiKeySettingsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialProvider?: ByokProvider;
  onKeysChanged?: () => void;
};

const PROVIDER_LABEL: Record<ByokProvider, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
};

export function ApiKeySettingsDialog({
  open,
  onOpenChange,
  initialProvider,
  onKeysChanged,
}: ApiKeySettingsDialogProps) {
  const { statuses, refresh, isLoading } = useByokStatus();
  const { toast } = useToast();
  const [selectedProvider, setSelectedProvider] = useState<ByokProvider>(
    initialProvider || "openai"
  );
  const [draftKeys, setDraftKeys] = useState<Record<ByokProvider, string>>({
    openai: "",
    anthropic: "",
  });
  const [busyProvider, setBusyProvider] = useState<ByokProvider | null>(null);

  useEffect(() => {
    if (initialProvider) {
      setSelectedProvider(initialProvider);
    }
  }, [initialProvider]);

  useEffect(() => {
    if (open) {
      refresh();
    }
  }, [open, refresh]);

  const activeStatus = statuses[selectedProvider];
  const providerTabs = useMemo(
    () => (["openai", "anthropic"] as const).map((provider) => statuses[provider]),
    [statuses]
  );

  const handleSave = async () => {
    const apiKey = draftKeys[selectedProvider].trim();
    if (!apiKey) {
      toast({
        title: "API key required",
        description: `Paste your ${PROVIDER_LABEL[selectedProvider]} key to continue.`,
        variant: "destructive",
      });
      return;
    }

    setBusyProvider(selectedProvider);
    try {
      const response = await fetch("/api/user-api-keys", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          provider: selectedProvider,
          apiKey,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || "Unable to save API key");
      }

      setDraftKeys((current) => ({
        ...current,
        [selectedProvider]: "",
      }));
      await refresh();
      onKeysChanged?.();
      toast({
        title: `${PROVIDER_LABEL[selectedProvider]} key saved`,
        description: "This provider is now unlocked for your account.",
      });
    } catch (error) {
      toast({
        title: "Could not save key",
        description:
          error instanceof Error ? error.message : "Please try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setBusyProvider(null);
    }
  };

  const handleDelete = async () => {
    setBusyProvider(selectedProvider);
    try {
      const response = await fetch("/api/user-api-keys", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          provider: selectedProvider,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || "Unable to remove API key");
      }

      setDraftKeys((current) => ({
        ...current,
        [selectedProvider]: "",
      }));
      await refresh();
      onKeysChanged?.();
      toast({
        title: `${PROVIDER_LABEL[selectedProvider]} key removed`,
        description: "That provider has been locked again for your account.",
      });
    } catch (error) {
      toast({
        title: "Could not remove key",
        description:
          error instanceof Error ? error.message : "Please try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setBusyProvider(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="z-[1400] max-w-2xl rounded-2xl border-slate-200 bg-white shadow-2xl"
        overlayClassName="z-[1390] bg-slate-950/60 backdrop-blur-sm"
      >
        <DialogHeader className="space-y-2 text-left">
          <DialogTitle className="flex items-center gap-2 text-xl text-slate-900">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm">
              <KeyRound className="h-4 w-4" />
            </span>
            Bring Your Own API Keys
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed text-slate-500">
            Claude and GPT stay behind your own provider account. Keys are stored
            encrypted server-side and never sent to the browser after save.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {providerTabs.map((providerStatus) => (
              <button
                key={providerStatus.provider}
                type="button"
                onClick={() => setSelectedProvider(providerStatus.provider)}
                className={cn(
                  "rounded-xl border px-4 py-2 text-left transition-all",
                  selectedProvider === providerStatus.provider
                    ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                    : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-white"
                )}
              >
                <div className="text-sm font-semibold">
                  {PROVIDER_LABEL[providerStatus.provider]}
                </div>
                <div
                  className={cn(
                    "mt-1 text-[11px] uppercase tracking-[0.16em]",
                    selectedProvider === providerStatus.provider
                      ? "text-white/70"
                      : providerStatus.configured
                        ? "text-emerald-600"
                        : "text-slate-400"
                  )}
                >
                  {providerStatus.configured
                    ? providerStatus.keyHint || "Connected"
                    : "Not connected"}
                </div>
              </button>
            ))}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-900">
                  {PROVIDER_LABEL[selectedProvider]} key
                </div>
                <div className="mt-1 text-sm leading-relaxed text-slate-500">
                  {selectedProvider === "openai"
                    ? "Unlock GPT-5 and GPT-5 Mini with your own OpenAI account."
                    : "Unlock Claude Sonnet and Claude Opus with your own Anthropic account."}
                </div>
              </div>

              {activeStatus.configured && (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Connected
                </span>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor={`api-key-${selectedProvider}`} className="text-xs uppercase tracking-[0.14em] text-slate-500">
                Paste new key
              </Label>
              <Input
                id={`api-key-${selectedProvider}`}
                type="password"
                value={draftKeys[selectedProvider]}
                onChange={(event) =>
                  setDraftKeys((current) => ({
                    ...current,
                    [selectedProvider]: event.target.value,
                  }))
                }
                placeholder={
                  selectedProvider === "openai"
                    ? "sk-..."
                    : "sk-ant-..."
                }
                className="h-11 rounded-xl border-slate-200 bg-white"
              />
              <p className="text-xs text-slate-500">
                Save a new key to replace the existing one. Stored keys are shown only
                as masked hints like {activeStatus.keyHint || "••••last4"}.
              </p>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-slate-500">
                {activeStatus.configured && activeStatus.updatedAt
                  ? `Last updated ${new Date(activeStatus.updatedAt).toLocaleString()}`
                  : "No key stored yet for this provider."}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {activeStatus.configured && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleDelete}
                    disabled={busyProvider === selectedProvider}
                    className="rounded-xl border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                  >
                    {busyProvider === selectedProvider ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                    Remove key
                  </Button>
                )}
                <Button
                  type="button"
                  onClick={handleSave}
                  disabled={busyProvider === selectedProvider || isLoading}
                  className="rounded-xl bg-slate-900 text-white hover:bg-slate-800"
                >
                  {busyProvider === selectedProvider ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : null}
                  Save key
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
