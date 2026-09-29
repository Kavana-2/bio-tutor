import { useState, useEffect, useRef } from "react";
import api, { formatApiError } from "../lib/api";
import { Page, Card, EmptyState, Spinner } from "../components/common";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import { Upload, FileText, Trash2, Search, Bookmark, Loader2, ChevronLeft, ChevronRight, Send } from "lucide-react";
import { toast } from "sonner";

const SUPPORTED_DOCUMENT_TYPES = ".pdf,.docx,.pptx,.txt,.md,.csv,.xlsx,.png,.jpg,.jpeg,.bmp,.tif,.tiff,.webp,.html,.htm,.json";

export default function PDFStudy() {
  const [pdfs, setPdfs] = useState(null);
  const [selected, setSelected] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const load = () => api.get("/pdfs").then((r) => setPdfs(r.data)).catch(() => setPdfs([]));
  useEffect(() => { load(); }, []);

  const upload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const extension = `.${file.name.split(".").pop()?.toLowerCase()}`;
    if (!SUPPORTED_DOCUMENT_TYPES.split(",").includes(extension)) return toast.error("Unsupported file type");
    const fd = new FormData();
    fd.append("file", file);
    setUploading(true);
    try {
      const { data } = await api.post("/pdfs/upload", fd);
      toast.success(`Processed "${data.filename}" — ${data.lessons} lessons ready`);
      data.warnings?.forEach((warning) => toast.warning(warning));
      load();
    } catch (err) {
      const detail = err.response?.data?.detail;
      toast.error(detail ? formatApiError(detail) : "Upload failed. Check that the backend is running and use .docx/.pptx (legacy .doc/.ppt files aren't supported)." );
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const remove = async (id) => {
    await api.delete(`/pdfs/${id}`);
    toast.success("Deleted");
    if (selected?.id === id) setSelected(null);
    load();
  };

  if (selected) return <PDFViewer id={selected.id} onBack={() => setSelected(null)} />;

  return (
    <Page title="Study Library" subtitle="PDF, .docx Word, .pptx PowerPoint, Excel, CSV, text, HTML, JSON, and images · image OCR requires Tesseract"
      testid="pdf-page"
      actions={
        <>
          <input ref={fileRef} type="file" accept={SUPPORTED_DOCUMENT_TYPES} className="hidden" onChange={upload} data-testid="pdf-file-input" />
          <Button onClick={() => fileRef.current?.click()} disabled={uploading} data-testid="pdf-upload-btn">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Upload className="h-4 w-4 mr-1" />}
            Upload document
          </Button>
        </>
      }>
      {pdfs === null ? (
        <Spinner />
      ) : pdfs.length === 0 ? (
          <EmptyState icon={FileText} title="No notes uploaded yet"
          description="Upload PDFs, Word or PowerPoint files, spreadsheets, text, or images. We extract text and tables to build a personal study library. Image and scanned-PDF OCR requires Tesseract."
          action={<Button onClick={() => fileRef.current?.click()} data-testid="pdf-empty-upload"><Upload className="h-4 w-4 mr-1" /> Upload your first document</Button>}
          testid="pdf-empty" />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {pdfs.map((p) => (
            <Card key={p.id} className="cursor-pointer group" onClick={() => setSelected(p)} data-testid="pdf-card">
              <div className="flex items-start justify-between mb-3">
                <div className="h-10 w-10 rounded-md bg-accent flex items-center justify-center">
                  <FileText className="h-5 w-5 text-accent-foreground" />
                </div>
                <button onClick={(e) => { e.stopPropagation(); remove(p.id); }} className="text-muted-foreground hover:text-destructive" data-testid="pdf-delete">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <p className="font-medium truncate group-hover:text-primary transition-colors">{p.filename}</p>
              <p className="text-xs text-muted-foreground mt-1">{p.num_units ?? p.num_pages} {p.document_type === "pptx" ? "slides" : p.document_type === "xlsx" ? "sheets" : p.document_type === "pdf" ? "pages" : "sections"} · {p.topic_name}</p>
            </Card>
          ))}
        </div>
      )}
    </Page>
  );
}

function PDFViewer({ id, onBack }) {
  const [pdf, setPdf] = useState(null);
  const [page, setPage] = useState(1);
  const [tools, setTools] = useState(null);
  const [toolLoading, setToolLoading] = useState("");
  const [q, setQ] = useState("");
  const [answer, setAnswer] = useState(null);

  useEffect(() => { api.get(`/pdfs/${id}`).then((r) => setPdf(r.data)); }, [id]);

  const runTool = async (name) => {
    setToolLoading(name);
    setTools(null);
    try {
      const { data } = await api.post(`/pdfs/${id}/${name}`);
      setTools({ name, data });
    } catch (err) { toast.error(formatApiError(err.response?.data?.detail)); }
    finally { setToolLoading(""); }
  };

  const askPage = async (e) => {
    e.preventDefault();
    if (!q.trim()) return;
    setAnswer("loading");
    try {
      const { data } = await api.post(`/pdfs/${id}/ask`, { question: q });
      setAnswer(data);
    } catch (err) { toast.error(formatApiError(err.response?.data?.detail)); setAnswer(null); }
  };

  const bookmark = async () => {
    await api.post("/bookmarks", { pdf_id: id, page, title: `${pdf.filename} — page ${page}` });
    toast.success("Page bookmarked");
  };

  if (!pdf) return <Page title="Loading…"><Spinner /></Page>;
  const currentPage = pdf.pages.find((p) => p.page === page) || pdf.pages[0];
  const unitLabel = pdf.document_type === "pptx" ? "slides" : pdf.document_type === "xlsx" ? "sheets" : pdf.document_type === "pdf" || !pdf.document_type ? "pages" : "sections";
  const currentSource = currentPage?.source_label || `Page ${page}`;

  return (
    <Page title={pdf.filename} subtitle={`${pdf.topic_name} · ${pdf.num_units ?? pdf.num_pages} ${unitLabel}`} testid="pdf-viewer"
      actions={<Button variant="outline" onClick={onBack}>Back to library</Button>}>
      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Button size="icon" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} data-testid="pdf-prev-page"><ChevronLeft className="h-4 w-4" /></Button>
              <span className="text-sm font-medium">{currentSource} · {page} / {pdf.num_units ?? pdf.num_pages}</span>
              <Button size="icon" variant="outline" disabled={page >= pdf.num_pages} onClick={() => setPage((p) => p + 1)} data-testid="pdf-next-page"><ChevronRight className="h-4 w-4" /></Button>
            </div>
            <Button size="sm" variant="ghost" onClick={bookmark} data-testid="pdf-bookmark"><Bookmark className="h-4 w-4 mr-1" /> Bookmark</Button>
          </div>
          <div className="rounded-md bg-[hsl(var(--surface))] border border-border p-5 max-h-[50vh] overflow-y-auto text-sm leading-relaxed whitespace-pre-wrap" data-testid="pdf-page-text">
            {currentPage?.text || "(No extractable text on this page)"}
          </div>

          <form onSubmit={askPage} className="mt-4 flex gap-2">
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ask about your notes…" data-testid="pdf-ask-input" />
            <Button type="submit" data-testid="pdf-ask-btn"><Send className="h-4 w-4" /></Button>
          </form>
          {answer === "loading" && <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Searching your notes…</div>}
          {answer && answer !== "loading" && (
            <div className="mt-3 rounded-md border border-border p-4 text-sm" data-testid="pdf-ask-answer">
              <p className="leading-relaxed">{answer.answer}</p>
              {answer.source && <p className="text-xs text-muted-foreground mt-2">Source: {answer.source}</p>}
            </div>
          )}
        </Card>

        <div className="space-y-4">
          <Card>
            <h3 className="font-semibold tracking-tight mb-3">Study Tools</h3>
            <div className="grid grid-cols-2 gap-2">
              {[["summary", "Summary"], ["notes", "Smart Notes"], ["mcqs", "MCQs"], ["flashcards", "Flashcards"], ["exam-questions", "Exam Qs"], ["viva", "Viva"]].map(([k, label]) => (
                <Button key={k} variant="outline" size="sm" onClick={() => runTool(k)} disabled={!!toolLoading} data-testid={`pdf-tool-${k}`}>
                  {toolLoading === k ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : label}
                </Button>
              ))}
            </div>
          </Card>

          {tools && (
            <Card data-testid="pdf-tool-output">
              <h3 className="font-semibold tracking-tight mb-3 capitalize">{tools.name.replace("-", " ")}</h3>
              <ToolOutput name={tools.name} data={tools.data} />
            </Card>
          )}
        </div>
      </div>
    </Page>
  );
}

function ToolOutput({ name, data }) {
  if (name === "summary") return <ul className="space-y-2 text-sm">{data.summary.map((s, i) => <li key={i} className="flex gap-2"><span className="text-primary">•</span>{s}</li>)}</ul>;
  if (name === "notes") return (
    <div className="text-sm space-y-3">
      <div><p className="font-medium text-xs uppercase tracking-wide text-muted-foreground mb-1">Overview</p><p>{data.overview}</p></div>
      <div><p className="font-medium text-xs uppercase tracking-wide text-muted-foreground mb-1">Key Points</p>
        <ul className="space-y-1">{data.key_points.map((k, i) => <li key={i} className="flex gap-2"><span className="text-primary">•</span>{k}</li>)}</ul></div>
    </div>
  );
  if (name === "mcqs") return <div className="space-y-3 text-sm">{data.mcqs.map((m, i) => (
    <div key={i}><p className="font-medium">{i + 1}. {m.question}</p>
      <ul className="mt-1 space-y-0.5">{m.options.map((o, j) => <li key={j} className={j === m.correct_index ? "text-success font-medium" : "text-muted-foreground"}>{String.fromCharCode(65 + j)}. {o}</li>)}</ul></div>
  ))}</div>;
  if (name === "flashcards") return <div className="space-y-2 text-sm">{data.flashcards.map((f, i) => (
    <div key={i} className="rounded-md border border-border p-3"><p className="font-medium">{f.front}</p><p className="text-muted-foreground mt-1">{f.back}</p></div>
  ))}</div>;
  if (name === "exam-questions") return (
    <div className="text-sm space-y-3">
      {[["two_mark", "2-Mark"], ["five_mark", "5-Mark"], ["ten_mark", "10-Mark"]].map(([k, l]) => (
        <div key={k}><p className="font-medium">{l} Questions</p><ul className="mt-1 space-y-0.5 text-muted-foreground">{(data[k] || []).map((qq, i) => <li key={i}>• {qq}</li>)}</ul></div>
      ))}
    </div>
  );
  if (name === "viva") return <div className="space-y-2 text-sm">{data.viva.map((v, i) => (
    <div key={i}><p className="font-medium">Q: {v.question}</p><p className="text-muted-foreground">A: {v.answer}</p></div>
  ))}</div>;
  return null;
}
