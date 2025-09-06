"use client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  GitBranch, 
  MessageCircle, 
  Settings, 
  Activity,
  Zap,
  ArrowRight,
  TrendingUp,
  Target,
  Workflow
} from "lucide-react";
import { useState, useEffect } from "react";

interface BranchNodeData {
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
  branchCount?: number;
  activeThreads?: number;
  highlightTier?: 0 | 1 | 2;
  size?: "small" | "medium" | "large";
  style?: "minimal" | "modern" | "glass" | "gradient";
  borderRadius?: number;
  opacity?: number;
}

interface ShowcaseNodeProps {
  data: BranchNodeData;
  selected: boolean;
}

export function BranchNodeShowcase({ data, selected }: ShowcaseNodeProps) {
  const [hovered, setHovered] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [branchPulse, setBranchPulse] = useState(false);

  const handleClick = () => {
    setIsAnimating(true);
    setBranchPulse(true);
    setTimeout(() => {
      setIsAnimating(false);
      setBranchPulse(false);
    }, 500);
    data.onClick?.();
  };

  // Get size configuration
  const sizeConfig = {
    small: { width: "120px", height: "90px", padding: "8px", textSize: "text-xs", iconSize: 14 },
    medium: { width: "160px", height: "120px", padding: "12px", textSize: "text-sm", iconSize: 16 },
    large: { width: "200px", height: "150px", padding: "16px", textSize: "text-base", iconSize: 18 },
  };

  const config = sizeConfig[data.size || "medium"];

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

  // Branch pulse animation
  useEffect(() => {
    if (selected || hovered) {
      const interval = setInterval(() => {
        setBranchPulse(true);
        setTimeout(() => setBranchPulse(false), 800);
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [selected, hovered]);

  const borderColor = data.dotColor || "#f59e0b";
  const backgroundColor = data.color || "#fefbeb";
  const textColor = data.textColor || "#92400e";

  return (
    <div className="relative" style={{ width: config.width, height: config.height }}>
      {/* Mock ReactFlow handles - Multiple outputs for branches */}
      <div className="absolute -left-1 top-1/2 transform -translate-y-1/2 w-3 h-3 bg-gray-400 rounded-full border-2 border-white shadow-sm"></div>
      
      {/* Multiple output handles based on branch count */}
      {Array.from({ length: data.branchCount || 2 }).map((_, index) => (
        <div 
          key={index}
          className="absolute -right-1 w-3 h-3 bg-gray-400 rounded-full border-2 border-white shadow-sm"
          style={{
            top: `${30 + (index * 40 / (data.branchCount || 2))}%`,
          }}
        />
      ))}
      
      <Card 
        className={`${getStyleClasses()} ${selected ? 'ring-2 ring-orange-400 ring-opacity-60' : ''} ${
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
        {/* Branch lines animation */}
        {branchPulse && (
          <div className="absolute inset-0 pointer-events-none">
            <svg 
              className="absolute top-0 left-0 w-full h-full"
              style={{ zIndex: 1 }}
            >
              {Array.from({ length: data.branchCount || 2 }).map((_, index) => (
                <line
                  key={index}
                  x1="75%"
                  y1="50%"
                  x2="100%"
                  y2={`${30 + (index * 40 / (data.branchCount || 2))}%`}
                  stroke={borderColor}
                  strokeWidth="2"
                  className="animate-pulse"
                  style={{
                    animation: `branchPulse 0.8s ease-in-out`,
                    opacity: 0.6,
                  }}
                />
              ))}
            </svg>
          </div>
        )}

        {/* Header with branch icon and settings */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div 
              className={`p-1.5 rounded-lg ${selected ? 'bg-orange-100' : 'bg-gray-100'} transition-colors`}
              style={{ color: selected ? borderColor : textColor }}
            >
              <GitBranch size={config.iconSize} />
            </div>
            
            {data.branchCount && (
              <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                {data.branchCount} paths
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
              <MessageCircle size={12} style={{ color: borderColor }} />
              <span className="text-xs" style={{ color: textColor }}>
                {data.messageCount}
              </span>
            </div>
            
            {data.model && (
              <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                {data.model}
              </Badge>
            )}
          </div>

          {/* Active threads indicator */}
          {data.activeThreads !== undefined && (
            <div className="flex items-center gap-1">
              <TrendingUp size={10} style={{ color: borderColor }} />
              <span className="text-xs" style={{ color: textColor }}>
                {data.activeThreads} active
              </span>
            </div>
          )}

          {/* Activity indicator */}
          {selected && (
            <div className="flex items-center gap-1 pt-1">
              <Activity size={10} className="text-orange-500 animate-pulse" />
              <span className="text-xs text-orange-600">Routing</span>
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

        {/* Highlight tier indicator */}
        {data.highlightTier !== undefined && data.highlightTier > 0 && (
          <div className="absolute top-2 right-2">
            <div 
              className={`w-2 h-2 rounded-full ${
                data.highlightTier === 1 ? 'bg-yellow-400' : 'bg-red-400'
              }`}
            />
          </div>
        )}

        {/* Branch count visualization */}
        {data.branchCount && data.branchCount > 2 && (
          <div className="absolute bottom-2 right-2">
            <div className="flex items-center gap-1">
              <Workflow size={10} style={{ color: borderColor }} />
              <span className="text-xs font-medium" style={{ color: textColor }}>
                {data.branchCount}
              </span>
            </div>
          </div>
        )}

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
