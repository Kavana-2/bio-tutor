import { useEffect, useState } from "react";
import api from "../lib/api";
import { Page, Card, EmptyState, Spinner } from "../components/common";
import { Bookmark, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function Bookmarks() {
  const [items, setItems] = useState(null);

  const load = () => api.get("/bookmarks").then((r) => setItems(r.data)).catch(() => setItems([]));

  useEffect(() => {
    load();
  }, []);

  const remove = async (id) => {
    await api.delete(`/bookmarks/${id}`);
    toast.success("Bookmark removed");
    load();
  };

  if (items === null)
    return (
      <Page title="Bookmarked Pages">
        <Spinner />
      </Page>
    );

  return (
    <Page title="Bookmarked Pages" subtitle="Saved Document References" testid="bookmarks-page">
      {items.length === 0 ? (
        <EmptyState
          icon={Bookmark}
          title="No bookmarks saved yet"
          description="Bookmark important pages while reading your documents in PDF Study to find them quickly here."
          testid="bookmarks-empty"
        />
      ) : (
        <div className="space-y-3 max-w-3xl mx-auto">
          {items.map((b) => (
            <Card key={b.id} className="flex items-center gap-3 p-4 hover:border-primary/30 transition-all">
              <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Bookmark className="h-4.5 w-4.5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-foreground truncate">{b.title}</p>
                {b.note && <p className="text-xs text-muted-foreground truncate mt-0.5">{b.note}</p>}
              </div>
              <button
                onClick={() => remove(b.id)}
                className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                data-testid="bookmark-delete"
                title="Remove bookmark"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </Card>
          ))}
        </div>
      )}
    </Page>
  );
}

