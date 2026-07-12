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
import { BYOK_PROVIDERS, type ByokProvider } from "@/lib/byok";
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
  litellm: "LiteLLM",
};

const PROVIDER_DESCRIPTION: Record<ByokProvider, string> = {
  openai: "Unlock GPT models with your own OpenAI account.",
  anthropic: "Unlock Claude models with your own Anthropic account.",
  litellm: "Use any LiteLLM-supported provider or private OpenAI-compatible endpoint.",
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
    litellm: "",
  });
  const [draftApiBase, setDraftApiBase] = useState("");
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
    () => BYOK_PROVIDERS.map((provider) => statuses[provider]),
    [statuses]
  );

  const handleSave = async () => {
    const apiKey = draftKeys[selectedProvider].trim();
    const apiBase = draftApiBase.trim();
    if (!apiKey && !(selectedProvider === "litellm" && apiBase)) {
      toast({
        title: selectedProvider === "litellm" ? "Credential required" : "API key required",
        description:
          selectedProvider === "litellm"
            ? "Paste an API key or enter a private endpoint URL."
            : `Paste your ${PROVIDER_LABEL[selectedProvider]} key to continue.`,
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
          apiBase: selectedProvider === "litellm" ? apiBase : undefined,
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
      if (selectedProvider === "litellm") {
        setDraftApiBase("");
      }
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
        className="z-[1400] max-w-2xl rounded-2xl border-border bg-card shadow-2xl"
        overlayClassName="z-[1390] bg-black/60"
      >
        <DialogHeader className="space-y-2 text-left">
          <DialogTitle className="flex items-center gap-2 text-[15px] font-semibold tracking-[-0.01em] text-foreground">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 text-primary">
              <KeyRound className="h-4 w-4" strokeWidth={1.75} />
            </span>
            Bring Your Own API Keys
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed text-muted-foreground">
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
                  "rounded-lg border px-4 py-2 text-left transition-colors",
                  selectedProvider === providerStatus.provider
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-muted text-foreground hover:bg-accent"
                )}
              >
                <div className="text-[13px] font-medium">
                  {PROVIDER_LABEL[providerStatus.provider]}
                </div>
                <div
                  className={cn(
                    "mt-1 text-[10px] font-medium uppercase tracking-[0.08em]",
                    selectedProvider === providerStatus.provider
                      ? "text-primary-foreground/70"
                      : providerStatus.configured
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-muted-foreground"
                  )}
                >
                  {providerStatus.configured
                    ? providerStatus.keyHint || "Connected"
                    : "Not connected"}
                </div>
              </button>
            ))}
          </div>

          <div className="rounded-xl border border-border bg-muted/50 p-4">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <div className="type-ui">
                  {PROVIDER_LABEL[selectedProvider]} key
                </div>
                <div className="mt-1 type-body text-muted-foreground">
                  {PROVIDER_DESCRIPTION[selectedProvider]}
                </div>
              </div>

              {activeStatus.configured && (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.08em] text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.75} />
                  Connected
                </span>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor={`api-key-${selectedProvider}`} className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
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
                    : selectedProvider === "anthropic"
                      ? "sk-ant-..."
                      : "Provider key or LiteLLM proxy key"
                }
                className="h-11 rounded-lg border-border bg-background font-mono text-[13px] md:text-[13px]"
              />
              {selectedProvider === "litellm" && (
                <div className="space-y-2 pt-2">
                  <Label htmlFor="litellm-api-base" className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                    API base URL
                  </Label>
                  <Input
                    id="litellm-api-base"
                    type="url"
                    value={draftApiBase}
                    onChange={(event) => setDraftApiBase(event.target.value)}
                    placeholder="https://your-private-endpoint.example.com/v1"
                    className="h-11 rounded-lg border-border bg-background font-mono text-[13px] md:text-[13px]"
                  />
                </div>
              )}
              <p className="text-xs leading-relaxed text-muted-foreground">
                {selectedProvider === "litellm" && activeStatus.apiBaseHint
                  ? `Current endpoint: ${activeStatus.apiBaseHint}. `
                  : ""}
                Save a new credential to replace the existing one. Stored keys are shown only
                as masked hints like{" "}
                <span className="type-mono">{activeStatus.keyHint || "••••last4"}</span>.
              </p>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-muted-foreground">
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
                    className="rounded-lg border-destructive/30 text-[13px] font-medium text-destructive hover:bg-destructive/10 hover:text-destructive"
                  >
                    {busyProvider === selectedProvider ? (
                      <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} />
                    ) : (
                      <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                    )}
                    Remove key
                  </Button>
                )}
                <Button
                  type="button"
                  onClick={handleSave}
                  disabled={busyProvider === selectedProvider || isLoading}
                  className="rounded-lg bg-primary text-[13px] font-medium text-primary-foreground hover:bg-primary/90"
                >
                  {busyProvider === selectedProvider ? (
                    <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} />
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
