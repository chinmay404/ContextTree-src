"use client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Play, 
  MessageCircle, 
  Settings, 
  Activity,
  Sparkles,
  Zap,
  ArrowRight,
  Eye,
  Star
} from "lucide-react";
import { useState, useEffect } from "react";

interface EntryNodeData {
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
  lastMessageAt?: string;
  createdAt?: string;
  primary?: boolean;
  highlightTier?: 0 | 1 | 2;
  size?: "small" | "medium" | "large";
  style?: "minimal" | "modern" | "glass" | "gradient";
  borderRadius?: number;
  opacity?: number;
}

interface ShowcaseNodeProps {
  data: EntryNodeData;
  selected: boolean;
}

export function EntryNodeShowcase({ data, selected }: ShowcaseNodeProps) {
  const [hovered, setHovered] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [pulseAnimation, setPulseAnimation] = useState(false);

  const handleClick = () => {
    setIsAnimating(true);
    setPulseAnimation(true);
    setTimeout(() => {
      setIsAnimating(false);
      setPulseAnimation(false);
    }, 300);
    data.onClick?.();
  };

  // Get size configuration
  const sizeConfig = {
    small: { width: "120px", height: "90px", padding: "8px", textSize: "text-xs", iconSize: 14 },
    medium: { width: "160px", height: "120px", padding: "12px", textSize: "text-sm", iconSize: 16 },
    large: { width: "200px", height: "150px", padding: "16px", textSize: "text-base", iconSize: 18 },
  };

  const config = sizeConfig[data.size || "medium"];

  // Generate style classes based on style prop
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

  // Particle animation for enhanced visual appeal
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; delay: number }>>([]);

  useEffect(() => {
    if (selected || hovered) {
      const newParticles = Array.from({ length: 3 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        delay: Math.random() * 2,
      }));
      setParticles(newParticles);
    }
  }, [selected, hovered]);

  const borderColor = data.dotColor || "#6366f1";
  const backgroundColor = data.color || "#f8fafc";
  const textColor = data.textColor || "#334155";

  return (
    <div className="relative" style={{ width: config.width, height: config.height }}>
      {/* Mock ReactFlow handles */}
      <div className="absolute -left-1 top-1/2 transform -translate-y-1/2 w-3 h-3 bg-gray-400 rounded-full border-2 border-white shadow-sm"></div>
      <div className="absolute -right-1 top-1/2 transform -translate-y-1/2 w-3 h-3 bg-gray-400 rounded-full border-2 border-white shadow-sm"></div>
      
      <Card 
        className={`${getStyleClasses()} ${selected ? 'ring-2 ring-blue-400 ring-opacity-60' : ''} ${
          hovered ? 'scale-105' : ''
        } ${isAnimating ? 'scale-95' : ''} ${pulseAnimation ? 'animate-pulse' : ''}`}
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
        {/* Floating particles for visual interest */}
        {(selected || hovered) && particles.map((particle) => (
          <div
            key={particle.id}
            className="absolute w-1 h-1 bg-blue-400 rounded-full animate-ping opacity-60"
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              animationDelay: `${particle.delay}s`,
            }}
          />
        ))}

        {/* Header with icon and settings */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div 
              className={`p-1.5 rounded-lg ${selected ? 'bg-blue-100' : 'bg-gray-100'} transition-colors`}
              style={{ color: selected ? borderColor : textColor }}
            >
              <Play size={config.iconSize} />
            </div>
            {data.primary && (
              <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                <Star size={10} className="mr-1" />
                Primary
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

          {/* Activity indicator */}
          {selected && (
            <div className="flex items-center gap-1 pt-1">
              <Activity size={10} className="text-green-500 animate-pulse" />
              <span className="text-xs text-green-600">Active</span>
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
