"use client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Database, 
  MessageCircle, 
  Settings, 
  Activity,
  FileText,
  Image,
  Video,
  Code,
  BarChart3,
  Zap,
  ArrowRight,
  Eye
} from "lucide-react";
import { useState, useEffect } from "react";

interface ContextNodeData {
  label: string;
  messageCount: number;
  isSelected: boolean;
  onClick?: () => void;
  onSettingsClick?: () => void;
  color?: string;
  textColor?: string;
  dotColor?: string;
  model?: string;
  metaTags?: string[];
  dataType?: "text" | "image" | "video" | "code" | "mixed";
  contextSize?: number;
  size?: "small" | "medium" | "large";
  style?: "minimal" | "modern" | "glass" | "gradient";
  borderRadius?: number;
  opacity?: number;
}

interface ShowcaseNodeProps {
  data: ContextNodeData;
  selected: boolean;
}

export function ContextNodeShowcase({ data, selected }: ShowcaseNodeProps) {
  const [hovered, setHovered] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [dataFlow, setDataFlow] = useState(false);

  const handleClick = () => {
    setIsAnimating(true);
    setDataFlow(true);
    setTimeout(() => {
      setIsAnimating(false);
      setDataFlow(false);
    }, 600);
    data.onClick?.();
  };

  // Get size configuration
  const sizeConfig = {
    small: { width: "120px", height: "90px", padding: "8px", textSize: "text-xs", iconSize: 14 },
    medium: { width: "160px", height: "120px", padding: "12px", textSize: "text-sm", iconSize: 16 },
    large: { width: "200px", height: "150px", padding: "16px", textSize: "text-base", iconSize: 18 },
  };

  const config = sizeConfig[data.size || "medium"];

  // Get data type icon
  const getDataTypeIcon = () => {
    switch (data.dataType) {
      case "image":
        return <Image size={config.iconSize} />;
      case "video":
        return <Video size={config.iconSize} />;
      case "code":
        return <Code size={config.iconSize} />;
      case "mixed":
        return <BarChart3 size={config.iconSize} />;
      case "text":
      default:
        return <FileText size={config.iconSize} />;
    }
  };

  // Generate style classes
  const getStyleClasses = () => {
    const baseClasses = "transition-all duration-300 cursor-pointer relative overflow-hidden";
    
    switch (data.style) {
      case "minimal":
        return `${baseClasses} border-2 bg-white shadow-sm hover:shadow-md`;
      case "glass":
        return `${baseClasses} bg-white/80 backdrop-blur-sm border border-white/30 shadow-lg hover:shadow-xl`;
      case "gradient":
        return `${baseClasses} bg-gradient-to-br border shadow-lg hover:shadow-xl`;
      case "modern":
      default:
        return `${baseClasses} bg-white border shadow-md hover:shadow-lg`;
    }
  };

  // Data flow animation
  useEffect(() => {
    if (selected || hovered) {
      const interval = setInterval(() => {
        setDataFlow(true);
        setTimeout(() => setDataFlow(false), 1000);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [selected, hovered]);

  const borderColor = data.dotColor || "#059669";
  const backgroundColor = data.color || "#f0fdf4";
  const textColor = data.textColor || "#14532d";

  return (
    <div className="relative" style={{ width: config.width, height: config.height }}>
      {/* Mock ReactFlow handles */}
      <div className="absolute -left-1 top-1/2 transform -translate-y-1/2 w-3 h-3 bg-gray-400 rounded-full border-2 border-white shadow-sm"></div>
      <div className="absolute -right-1 top-1/2 transform -translate-y-1/2 w-3 h-3 bg-gray-400 rounded-full border-2 border-white shadow-sm"></div>
      
      <Card 
        className={`${getStyleClasses()} ${selected ? 'ring-2 ring-green-400 ring-opacity-60' : ''} ${
          hovered ? 'scale-105' : ''
        } ${isAnimating ? 'scale-95' : ''}`}
        style={{ 
          backgroundColor,
          borderColor: selected ? borderColor : undefined,
          borderRadius: `${data.borderRadius || 12}px`,
          opacity: data.opacity || 1,
          padding: config.padding,
          width: '100%',
          height: '100%'
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={handleClick}
      >
        {/* Data flow animation */}
        {dataFlow && (
          <div className="absolute inset-0 pointer-events-none">
            <div 
              className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-green-400 to-transparent opacity-60"
              style={{
                animation: "dataFlow 1s ease-in-out",
              }}
            />
          </div>
        )}

        {/* Header with data type icon and settings */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div 
              className={`p-1.5 rounded-lg ${selected ? 'bg-green-100' : 'bg-gray-100'} transition-colors`}
              style={{ color: selected ? borderColor : textColor }}
            >
              {getDataTypeIcon()}
            </div>
            
            {data.dataType && (
              <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                {data.dataType}
              </Badge>
            )}
          </div>
          
          <button 
            onClick={(e) => {
              e.stopPropagation();
              data.onSettingsClick?.();
            }}
            className="p-1 rounded-md hover:bg-gray-100 transition-colors opacity-0 group-hover:opacity-100"
          >
            <Settings size={12} style={{ color: textColor }} />
          </button>
        </div>

        {/* Main content */}
        <div className="space-y-2">
          <h3 
            className={`font-semibold ${config.textSize} leading-tight truncate`}
            style={{ color: textColor }}
          >
            {data.label}
          </h3>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Database size={12} style={{ color: borderColor }} />
              <span className="text-xs" style={{ color: textColor }}>
                {data.contextSize ? `${(data.contextSize / 1024).toFixed(1)}K` : data.messageCount}
              </span>
            </div>
            
            {data.model && (
              <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                {data.model}
              </Badge>
            )}
          </div>

          {/* Context size indicator */}
          {data.contextSize && (
            <div className="flex items-center gap-1">
              <BarChart3 size={10} style={{ color: borderColor }} />
              <span className="text-xs" style={{ color: textColor }}>
                {data.contextSize} tokens
              </span>
            </div>
          )}

          {/* Activity indicator */}
          {selected && (
            <div className="flex items-center gap-1 pt-1">
              <Activity size={10} className="text-green-500 animate-pulse" />
              <span className="text-xs text-green-600">Processing</span>
            </div>
          )}

          {/* Meta tags */}
          {data.metaTags && data.metaTags.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {data.metaTags.slice(0, 2).map((tag, index) => (
                <Badge key={index} variant="secondary" className="text-xs px-1 py-0">
                  {tag}
                </Badge>
              ))}
              {data.metaTags.length > 2 && (
                <span className="text-xs text-gray-500">+{data.metaTags.length - 2}</span>
              )}
            </div>
          )}
        </div>

        {/* Data type indicator dot */}
        <div className="absolute top-2 right-2">
          <div 
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ backgroundColor: borderColor }}
          />
        </div>

        {/* Selection glow effect */}
        {selected && (
          <div 
            className="absolute inset-0 rounded-lg pointer-events-none"
            style={{
              boxShadow: `0 0 0 2px ${borderColor}40, 0 0 20px ${borderColor}20`,
              borderRadius: `${data.borderRadius || 12}px`,
            }}
          />
        )}
      </Card>
    </div>
  );
}
