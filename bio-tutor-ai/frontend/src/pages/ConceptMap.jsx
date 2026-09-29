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
        background: i === 0 ? "hsl(221 83% 53%)" : theme === "dark" ? "hsl(222 25% 14%)" : "#fff",
        color: i === 0 ? "#fff" : theme === "dark" ? "#F3F4F6" : "#111827",
        border: `1px solid ${theme === "dark" ? "#374151" : "#E5E7EB"}`,
        borderRadius: 8, fontSize: 13, fontWeight: 600, padding: 8, width: 180, textAlign: "center",
      },
    }));
    const edges = m.edges.map(([s, t], i) => ({
      id: `e${i}`, source: String(s), target: String(t), animated: true,
      markerEnd: { type: MarkerType.ArrowClosed },
      style: { stroke: theme === "dark" ? "#4B5563" : "#9CA3AF" },
    }));
    return { nodes, edges };
  }, [topic, theme]);

  return (
    <Page title="Concept Map" subtitle="Visual connections" testid="concept-map-page"
      actions={
        <Select value={topic} onValueChange={setTopic}>
          <SelectTrigger className="w-48" data-testid="map-topic"><SelectValue /></SelectTrigger>
          <SelectContent>{TOPICS.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
        </Select>
      }>
      <div className="rounded-lg border border-border bg-card h-[70vh]" data-testid="concept-map">
        <ReactFlow nodes={nodes} edges={edges} fitView proOptions={{ hideAttribution: true }}>
          <Background color={theme === "dark" ? "#374151" : "#E5E7EB"} gap={20} />
          <Controls />
        </ReactFlow>
      </div>
    </Page>
  );
}
