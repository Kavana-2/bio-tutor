import { useMemo, useState } from "react";
import ReactFlow, { Background, Controls, MarkerType } from "reactflow";
import "reactflow/dist/style.css";
import { Page } from "../components/common";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { useTheme } from "../context/ThemeContext";

const MAPS = {
  photosynthesis: {
    nodes: ["Photosynthesis", "Light Reactions", "Calvin Cycle", "Chlorophyll", "Chloroplast", "Water (Photolysis)", "CO₂", "Glucose", "Oxygen", "ATP & NADPH"],
    edges: [[0,1],[0,2],[0,4],[4,3],[1,5],[5,8],[1,9],[9,2],[2,6],[2,7]],
  },
  digestion: {
    nodes: ["Digestion", "Mouth", "Stomach", "Small Intestine", "Large Intestine", "Saliva/Amylase", "HCl & Pepsin", "Bile & Pancreas", "Villi (Absorption)", "Assimilation"],
    edges: [[0,1],[0,2],[0,3],[0,4],[1,5],[2,6],[3,7],[3,8],[8,9]],
  },
  respiratory: {
    nodes: ["Respiration", "Nose/Trachea", "Bronchi", "Bronchioles", "Alveoli", "Gas Exchange", "Diaphragm", "Inhalation", "Exhalation", "Haemoglobin"],
    edges: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,9],[0,6],[6,7],[6,8]],
  },
};
const TOPICS = [["photosynthesis", "Photosynthesis"], ["digestion", "Digestive System"], ["respiratory", "Respiratory System"]];

export default function ConceptMap() {
  const [topic, setTopic] = useState("photosynthesis");
  const { theme } = useTheme();

  const { nodes, edges } = useMemo(() => {
    const m = MAPS[topic];
    const cols = 3;
    const nodes = m.nodes.map((label, i) => ({
      id: String(i),
      data: { label },
      position: { x: (i % cols) * 240 + 40, y: Math.floor(i / cols) * 130 + 20 },
      style: {
        background: i === 0 ? "hsl(160 84% 36%)" : theme === "dark" ? "hsl(222 28% 13%)" : "#ffffff",
        color: i === 0 ? "#ffffff" : theme === "dark" ? "#F3F4F6" : "#111827",
        border: `1.5px solid ${i === 0 ? "hsl(160 84% 36%)" : theme === "dark" ? "hsl(217 20% 22%)" : "hsl(165 25% 88%)"}`,
        borderRadius: 14,
        fontSize: 13,
        fontWeight: 700,
        padding: "10px 14px",
        width: 190,
        textAlign: "center",
        boxShadow: i === 0 ? "0 4px 14px rgba(16, 185, 129, 0.25)" : "0 2px 8px rgba(0,0,0,0.04)",
      },
    }));
    const edges = m.edges.map(([s, t], i) => ({
      id: `e${i}`,
      source: String(s),
      target: String(t),
      animated: true,
      markerEnd: { type: MarkerType.ArrowClosed, color: theme === "dark" ? "#10b981" : "#059669" },
      style: { stroke: theme === "dark" ? "#10b981" : "#059669", strokeWidth: 1.8 },
    }));
    return { nodes, edges };
  }, [topic, theme]);

  return (
    <Page
      title="Concept Map Visualizer"
      subtitle="Interactive Knowledge Graph"
      testid="concept-map-page"
      actions={
        <Select value={topic} onValueChange={setTopic}>
          <SelectTrigger className="w-52 h-10 rounded-xl bg-card border-border font-semibold text-xs" data-testid="map-topic">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>{TOPICS.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
        </Select>
      }
    >
      <div className="rounded-2xl border border-border bg-card shadow-sm h-[70vh] overflow-hidden relative" data-testid="concept-map">
        <ReactFlow nodes={nodes} edges={edges} fitView proOptions={{ hideAttribution: true }}>
          <Background color={theme === "dark" ? "#374151" : "#E5E7EB"} gap={24} size={1} />
          <Controls />
        </ReactFlow>
      </div>
    </Page>
  );
}

