import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLibrary } from "@/context/LibraryContext";
import { Check, Plus, ListMusic } from "lucide-react";
import { toast } from "sonner";

export const AddToPlaylistDialog = ({ open, onOpenChange, itemRef }) => {
  const { playlists, createPlaylist, togglePlaylistItem } = useLibrary();
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);

  const inPlaylist = (pl) => pl.items?.some((i) => i.key === `${itemRef?.show_id}:${itemRef?.episode_number}`);

  const create = async () => {
    if (!name.trim()) return;
    setCreating(true);
    try {
      await createPlaylist(name.trim());
      setName("");
      toast.success("Playlist creat");
    } finally {
      setCreating(false);
    }
  };

  const toggle = async (pl) => {
    const added = await togglePlaylistItem(pl.id, itemRef);
    toast.success(added ? `Adăugat în „${pl.name}”` : `Eliminat din „${pl.name}”`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#141414] border-white/10 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl flex items-center gap-2">
            <ListMusic className="h-5 w-5 text-[#ffcc00]" /> Adaugă în playlist
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-2 max-h-64 overflow-y-auto">
          {playlists.length === 0 && (
            <p className="text-sm text-white/40 py-2">Nu ai încă niciun playlist. Creează unul mai jos.</p>
          )}
          {playlists.map((pl) => (
            <button
              key={pl.id}
              data-testid={`playlist-toggle-${pl.id}`}
              onClick={() => toggle(pl)}
              className="w-full flex items-center justify-between px-4 py-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors duration-200"
            >
              <span className="font-semibold text-sm">{pl.name}</span>
              {inPlaylist(pl) ? (
                <span className="flex items-center gap-1 text-[#ffcc00] text-xs font-bold"><Check className="h-4 w-4" /> Adăugat</span>
              ) : (
                <Plus className="h-4 w-4 text-white/60" />
              )}
            </button>
          ))}
        </div>

        <div className="flex gap-2 pt-2 border-t border-white/10">
          <input
            data-testid="new-playlist-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nume playlist nou"
            className="flex-1 px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-[#ffcc00]"
          />
          <button data-testid="create-playlist-btn" onClick={create} disabled={creating} className="px-4 rounded-lg bg-[#ec1c24] font-bold hover:bg-[#ff2d36] transition-colors duration-200 disabled:opacity-60">
            <Plus className="h-5 w-5" />
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
