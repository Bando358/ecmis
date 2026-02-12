"use client";

import { useCallback, useMemo, useState } from "react";
import { OrgUnitSelection, OrgUnitTreeNode } from "@/lib/analytics/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronRight, ChevronDown, Search } from "lucide-react";

interface OrgUnitSelectorProps {
  tree: OrgUnitTreeNode[];
  value: OrgUnitSelection;
  onChange: (selection: OrgUnitSelection) => void;
}

// --- Helpers arbre ---

/** Retourne tous les IDs clinique sous un noeud (feuilles) */
function getCliniqueIds(node: OrgUnitTreeNode): string[] {
  if (node.level === "clinique") return [node.id];
  return node.children.flatMap(getCliniqueIds);
}

/** Retourne tous les IDs clinique de l'arbre entier */
function getAllCliniqueIds(nodes: OrgUnitTreeNode[]): string[] {
  return nodes.flatMap(getCliniqueIds);
}

/** Trouve un noeud par ID dans l'arbre */
function findNode(nodes: OrgUnitTreeNode[], id: string): OrgUnitTreeNode | null {
  for (const n of nodes) {
    if (n.id === id) return n;
    const found = findNode(n.children, id);
    if (found) return found;
  }
  return null;
}

function nodeMatchesSearch(node: OrgUnitTreeNode, query: string): boolean {
  const q = query.toLowerCase();
  if (node.name.toLowerCase().includes(q) || node.code.toLowerCase().includes(q)) {
    return true;
  }
  return node.children.some((child) => nodeMatchesSearch(child, q));
}

export function OrgUnitSelector({ tree, value, onChange }: OrgUnitSelectorProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");

  const filteredTree = useMemo(() => {
    if (!search.trim()) return tree;
    function filterNodes(nodes: OrgUnitTreeNode[]): OrgUnitTreeNode[] {
      return nodes
        .filter((node) => nodeMatchesSearch(node, search))
        .map((node) => ({
          ...node,
          children: filterNodes(node.children),
        }));
    }
    return filterNodes(tree);
  }, [tree, search]);

  // Auto-expand all nodes when searching
  const effectiveExpanded = useMemo(() => {
    if (!search.trim()) return expanded;
    const all = new Set<string>();
    function collectIds(nodes: OrgUnitTreeNode[]) {
      for (const n of nodes) {
        if (n.children.length > 0) {
          all.add(n.id);
          collectIds(n.children);
        }
      }
    }
    collectIds(filteredTree);
    return all;
  }, [search, expanded, filteredTree]);

  // Set de tous les IDs clinique de l'arbre (pour detecter "tout selectionne")
  const allTreeCliniqueIds = useMemo(() => getAllCliniqueIds(tree), [tree]);

  // Set des IDs clinique actuellement selectionnes
  const selectedCliniqueSet = useMemo(() => {
    if (value.level === "all") return new Set(allTreeCliniqueIds);
    return new Set(value.selectedIds);
  }, [value, allTreeCliniqueIds]);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const applySelection = useCallback(
    (ids: Set<string>) => {
      // Si tous les cliniques sont selectionnes → mode "all"
      if (ids.size >= allTreeCliniqueIds.length && allTreeCliniqueIds.every((cid) => ids.has(cid))) {
        onChange({ level: "all", selectedIds: [], includeChildren: true });
      } else if (ids.size === 0) {
        onChange({ level: "all", selectedIds: [], includeChildren: true });
      } else {
        onChange({ level: "clinique", selectedIds: Array.from(ids), includeChildren: true });
      }
    },
    [allTreeCliniqueIds, onChange],
  );

  const toggleSelection = useCallback(
    (id: string) => {
      const node = findNode(tree, id);
      if (!node) return;

      // IDs clinique concernes par ce noeud
      const targetCliniqueIds = getCliniqueIds(node);
      const ids = new Set(selectedCliniqueSet);

      // Verifier si tous les descendants sont deja selectionnes
      const allSelected = targetCliniqueIds.every((cid) => ids.has(cid));

      if (allSelected) {
        // Decocher : retirer tous les descendants
        for (const cid of targetCliniqueIds) ids.delete(cid);
      } else {
        // Cocher : ajouter tous les descendants
        for (const cid of targetCliniqueIds) ids.add(cid);
      }

      applySelection(ids);
    },
    [tree, selectedCliniqueSet, applySelection],
  );

  const selectAll = () => {
    onChange({ level: "all", selectedIds: [], includeChildren: true });
  };

  /** Etat de la checkbox : true, false, ou "indeterminate" (partiel) */
  const getCheckedState = useCallback(
    (node: OrgUnitTreeNode): boolean | "indeterminate" => {
      if (node.level === "clinique") {
        return selectedCliniqueSet.has(node.id);
      }
      // Region ou district : verifier les descendants
      const descendantIds = getCliniqueIds(node);
      if (descendantIds.length === 0) return false;
      const selectedCount = descendantIds.filter((cid) => selectedCliniqueSet.has(cid)).length;
      if (selectedCount === 0) return false;
      if (selectedCount === descendantIds.length) return true;
      return "indeterminate";
    },
    [selectedCliniqueSet],
  );

  function renderNode(node: OrgUnitTreeNode, depth: number) {
    const hasChildren = node.children.length > 0;
    const isOpen = effectiveExpanded.has(node.id);
    const checkedState = getCheckedState(node);

    return (
      <div key={node.id} style={{ paddingLeft: depth * 16 }}>
        <div className="flex items-center gap-1.5 py-0.5">
          {hasChildren ? (
            <button
              onClick={() => toggleExpand(node.id)}
              className="p-0.5 hover:bg-accent rounded"
            >
              {isOpen ? (
                <ChevronDown className="h-3.5 w-3.5" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" />
              )}
            </button>
          ) : (
            <span className="w-5" />
          )}
          <Checkbox
            checked={checkedState}
            onCheckedChange={() => toggleSelection(node.id)}
            className="h-3.5 w-3.5"
          />
          <span className="text-xs">{node.name}</span>
          <span className="text-[10px] text-muted-foreground ml-1">
            ({node.code})
          </span>
        </div>
        {hasChildren && isOpen && (
          <div>
            {node.children.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  }

  const selectedCount = selectedCliniqueSet.size;
  const selectionLabel =
    value.level === "all"
      ? "Toutes"
      : `${selectedCount} clinique${selectedCount > 1 ? "s" : ""}`;

  return (
    <Collapsible defaultOpen className="group/collapsible">
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 w-full px-2 py-2 rounded-md hover:bg-accent transition-colors text-sm font-medium"
        >
          <ChevronRight className="h-4 w-4 shrink-0 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
          <span>Unite d&apos;organisation</span>
          <span className="ml-auto text-[10px] text-muted-foreground font-normal">
            {selectionLabel}
          </span>
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="flex flex-col gap-2 pl-6 pr-1 pb-2">
          <div className="flex items-center justify-end">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-[10px] px-2"
              onClick={selectAll}
            >
              Tout selectionner
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher..."
              className="h-7 text-xs pl-7"
            />
          </div>
          <div className="max-h-80 overflow-y-auto border rounded-md p-2">
            {value.level === "all" && !search && (
              <div className="text-xs text-muted-foreground mb-1 italic">
                Toutes les unites selectionnees
              </div>
            )}
            {filteredTree.length === 0 ? (
              <div className="text-xs text-muted-foreground italic py-2 text-center">
                Aucun resultat pour &quot;{search}&quot;
              </div>
            ) : (
              filteredTree.map((node) => renderNode(node, 0))
            )}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
