
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, Download, FileText, Loader2, ExternalLink } from "lucide-react";

interface FilePreviewPanelProps {
  selectedNode: string;
  selectedNodeName?: string;
  canvasId: string;
  onClose: () => void;
}

export function FilePreviewPanel({
  selectedNode,
  selectedNodeName,
  canvasId,
  onClose,
}: FilePreviewPanelProps) {
  const [content, setContent] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [fileMeta, setFileMeta] = useState<any>(null);

  useEffect(() => {
    let mounted = true;

    async function fetchFileNode() {
      if (!selectedNode || !canvasId) return;
      setLoading(true);
      try {
        const res = await fetch(`/api/canvases/${canvasId}/nodes/${selectedNode}`);
        if (!res.ok) throw new Error("Failed to fetch node");
        const node = await res.json();
        
        // Assuming node.data stores the file info
        if (mounted) {
           // We prefer 'content' field in node data or 'contextContract' where text might be stored
           // For externalContext, we expect content in data.content or external_files table
           
           // If the node data has content directly (legacy or small files)
           let displayContent = node.data?.content || node.contextContract || "";

            // Fallback: If content is empty but we have a file reference, maybe show "Preview not available"
           if (!displayContent && node.data?.loading) {
               displayContent = "Processing file...";
           } else if (!displayContent) {
               displayContent = "(No text content extracted)";
           }

           setContent(displayContent);
           setFileMeta(node.data);
        }
      } catch (err) {
        console.error("Error fetching file node:", err);
        if (mounted) setContent("Error loading file content.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchFileNode();
    return () => { mounted = false; };
  }, [selectedNode, canvasId]);

  const handleDownload = async () => {
      // If we have an endpoint for raw download (which we added: get_file_binary in python backend, 
      // but exposure via Next.js endpoint is missing or we use the preview text)
      
      // For now, let's download the text content
      const blob = new Blob([content], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = selectedNodeName || "download.txt";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full bg-white border-l border-slate-200 shadow-xl">
      {/* Header */}
      <div className="flex-none p-4 border-b border-slate-200 flex items-center justify-between bg-white/80 backdrop-blur-sm z-10">
        <div className="flex items-center space-x-3 overflow-hidden">
          <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600 flex-shrink-0">
            <FileText size={16} />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-slate-800 truncate">
              {selectedNodeName || "File Preview"}
            </h2>
            <p className="text-xs text-slate-500 truncate">
               {fileMeta?.size ? `${(fileMeta.size / 1024).toFixed(1)} KB` : "Document"}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-1">
            <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-slate-500 hover:text-slate-700"
                onClick={handleDownload}
                title="Download extracted text"
            >
                <Download size={16} />
            </Button>
            <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-slate-500 hover:text-slate-700"
                onClick={onClose}
            >
                <X size={16} />
            </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto bg-slate-50 p-6">
         {loading ? (
             <div className="flex items-center justify-center h-full text-slate-400">
                 <Loader2 className="animate-spin mr-2" />
                 Loading content...
             </div>
         ) : (
             <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8 min-h-full font-mono text-sm leading-relaxed whitespace-pre-wrap text-slate-700">
                 {content}
             </div>
         )}
      </div>
    </div>
  );
}
