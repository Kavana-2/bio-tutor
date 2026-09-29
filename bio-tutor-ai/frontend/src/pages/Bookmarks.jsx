import { useEffect, useState } from "react";
import api from "../lib/api";
import { Page, Card, EmptyState, Spinner } from "../components/common";
import { Button } from "../components/ui/button";
import { Bookmark, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function Bookmarks() {
  const [items, setItems] = useState(null);
  const load = () => api.get("/bookmarks").then((r) => setItems(r.data)).catch(() => setItems([]));
  useEffect(() => { load(); }, []);

  const remove = async (id) => { await api.delete(`/bookmarks/${id}`); toast.success("Removed"); load(); };

  if (items === null) return <Page title="Bookmarks"><Spinner /></Page>;
  return (
    <Page title="Bookmarks" subtitle="Saved pages" testid="bookmarks-page">
      {items.length === 0 ? (
        <EmptyState icon={Bookmark} title="No bookmarks yet" description="Bookmark pages while studying your PDFs to find them here." testid="bookmarks-empty" />
      ) : (
        <div className="space-y-3">
          {items.map((b) => (
            <Card key={b.id} className="flex items-center gap-3">
              <Bookmark className="h-4 w-4 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{b.title}</p>
                {b.note && <p className="text-sm text-muted-foreground truncate">{b.note}</p>}
              </div>
              <button onClick={() => remove(b.id)} className="text-muted-foreground hover:text-destructive" data-testid="bookmark-delete"><Trash2 className="h-4 w-4" /></button>
            </Card>
          ))}
        </div>
      )}
    </Page>
  );
}
