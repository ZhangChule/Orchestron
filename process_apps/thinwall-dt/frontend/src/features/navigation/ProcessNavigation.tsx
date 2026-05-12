import { useState, type PointerEvent as ReactPointerEvent } from "react";

import { Box, Stack, Typography } from "@mui/material";

import { DEFAULT_EXPANDED_NAV_IDS, NAV_TREE, PRIMARY, TEXT, TEXT_SECONDARY } from "../../app/constants";
import type { NavNode, SelectedNodeId } from "../../app/types";
import { GlassPanel } from "../../components/ui/GlassPanel";

// #region Recursive tree item
function TreeItem({
  node,
  selectedId,
  onOpenProperties,
  expandedNodeIds,
  onToggle,
  depth = 0,
}: {
  node: NavNode;
  selectedId: SelectedNodeId;
  onOpenProperties: (id: SelectedNodeId) => void;
  expandedNodeIds: Set<string>;
  onToggle: (id: string) => void;
  depth?: number;
}) {
  const isLeaf = !node.children?.length;
  const selected = node.id === selectedId;
  const expanded = isLeaf || expandedNodeIds.has(node.id);

  return (
    <Box>
      <Box
        component="button"
        type="button"
        aria-expanded={isLeaf ? undefined : expanded}
        onClick={() => (isLeaf ? onOpenProperties(node.id as SelectedNodeId) : onToggle(node.id))}
        sx={{
          width: "100%",
          minHeight: 30,
          pl: 1 + depth * 1.4,
          pr: 1,
          display: "flex",
          alignItems: "center",
          gap: 0.75,
          border: 0,
          borderRadius: 1,
          backgroundColor: selected ? "rgba(0,107,143,0.14)" : "transparent",
          color: TEXT,
          cursor: "pointer",
          textAlign: "left",
          font: "inherit",
          fontWeight: isLeaf ? 500 : 880,
          "&:hover": { backgroundColor: "rgba(255,255,255,0.36)" },
        }}
      >
        {isLeaf ? (
          <Box
            component="span"
            sx={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              backgroundColor: selected ? PRIMARY : "#8aa0b3",
              flexShrink: 0,
            }}
          />
        ) : (
          <Box
            component="span"
            sx={{
              width: 0,
              height: 0,
              borderTop: "4px solid transparent",
              borderBottom: "4px solid transparent",
              borderLeft: `6px solid ${TEXT_SECONDARY}`,
              transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
              transition: "transform 140ms ease",
              transformOrigin: "45% 50%",
              flexShrink: 0,
            }}
          />
        )}
        <Typography sx={{ minWidth: 0, fontSize: isLeaf ? 13 : 13.2, lineHeight: 1.25, fontWeight: isLeaf ? 500 : 880 }}>{node.label}</Typography>
      </Box>
      {expanded &&
        node.children?.map((child) => (
          <TreeItem
            key={child.id}
            node={child}
            selectedId={selectedId}
            onOpenProperties={onOpenProperties}
            expandedNodeIds={expandedNodeIds}
            onToggle={onToggle}
            depth={depth + 1}
          />
        ))}
    </Box>
  );
}
// #endregion

export function ProcessNavigation({
  selectedId,
  onOpenProperties,
  height,
  onResizeStart,
}: {
  selectedId: SelectedNodeId;
  onOpenProperties: (id: SelectedNodeId) => void;
  height: number | null;
  onResizeStart: (event: ReactPointerEvent<HTMLElement>) => void;
}) {
  const [expandedNodeIds, setExpandedNodeIds] = useState<Set<string>>(() => new Set(DEFAULT_EXPANDED_NAV_IDS));

  function toggleNode(id: string) {
    setExpandedNodeIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  return (
    <GlassPanel
      sx={{
        position: "absolute",
        top: 18,
        left: 18,
        bottom: height == null ? 18 : undefined,
        zIndex: 5,
        width: 300,
        height: height ?? undefined,
        minHeight: 260,
        maxHeight: "calc(100% - 36px)",
        borderRadius: "22px",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <Box sx={{ px: 1.55, py: 1.35, borderBottom: "1px solid rgba(255,255,255,0.28)" }}>
        <Typography sx={{ fontSize: 16, lineHeight: 1, fontWeight: 850 }}>工艺流程</Typography>
      </Box>
      <Stack spacing={0.35} sx={{ flex: 1, minHeight: 0, overflowY: "auto", px: 1, py: 1 }}>
        {NAV_TREE.map((node) => (
          <TreeItem
            key={node.id}
            node={node}
            selectedId={selectedId}
            onOpenProperties={onOpenProperties}
            expandedNodeIds={expandedNodeIds}
            onToggle={toggleNode}
          />
        ))}
      </Stack>
      <Box
        onPointerDown={onResizeStart}
        sx={{
          height: 14,
          display: "grid",
          placeItems: "center",
          cursor: "ns-resize",
          touchAction: "none",
          borderTop: "1px solid rgba(255,255,255,0.26)",
        }}
      >
        <Box sx={{ width: 42, height: 3, borderRadius: 999, backgroundColor: "rgba(16,38,56,0.32)" }} />
      </Box>
    </GlassPanel>
  );
}
