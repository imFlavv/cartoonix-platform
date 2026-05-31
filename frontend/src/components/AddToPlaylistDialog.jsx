import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, getErrorMessage } from "@/lib/api";
import { toast } from "sonner";
import { ListMusic, Plus, Check } from "lucide-react";

/**
 * Dialog used to add either a single episode or an entire cartoon (all episodes)
 * to one of the user's playlists. Supports creating a new playlist inline.
 *
 * Props:
 *  - open: boolean
 *  - onOpenChange: (boolean) => void
 *  - mode: "episode" | "cartoon"
 *  - cartoonId: string
 *  - cartoonTitle?: string
 *  - episodeId?: string   (required if mode === "episode")
 *  - episodeTitle?: string
 */
export default function AddToPlaylistDialog({
  open,
  onOpenChange,
  mode = "episode",
  cartoonId,
  cartoonTitle,
  episodeId,
  episodeTitle,
}) {
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/me/playlists");
      setPlaylists(data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      setNewName("");
      load();
    }
  }, [open]);

  const addToPlaylist = async (playlistId) => {
    try {
      if (mode === "episode") {
        const { data } = await api.post(
          `/me/playlists/${playlistId}/episodes`,
          { cartoon_id: cartoonId, episode_id: episodeId }
        );
        if (data?.already_added) {
          toast.message("Acest episod este deja în playlist");
        } else {
          toast.success("Adăugat în playlist");
        }
      } else {
        await api.post(`/me/playlists/${playlistId}/items`, {
          cartoon_id: cartoonId,
        });
        toast.success("Desen adăugat în playlist");
      }
      onOpenChange(false);
    } catch (e) {
      toast.error(getErrorMessage(e, "Nu am putut adăuga în playlist"));
    }
  };

  const createAndAdd = async () => {
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    try {
      const { data: pl } = await api.post("/me/playlists", { name });
      await addToPlaylist(pl.id);
    } catch (e) {
      toast.error(getErrorMessage(e, "Nu am putut crea playlist-ul"));
    } finally {
      setCreating(false);
    }
  };

  const headerLabel =
    mode === "episode"
      ? episodeTitle
        ? `Adaugă „${episodeTitle}" în playlist`
        : "Adaugă episodul în playlist"
      : cartoonTitle
        ? `Adaugă „${cartoonTitle}" în playlist`
        : "Adaugă desenul în playlist";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-md"
        data-testid="add-to-playlist-dialog"
      >
        <DialogHeader>
          <DialogTitle className="font-display tracking-wider">
            {headerLabel}
          </DialogTitle>
          <DialogDescription>
            {mode === "episode"
              ? "Selectează un playlist existent sau creează unul nou."
              : "Toate episoadele desenului vor fi adăugate în playlist."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-2 max-h-60 overflow-y-auto ep-scroll">
            {loading ? (
              <div className="p-4 text-sm text-muted-foreground">
                Se încarcă...
              </div>
            ) : playlists.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground">
                Nu ai niciun playlist încă. Creează unul mai jos.
              </div>
            ) : (
              <ul className="divide-y divide-white/[0.04]">
                {playlists.map((p) => {
                  const inThisPlaylist =
                    mode === "episode" &&
                    (p.items || []).some((it) => it.episode_id === episodeId);
                  return (
                    <li key={p.id}>
                      <button
                        onClick={() => addToPlaylist(p.id)}
                        disabled={inThisPlaylist}
                        data-testid={`playlist-option-${p.id}`}
                        className={`w-full text-left rounded-lg px-3 py-2.5 flex items-center gap-3 transition-colors ${
                          inThisPlaylist
                            ? "opacity-50 cursor-not-allowed"
                            : "hover:bg-white/[0.04]"
                        }`}
                      >
                        <div className="h-8 w-8 rounded-md bg-[hsl(var(--accent))]/15 grid place-items-center text-[hsl(var(--accent))] shrink-0">
                          <ListMusic className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">
                            {p.name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {(p.items || []).length} episoade
                          </div>
                        </div>
                        {inThisPlaylist && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-300">
                            <Check className="h-3 w-3" /> Adăugat
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
            <div className="text-[11px] uppercase tracking-[0.28em] text-white/40 mb-2">
              Sau creează unul nou
            </div>
            <div className="flex gap-2">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Nume playlist"
                className="h-10 rounded-lg"
                data-testid="new-playlist-name-input"
                onKeyDown={(e) => {
                  if (e.key === "Enter") createAndAdd();
                }}
              />
              <Button
                onClick={createAndAdd}
                disabled={!newName.trim() || creating}
                className="rounded-lg h-10"
                data-testid="create-and-add-playlist-button"
              >
                <Plus className="h-4 w-4 mr-1" /> Creează
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
