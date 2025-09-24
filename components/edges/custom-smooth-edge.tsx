"use client";

import React, { useCallback } from 'react';
import {
  EdgeProps,
  getBezierPath,
  getSmoothStepPath,
  EdgeLabelRenderer,
  useReactFlow,
  Node,
} from 'reactflow';
import { X, Edit2 } from 'lucide-react';

interface CustomSmoothEdgeProps extends EdgeProps {
  data?: {
    condition?: string;
    onDelete?: () => void;
    onEdit?: () => void;
    label?: string;
  };
}

export function CustomSmoothEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  data,
  selected,
  markerEnd,
}: CustomSmoothEdgeProps) {
  const { getNodes, setNodes } = useReactFlow();

  // Calculate smooth path with enhanced curve
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 20, // Smoother curves
  });

  // Handle edge deletion
  const onEdgeDelete = useCallback(() => {
    if (data?.onDelete) {
      data.onDelete();
    }
  }, [data]);

  // Handle edge editing
  const onEdgeEdit = useCallback(() => {
    if (data?.onEdit) {
      data.onEdit();
    }
  }, [data]);

  // Enhanced styling with smooth animations
  const edgeStyle = {
    strokeWidth: selected ? 3 : 2,
    stroke: selected ? '#ef4444' : style.stroke || '#64748b',
    strokeDasharray: selected ? '5,5' : undefined,
    filter: selected ? 'drop-shadow(0 0 6px rgba(239, 68, 68, 0.3))' : undefined,
    transition: 'all 0.2s ease-in-out',
    ...style,
  };

  return (
    <>
      <path
        id={id}
        style={edgeStyle}
        className="react-flow__edge-path"
        d={edgePath}
        markerEnd={markerEnd}
      />
      
      {/* Interactive edge label with controls */}
      {selected && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              fontSize: 12,
              pointerEvents: 'all',
            }}
            className="nodrag nopan"
          >
            <div className="bg-white/90 backdrop-blur-sm border border-gray-200 rounded-lg px-3 py-2 shadow-lg flex items-center gap-2">
              <span className="text-gray-700 font-medium">
                {data?.label || data?.condition || 'Connected'}
              </span>
              
              <div className="flex items-center gap-1">
                <button
                  onClick={onEdgeEdit}
                  className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-700 transition-colors"
                  title="Edit connection"
                >
                  <Edit2 size={12} />
                </button>
                
                <button
                  onClick={onEdgeDelete}
                  className="p-1 hover:bg-red-50 rounded text-red-400 hover:text-red-600 transition-colors"
                  title="Delete connection"
                >
                  <X size={12} />
                </button>
              </div>
            </div>
          </div>
        </EdgeLabelRenderer>
      )}
      
      {/* Connection indicator dots for better visual feedback */}
      <circle
        cx={sourceX}
        cy={sourceY}
        r={selected ? 4 : 2}
        fill={style.stroke || '#64748b'}
        className="react-flow__edge-source-indicator"
        style={{
          transition: 'all 0.2s ease-in-out',
          filter: selected ? 'drop-shadow(0 0 4px rgba(99, 102, 241, 0.4))' : undefined,
        }}
      />
      
      <circle
        cx={targetX}
        cy={targetY}
        r={selected ? 4 : 2}
        fill={style.stroke || '#64748b'}
        className="react-flow__edge-target-indicator"
        style={{
          transition: 'all 0.2s ease-in-out',
          filter: selected ? 'drop-shadow(0 0 4px rgba(99, 102, 241, 0.4))' : undefined,
        }}
      />
    </>
  );
}

// Bezier variant for more organic curves
export function CustomBezierEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  data,
  selected,
  markerEnd,
}: CustomSmoothEdgeProps) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    curvature: 0.25, // More pronounced curves
  });

  const edgeStyle = {
    strokeWidth: selected ? 3 : 2,
    stroke: selected ? '#8b5cf6' : style.stroke || '#64748b',
    strokeDasharray: selected ? '8,4' : undefined,
    filter: selected ? 'drop-shadow(0 0 8px rgba(139, 92, 246, 0.3))' : undefined,
    transition: 'all 0.3s ease-in-out',
    ...style,
  };

  return (
    <>
      <path
        id={id}
        style={edgeStyle}
        className="react-flow__edge-path"
        d={edgePath}
        markerEnd={markerEnd}
      />
      
      {selected && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              fontSize: 12,
              pointerEvents: 'all',
            }}
            className="nodrag nopan"
          >
            <div className="bg-purple-50/90 backdrop-blur-sm border border-purple-200 rounded-lg px-3 py-2 shadow-lg">
              <span className="text-purple-700 font-medium">
                {data?.label || 'Bezier Connection'}
              </span>
            </div>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

// Animated edge for active connections
export function AnimatedSmoothEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  data,
  selected,
  markerEnd,
}: CustomSmoothEdgeProps) {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 15,
  });

  const edgeStyle = {
    strokeWidth: 3,
    stroke: '#10b981',
    strokeDasharray: '10,5',
    filter: 'drop-shadow(0 0 6px rgba(16, 185, 129, 0.4))',
    animation: 'dash 1s linear infinite',
    ...style,
  };

  return (
    <>
      <style jsx>{`
        @keyframes dash {
          to {
            stroke-dashoffset: -15;
          }
        }
      `}</style>
      
      <path
        id={id}
        style={edgeStyle}
        className="react-flow__edge-path animated-edge"
        d={edgePath}
        markerEnd={markerEnd}
      />
      
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            fontSize: 11,
            pointerEvents: 'none',
          }}
        >
          <div className="bg-emerald-50/90 backdrop-blur-sm border border-emerald-200 rounded-full px-2 py-1 shadow-sm">
            <span className="text-emerald-700 font-medium text-xs">
              Active
            </span>
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}