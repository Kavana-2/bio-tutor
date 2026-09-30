import { useState, useEffect, useRef } from "react";
import api, { formatApiError } from "../lib/api";
import { Page, Card, EmptyState, Spinner } from "../components/common";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Upload, FileText, Trash2, Search, Bookmark, Loader2, ChevronLeft, ChevronRight, Send, FileCode, FileSpreadsheet, Presentation, Image as ImageIcon, Sparkles, BookOpen } from "lucide-react";
import { toast } from "sonner";

const SUPPORTED_DOCUMENT_TYPES = ".pdf,.docx,.pptx,.txt,.md,.csv,.xlsx,.png,.jpg,.jpeg,.bmp,.tif,.tiff,.webp,.html,.htm,.json";

function getFileIcon(type) {
  if (type === "pptx" || type === "ppt") return Presentation;
  if (type === "xlsx" || type === "csv") return FileSpreadsheet;
  if (type === "png" || type === "jpg" || type === "jpeg" || type === "webp") return ImageIcon;
  if (type === "json" || type === "html" || type === "md") return FileCode;
  return FileText;
}

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
      toast.error(detail ? formatApiError(detail) : "Upload failed. Check that backend is running.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const remove = async (id) => {
    await api.delete(`/pdfs/${id}`);
    toast.success("Document deleted");
    if (selected?.id === id) setSelected(null);
    load();
  };

  if (selected) return <PDFViewer id={selected.id} onBack={() => setSelected(null)} />;

  return (
    <Page
      title="Study Notes Library"
      subtitle="Supported: PDF, Word, PowerPoint, Excel, CSV, Text, HTML, JSON & Images"
      testid="pdf-page"
      actions={
        <>
          <input ref={fileRef} type="file" accept={SUPPORTED_DOCUMENT_TYPES} className="hidden" onChange={upload} data-testid="pdf-file-input" />
          <Button onClick={() => fileRef.current?.click()} disabled={uploading} className="font-semibold shadow-md shadow-primary/20" data-testid="pdf-upload-btn">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
            Upload Study Document
          </Button>
        </>
      }
    >
      {pdfs === null ? (
        <Spinner />
      ) : pdfs.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Your document library is empty"
          description="Upload your Biology lecture notes, PDFs, or slides. We extract text and build interactive AI lessons, summaries, MCQs, and flashcards."
          action={
            <Button onClick={() => fileRef.current?.click()} className="font-semibold shadow-md shadow-primary/20" data-testid="pdf-empty-upload">
              <Upload className="h-4 w-4 mr-2" /> Upload First Document
            </Button>
          }
          testid="pdf-empty"
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {pdfs.map((p) => {
            const IconComponent = getFileIcon(p.document_type);
            return (
              <Card
                key={p.id}
                className="cursor-pointer group hover:border-primary/40 relative flex flex-col justify-between"
                onClick={() => setSelected(p)}
                data-testid="pdf-card"
              >
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-105 transition-transform">
                      <IconComponent className="h-5.5 w-5.5" />
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); remove(p.id); }}
                      className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                      data-testid="pdf-delete"
                      title="Delete document"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="font-bold text-base text-foreground truncate group-hover:text-primary transition-colors">{p.filename}</p>
                  <p className="text-xs text-muted-foreground mt-1 font-medium">
                    {p.num_units ?? p.num_pages} {p.document_type === "pptx" ? "slides" : p.document_type === "xlsx" ? "sheets" : "pages"} · {p.topic_name}
                  </p>
                </div>
                <div className="mt-5 pt-3 border-t border-border/50 flex items-center justify-between text-xs text-primary font-semibold">
                  <span>Open Study Workspace</span>
                  <ChevronRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </Card>
            );
          })}
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

  useEffect(() => {
    api.get(`/pdfs/${id}`).then((r) => setPdf(r.data));
  }, [id]);

  const runTool = async (name) => {
    setToolLoading(name);
    setTools(null);
    try {
      const { data } = await api.post(`/pdfs/${id}/${name}`);
      setTools({ name, data });
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    } finally {
      setToolLoading("");
    }
  };

  const askPage = async (e) => {
    e.preventDefault();
    if (!q.trim()) return;
    setAnswer("loading");
    try {
      const { data } = await api.post(`/pdfs/${id}/ask`, { question: q });
      setAnswer(data);
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
      setAnswer(null);
    }
  };

  const bookmark = async () => {
    await api.post("/bookmarks", { pdf_id: id, page, title: `${pdf.filename} — page ${page}` });
    toast.success("Page bookmarked");
  };

  if (!pdf) return <Page title="Loading Document…"><Spinner /></Page>;
  const currentPage = pdf.pages.find((p) => p.page === page) || pdf.pages[0];
  const unitLabel = pdf.document_type === "pptx" ? "slides" : pdf.document_type === "xlsx" ? "sheets" : "pages";
  const currentSource = currentPage?.source_label || `Page ${page}`;

  return (
    <Page
      title={pdf.filename}
      subtitle={`${pdf.topic_name} · ${pdf.num_units ?? pdf.num_pages} ${unitLabel}`}
      testid="pdf-viewer"
      actions={<Button variant="outline" className="font-semibold" onClick={onBack}>Back to Library</Button>}
    >
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left 2-Col: Reader & Q&A */}
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Button size="icon" variant="outline" className="h-8 w-8" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} data-testid="pdf-prev-page">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs font-bold text-foreground px-2">
                {currentSource} · {page} / {pdf.num_units ?? pdf.num_pages}
              </span>
              <Button size="icon" variant="outline" className="h-8 w-8" disabled={page >= pdf.num_pages} onClick={() => setPage((p) => p + 1)} data-testid="pdf-next-page">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <Button size="sm" variant="ghost" onClick={bookmark} className="text-xs font-semibold" data-testid="pdf-bookmark">
              <Bookmark className="h-3.5 w-3.5 mr-1 text-primary" /> Bookmark
            </Button>
          </div>

          <div className="rounded-xl bg-muted/30 border border-border p-5 max-h-[48vh] overflow-y-auto text-sm leading-relaxed text-foreground whitespace-pre-wrap font-sans" data-testid="pdf-page-text">
            {currentPage?.text || "(No extractable text on this unit)"}
          </div>

          <form onSubmit={askPage} className="mt-4 flex gap-2">
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Ask a question about this specific document..."
              className="h-10 rounded-xl bg-card border-border text-sm"
              data-testid="pdf-ask-input"
            />
            <Button type="submit" className="h-10 px-4 font-semibold shadow-sm" data-testid="pdf-ask-btn">
              <Send className="h-4 w-4" />
            </Button>
          </form>

          {answer === "loading" && (
            <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-muted-foreground p-3 rounded-xl bg-muted/40">
              <Loader2 className="h-4 w-4 animate-spin text-primary" /> Searching extracted notes...
            </div>
          )}
          {answer && answer !== "loading" && (
            <div className="mt-3 rounded-xl border border-primary/20 bg-primary/5 p-4 text-xs space-y-1.5" data-testid="pdf-ask-answer">
              <p className="font-semibold text-foreground leading-relaxed">{answer.answer}</p>
              {answer.source && <p className="text-[11px] text-muted-foreground">Source: {answer.source}</p>}
            </div>
          )}
        </Card>

        {/* Right 1-Col: Study Tools */}
        <div className="space-y-5">
          <Card>
            <h3 className="font-bold text-base tracking-tight font-display mb-3 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> Note Processing Tools
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                ["summary", "Summary"],
                ["notes", "Smart Notes"],
                ["mcqs", "MCQs"],
                ["flashcards", "Flashcards"],
                ["exam-questions", "Exam Qs"],
                ["viva", "Viva"]
              ].map(([k, label]) => (
                <Button
                  key={k}
                  variant="outline"
                  size="sm"
                  onClick={() => runTool(k)}
                  disabled={!!toolLoading}
                  className="font-semibold text-xs h-9"
                  data-testid={`pdf-tool-${k}`}
                >
                  {toolLoading === k ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : label}
                </Button>
              ))}
            </div>
          </Card>

          {tools && (
            <Card data-testid="pdf-tool-output">
              <h3 className="font-bold text-base tracking-tight font-display mb-3 capitalize text-primary flex items-center gap-2">
                <BookOpen className="h-4 w-4" /> {tools.name.replace("-", " ")}
              </h3>
              <ToolOutput name={tools.name} data={tools.data} />
            </Card>
          )}
        </div>
      </div>
    </Page>
  );
}

function ToolOutput({ name, data }) {
  if (name === "summary") return <ul className="space-y-2 text-xs">{data.summary.map((s, i) => <li key={i} className="flex gap-2"><span className="text-primary font-bold">•</span><span className="leading-relaxed">{s}</span></li>)}</ul>;
  if (name === "notes") return (
    <div className="text-xs space-y-3">
      <div><p className="font-bold uppercase tracking-wider text-muted-foreground mb-1">Overview</p><p className="leading-relaxed">{data.overview}</p></div>
      <div><p className="font-bold uppercase tracking-wider text-muted-foreground mb-1">Key Concepts</p>
        <ul className="space-y-1">{data.key_points.map((k, i) => <li key={i} className="flex gap-2"><span className="text-primary font-bold">•</span><span className="leading-relaxed">{k}</span></li>)}</ul></div>
    </div>
  );
  if (name === "mcqs") return <div className="space-y-3 text-xs">{data.mcqs.map((m, i) => (
    <div key={i} className="p-2.5 rounded-lg border border-border bg-muted/30"><p className="font-bold mb-1.5">{i + 1}. {m.question}</p>
      <ul className="space-y-1 font-medium">{m.options.map((o, j) => <li key={j} className={j === m.correct_index ? "text-emerald-600 dark:text-emerald-400 font-bold" : "text-muted-foreground"}>{String.fromCharCode(65 + j)}. {o}</li>)}</ul></div>
  ))}</div>;
  if (name === "flashcards") return <div className="space-y-2 text-xs">{data.flashcards.map((f, i) => (
    <div key={i} className="rounded-xl border border-border p-3 bg-muted/20"><p className="font-bold text-foreground">{f.front}</p><p className="text-muted-foreground mt-1 leading-relaxed">{f.back}</p></div>
  ))}</div>;
  if (name === "exam-questions") return (
    <div className="text-xs space-y-3">
      {[["two_mark", "2-Mark"], ["five_mark", "5-Mark"], ["ten_mark", "10-Mark"]].map(([k, l]) => (
        <div key={k}><p className="font-bold text-foreground mb-1">{l} Questions</p><ul className="space-y-1 text-muted-foreground">{(data[k] || []).map((qq, i) => <li key={i} className="flex gap-1.5"><span className="text-primary">•</span><span>{qq}</span></li>)}</ul></div>
      ))}
    </div>
  );
  if (name === "viva") return <div className="space-y-2.5 text-xs">{data.viva.map((v, i) => (
    <div key={i} className="p-2.5 rounded-lg border border-border bg-muted/20"><p className="font-bold text-foreground">Q: {v.question}</p><p className="text-muted-foreground mt-1 leading-relaxed">A: {v.answer}</p></div>
  ))}</div>;
  return null;
}

