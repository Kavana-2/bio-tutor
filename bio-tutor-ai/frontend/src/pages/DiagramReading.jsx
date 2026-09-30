import { useState, useRef } from "react";
import api, { formatApiError } from "../lib/api";
import { Page, Card, EmptyState } from "../components/common";
import { Button } from "../components/ui/button";
import { Upload, ImageIcon, Volume2, Loader2, ScanText, Info, CheckCircle2 } from "lucide-react";
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
      else toast.info("No Biology labels recognized");
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    } finally {
      setLoading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <Page
      title="Diagram Reading & OCR Analysis"
      subtitle="On-Device Label OCR & Biology Explanation"
      testid="diagram-page"
      actions={
        <>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} data-testid="diagram-file-input" />
          <Button onClick={() => fileRef.current?.click()} disabled={loading} className="font-semibold shadow-md shadow-primary/20" data-testid="diagram-upload-btn">
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
            Upload Diagram Image
          </Button>
        </>
      }
    >
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 mb-6 flex items-start gap-3 text-xs leading-relaxed">
        <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
        <p className="text-muted-foreground">
          Upload a labelled Biology diagram (e.g. leaf cross-section, digestive tract, or lungs). The AI extracts text labels via on-device OCR and explains each anatomical structure from verified Biology knowledge base.
        </p>
      </div>

      {!preview && !result ? (
        <EmptyState
          icon={ImageIcon}
          title="No diagram uploaded yet"
          description="Choose an image file with clear text labels. Supported topics: Photosynthesis, Digestive System, Respiratory System."
          action={
            <Button onClick={() => fileRef.current?.click()} className="font-semibold shadow-md shadow-primary/20" data-testid="diagram-empty-upload">
              <Upload className="h-4 w-4 mr-2" /> Select Diagram Image
            </Button>
          }
          testid="diagram-empty"
        />
      ) : (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            {preview && (
              <Card className="p-3">
                <img
                  src={preview}
                  alt="Uploaded diagram"
                  className="w-full rounded-xl border border-border object-contain max-h-[420px] bg-muted/20"
                  data-testid="diagram-preview"
                />
              </Card>
            )}
            {result?.detected_labels?.length > 0 && (
              <Card>
                <h3 className="font-bold text-sm tracking-tight font-display mb-3 flex items-center gap-2">
                  <ScanText className="h-4 w-4 text-primary" /> Extracted Label Chips
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {result.detected_labels.map((l, i) => (
                    <span key={i} className="text-xs font-semibold rounded-full bg-primary/10 text-primary px-2.5 py-1">
                      {l}
                    </span>
                  ))}
                </div>
              </Card>
            )}
          </div>

          <div className="space-y-4">
            {loading && (
              <Card className="flex items-center gap-3 text-xs font-semibold text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin text-primary" /> Processing image & running OCR scan...
              </Card>
            )}
            {result && result.overall_topic && (
              <div className="rounded-xl border border-primary/20 bg-primary/10 px-4 py-3 text-xs font-bold text-primary flex items-center gap-2" data-testid="diagram-topic">
                <CheckCircle2 className="h-4 w-4" /> Detected Topic: {result.overall_topic}
              </div>
            )}
            {result && result.recognized_count === 0 && !loading && (
              <Card data-testid="diagram-no-labels">
                <p className="text-xs text-muted-foreground">{result.message}</p>
              </Card>
            )}
            {result?.explained_labels?.map((item, i) => (
              <Card key={i} data-testid="diagram-label-card">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h4 className="font-bold text-sm text-foreground capitalize font-display">{item.label}</h4>
                  {supported && (
                    <button
                      onClick={() => speak(`${item.label}. ${item.explanation}`)}
                      className="p-1 rounded-lg text-primary hover:bg-primary/10 shrink-0 transition-colors"
                      data-testid="diagram-speak"
                      title="Read explanation"
                    >
                      <Volume2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <p className="text-xs sm:text-sm leading-relaxed text-muted-foreground">{item.explanation}</p>
                {item.topic && (
                  <span className="inline-block mt-3 text-[11px] font-semibold rounded-full bg-muted px-2.5 py-0.5 text-muted-foreground">
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

