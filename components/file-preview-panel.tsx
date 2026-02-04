
import { useMemo, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, Download, FileText, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

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
  const [rawText, setRawText] = useState<string>("");
  const [docxHtml, setDocxHtml] = useState<string>("");
  const [rawLoading, setRawLoading] = useState(false);
  const [rawError, setRawError] = useState<string | null>(null);

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
           const errorMessage =
             node.data?.error || node.error || "";
           let displayContent = errorMessage || node.data?.content || node.contextContract || "";

            // Fallback: If content is empty but we have a file reference, maybe show "Preview not available"
           if (!displayContent && node.data?.loading) {
               displayContent = "Processing file...";
           } else if (!displayContent) {
               displayContent = "(No text content extracted)";
           }

           setContent(displayContent);
           setFileMeta({
             ...(node.data || {}),
             error: errorMessage || undefined,
           });
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

  const inferFileKind = (type?: string, name?: string) => {
    const lowerType = (type || "").toLowerCase();
    const lowerName = (name || "").toLowerCase();

    if (lowerType.startsWith("image/") || /\.(png|jpe?g|gif|webp|bmp|svg)$/.test(lowerName)) {
      return "image";
    }
    if (lowerType === "application/pdf" || lowerName.endsWith(".pdf")) return "pdf";
    if (
      lowerType.includes("wordprocessingml.document") ||
      lowerName.endsWith(".docx")
    )
      return "docx";
    if (lowerType === "text/csv" || lowerName.endsWith(".csv")) return "csv";
    if (lowerType === "text/markdown" || lowerName.endsWith(".md")) return "markdown";
    if (lowerType.startsWith("text/") || /\.(txt|log|json|yaml|yml)$/.test(lowerName)) {
      return "text";
    }
    return "unknown";
  };

  const fileName = selectedNodeName || fileMeta?.label || "Document";
  const fileType = fileMeta?.fileType || fileMeta?.file_type || "";
  const fileKind = useMemo(
    () => inferFileKind(fileType, fileName),
    [fileType, fileName]
  );

  useEffect(() => {
    if (!selectedNode) return;
    let mounted = true;
    const fetchRaw = async () => {
      setRawLoading(true);
      setRawError(null);
      try {
        const res = await fetch(`/api/files/${selectedNode}/raw`);
        if (!res.ok) {
          throw new Error(await res.text());
        }
        const text = await res.text();
        if (mounted) setRawText(text);
      } catch (err) {
        console.error("Error loading raw file:", err);
        if (mounted) setRawError("Failed to load raw file content.");
      } finally {
        if (mounted) setRawLoading(false);
      }
    };

    const fetchDocx = async () => {
      setRawLoading(true);
      setRawError(null);
      try {
        const res = await fetch(`/api/files/${selectedNode}/docx`);
        if (!res.ok) {
          throw new Error(await res.text());
        }
        const data = await res.json();
        if (mounted) setDocxHtml(data.html || "");
      } catch (err) {
        console.error("Error rendering docx:", err);
        if (mounted) setRawError("Failed to render DOCX preview.");
      } finally {
        if (mounted) setRawLoading(false);
      }
    };

    setRawText("");
    setDocxHtml("");

    if (fileKind === "text" || fileKind === "csv" || fileKind === "markdown") {
      fetchRaw();
    } else if (fileKind === "docx") {
      fetchDocx();
    }

    return () => {
      mounted = false;
    };
  }, [selectedNode, fileKind]);

  const parseCsv = (text: string) => {
    const rows: string[][] = [];
    let current = "";
    let row: string[] = [];
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const next = text[i + 1];
      if (char === '"' && inQuotes && next === '"') {
        current += '"';
        i++;
        continue;
      }
      if (char === '"') {
        inQuotes = !inQuotes;
        continue;
      }
      if (char === "," && !inQuotes) {
        row.push(current);
        current = "";
        continue;
      }
      if ((char === "\n" || char === "\r") && !inQuotes) {
        if (char === "\r" && next === "\n") i++;
        row.push(current);
        if (row.length > 1 || row[0] !== "") rows.push(row);
        row = [];
        current = "";
        continue;
      }
      current += char;
    }
    row.push(current);
    if (row.length > 1 || row[0] !== "") rows.push(row);
    return rows;
  };

  const csvRows = useMemo(() => {
    if (fileKind !== "csv" || !rawText) return [];
    return parseCsv(rawText);
  }, [fileKind, rawText]);

  const handleDownload = async () => {
    try {
      const res = await fetch(`/api/files/${selectedNode}/raw`);
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const headerName = res.headers.get("x-file-name");
      const downloadName = headerName || fileName || "download";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = downloadName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download failed", err);
    }
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
              {fileName || "File Preview"}
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
                title="Download original file"
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
        {loading || rawLoading ? (
          <div className="flex items-center justify-center h-full text-slate-400">
            <Loader2 className="animate-spin mr-2" />
            Loading preview...
          </div>
        ) : rawError || fileMeta?.error ? (
          <div className="bg-white rounded-lg shadow-sm border border-rose-200 p-6 text-sm text-rose-700">
            {rawError || fileMeta?.error}
          </div>
        ) : fileKind === "pdf" ? (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden h-full">
            <iframe
              src={`/api/files/${selectedNode}/raw`}
              className="w-full h-full"
              title="PDF Preview"
            />
          </div>
        ) : fileKind === "image" ? (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 flex items-center justify-center">
            <img
              src={`/api/files/${selectedNode}/raw`}
              alt={fileName}
              className="max-h-full max-w-full object-contain"
            />
          </div>
        ) : fileKind === "docx" ? (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 text-sm text-slate-700">
            {docxHtml ? (
              <div
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: docxHtml }}
              />
            ) : (
              "No preview available."
            )}
          </div>
        ) : fileKind === "markdown" ? (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 text-sm text-slate-700">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {rawText || ""}
            </ReactMarkdown>
          </div>
        ) : fileKind === "csv" ? (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-auto">
            {csvRows.length ? (
              <table className="min-w-full text-xs text-slate-700">
                <thead className="bg-slate-100 text-slate-600">
                  <tr>
                    {csvRows[0].map((cell, idx) => (
                      <th key={idx} className="px-3 py-2 text-left font-semibold">
                        {cell || `Column ${idx + 1}`}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {csvRows.slice(1, 101).map((row, rIdx) => (
                    <tr key={rIdx} className="border-t border-slate-200">
                      {row.map((cell, cIdx) => (
                        <td key={cIdx} className="px-3 py-2 whitespace-pre-wrap">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-6 text-sm text-slate-500">
                No CSV data available.
              </div>
            )}
          </div>
        ) : fileKind === "text" ? (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 min-h-full font-mono text-sm leading-relaxed whitespace-pre-wrap text-slate-700">
            {rawText || ""}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 text-sm text-slate-600">
            {content || "No preview available."}
          </div>
        )}
      </div>
    </div>
  );
}
