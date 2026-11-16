import { useCallback, useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useUser, useClerk } from "@clerk/react";
import { useGetSave, usePutSave, getGetSaveQueryKey } from "@workspace/api-client-react";
import type { SaveInputData } from "@workspace/api-client-react";
import { collectLocalSave, applyLocalSave } from "@/game/cloudSave";
import { useToast } from "@/hooks/use-toast";

const AUTO_SAVE_MS = 30_000;

export function CloudSaveBar() {
  const { isLoaded, isSignedIn, user } = useUser();
  const { signOut } = useClerk();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const putSave = usePutSave();
  const getSave = useGetSave({
    query: { enabled: false, retry: false, queryKey: getGetSaveQueryKey() },
  });
  const [loading, setLoading] = useState(false);

  const pushCloud = useCallback(
    async (silent: boolean) => {
      try {
        const payload = collectLocalSave() as unknown as SaveInputData;
        await putSave.mutateAsync({ data: { data: payload } });
        if (!silent) {
          toast({ title: "Gespeichert", description: "Dein Spielstand liegt jetzt in der Cloud." });
        }
      } catch {
        if (!silent) {
          toast({
            title: "Fehler",
            description: "Speichern in der Cloud fehlgeschlagen.",
            variant: "destructive",
          });
        }
      }
    },
    [putSave, toast],
  );

  // Auto-save to the cloud on an interval while signed in.
  useEffect(() => {
    if (!isSignedIn) return;
    const id = window.setInterval(() => {
      void pushCloud(true);
    }, AUTO_SAVE_MS);
    return () => window.clearInterval(id);
  }, [isSignedIn, pushCloud]);

  const loadCloud = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getSave.refetch();
      if (result.error) {
        const status = (result.error as { status?: number }).status;
        toast({
          title: status === 404 ? "Kein Spielstand" : "Fehler",
          description:
            status === 404
              ? "In der Cloud ist noch kein Spielstand gespeichert."
              : "Laden aus der Cloud fehlgeschlagen.",
          variant: status === 404 ? "default" : "destructive",
        });
        return;
      }
      const payload = result.data?.data;
      if (!payload || !applyLocalSave(payload)) {
        toast({ title: "Kein Spielstand", description: "Nichts zum Laden gefunden." });
        return;
      }
      toast({ title: "Geladen", description: "Spielstand wird übernommen …" });
      window.setTimeout(() => window.location.reload(), 600);
    } finally {
      setLoading(false);
    }
  }, [getSave, toast]);

  if (!isLoaded) {
    return <div className="text-muted-foreground text-xs">…</div>;
  }

  if (!isSignedIn) {
    return (
      <div className="flex items-center gap-2">
        <button
          className="pixel-btn bg-primary text-primary-foreground px-3 py-2 text-xs"
          onClick={() => setLocation("/sign-in")}
          data-testid="button-sign-in"
        >
          🔑 ANMELDEN
        </button>
        <button
          className="pixel-btn bg-muted text-muted-foreground px-3 py-2 text-xs"
          onClick={() => setLocation("/sign-up")}
          data-testid="button-sign-up"
        >
          ✨ REGISTRIEREN
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-muted-foreground text-xs hidden sm:inline" data-testid="text-username">
        👤 {user?.firstName ?? user?.username ?? "Spieler"}
      </span>
      <button
        className="pixel-btn bg-primary text-primary-foreground px-3 py-2 text-xs disabled:opacity-60"
        onClick={() => void pushCloud(false)}
        disabled={putSave.isPending}
        data-testid="button-cloud-save"
      >
        {putSave.isPending ? "💾 …" : "💾 SPEICHERN"}
      </button>
      <button
        className="pixel-btn bg-accent text-accent-foreground px-3 py-2 text-xs disabled:opacity-60"
        onClick={() => void loadCloud()}
        disabled={loading}
        data-testid="button-cloud-load"
      >
        {loading ? "📥 …" : "📥 LADEN"}
      </button>
      <button
        className="pixel-btn bg-muted text-muted-foreground px-3 py-2 text-xs"
        onClick={() => void signOut()}
        data-testid="button-sign-out"
      >
        🚪
      </button>
    </div>
  );
}
