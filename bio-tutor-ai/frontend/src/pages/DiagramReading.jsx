import { useState, useRef } from "react";
import api, { formatApiError } from "../lib/api";
import { Page, Card, EmptyState } from "../components/common";
import { Button } from "../components/ui/button";
import { Upload, ImageIcon, Volume2, Loader2, ScanText, Info } from "lucide-react";
import { useSpeech } from "../hooks/useSpeech";
import { toast } from "sonner";

export default function DiagramReading() {
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef(null);
  const { speak, supported } = useSpeech();

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Please choose an image file");
    setPreview(URL.createObjectURL(file));
    setResult(null);
    setLoading(true);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const { data } = await api.post("/diagrams/explain", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setResult(data);
      if (data.recognized_count > 0) toast.success(`Recognised ${data.recognized_count} labels`);
      else toast.info("No Biology labels recognised");
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    } finally {
      setLoading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <Page title="Diagram Reading" subtitle="Explain labelled diagrams" testid="diagram-page"
      actions={
        <>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} data-testid="diagram-file-input" />
          <Button onClick={() => fileRef.current?.click()} disabled={loading} data-testid="diagram-upload-btn">
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Upload className="h-4 w-4 mr-1" />}
            Upload Diagram
          </Button>
        </>
      }>
      <div className="rounded-md border border-border bg-accent/50 p-4 mb-6 flex items-start gap-3 text-sm">
        <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
        <p className="text-muted-foreground">
          Upload a labelled Biology diagram (e.g. a leaf cross-section, the digestive tract, or the lungs). The AI reads
          the labels on the image using on-device OCR and explains each part from its verified Biology knowledge base — no external AI service.
        </p>
      </div>

      {!preview && !result ? (
        <EmptyState icon={ImageIcon} title="No diagram uploaded"
          description="Choose a clear image where the labels are readable. Supported topics: Photosynthesis, Digestive System, Respiratory System."
          action={<Button onClick={() => fileRef.current?.click()} data-testid="diagram-empty-upload"><Upload className="h-4 w-4 mr-1" /> Upload a diagram</Button>}
          testid="diagram-empty" />
      ) : (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            {preview && (
              <Card className="p-3">
                <img src={preview} alt="Uploaded diagram" className="w-full rounded-md border border-border object-contain max-h-[420px]" data-testid="diagram-preview" />
              </Card>
            )}
            {result?.detected_labels?.length > 0 && (
              <Card>
                <h3 className="font-semibold tracking-tight mb-2 flex items-center gap-2"><ScanText className="h-4 w-4 text-primary" /> Detected text</h3>
                <div className="flex flex-wrap gap-1.5">
                  {result.detected_labels.map((l, i) => (
                    <span key={i} className="text-xs rounded-full bg-secondary px-2 py-0.5 text-muted-foreground">{l}</span>
                  ))}
                </div>
              </Card>
            )}
          </div>

          <div className="space-y-4">
            {loading && <Card className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Reading diagram…</Card>}
            {result && result.overall_topic && (
              <div className="rounded-md bg-accent px-4 py-3 text-sm font-medium text-accent-foreground" data-testid="diagram-topic">
                Detected topic: {result.overall_topic}
              </div>
            )}
            {result && result.recognized_count === 0 && !loading && (
              <Card data-testid="diagram-no-labels"><p className="text-sm text-muted-foreground">{result.message}</p></Card>
            )}
            {result?.explained_labels?.map((item, i) => (
              <Card key={i} data-testid="diagram-label-card">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h4 className="font-semibold tracking-tight capitalize">{item.label}</h4>
                  {supported && (
                    <button onClick={() => speak(`${item.label}. ${item.explanation}`)} className="text-primary shrink-0" data-testid="diagram-speak">
                      <Volume2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">{item.explanation}</p>
                {item.topic && (
                  <span className="inline-block mt-2 text-[11px] rounded-full bg-secondary px-2 py-0.5 text-muted-foreground">
                    {item.topic} · {(item.confidence * 100).toFixed(0)}% match
                  </span>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}
    </Page>
  );
}
