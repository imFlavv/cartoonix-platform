import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const LibraryContext = createContext(null);

export const LibraryProvider = ({ children }) => {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState([]);
  const [playlists, setPlaylists] = useState([]);

  const refresh = useCallback(async () => {
    if (!user) {
      setFavorites([]);
      setPlaylists([]);
      return;
    }
    const [f, p] = await Promise.all([api.get("/favorites"), api.get("/playlists")]);
    setFavorites(f.data);
    setPlaylists(p.data);
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const isFavorite = (showId, ep) =>
    favorites.some((f) => f.key === `${showId}:${ep}`);

  const isShowFavorite = (showId) =>
    favorites.some((f) => f.key === `${showId}:0`);

  const toggleFavorite = async (ref) => {
    const { data } = await api.post("/favorites/toggle", ref);
    await refresh();
    return data.favorited;
  };

  const createPlaylist = async (name) => {
    await api.post("/playlists", { name });
    await refresh();
  };

  const deletePlaylist = async (id) => {
    await api.delete(`/playlists/${id}`);
    await refresh();
  };

  const togglePlaylistItem = async (playlistId, ref) => {
    const { data } = await api.post(`/playlists/${playlistId}/toggle`, ref);
    await refresh();
    return data.added;
  };

  return (
    <LibraryContext.Provider
      value={{
        favorites,
        playlists,
        refresh,
        isFavorite,
        isShowFavorite,
        toggleFavorite,
        createPlaylist,
        deletePlaylist,
        togglePlaylistItem,
      }}
    >
      {children}
    </LibraryContext.Provider>
  );
};

export const useLibrary = () => useContext(LibraryContext);
