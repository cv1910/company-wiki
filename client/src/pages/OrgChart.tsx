import { useState, useMemo } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
  Building2,
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  UserPlus,
  Users,
  ChevronDown,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Search,
  Settings,
  GripVertical,
  Download,
  Image,
  FileText,
  Loader2,
} from "lucide-react";
import html2canvas from "html2canvas";
import { useRef } from "react";

// Position colors
const POSITION_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  blue: { bg: "from-blue-500 to-blue-600", text: "text-blue-600", border: "border-blue-500" },
  green: { bg: "from-green-500 to-green-600", text: "text-green-600", border: "border-green-500" },
  purple: { bg: "from-purple-500 to-purple-600", text: "text-purple-600", border: "border-purple-500" },
  orange: { bg: "from-orange-500 to-orange-600", text: "text-orange-600", border: "border-orange-500" },
  pink: { bg: "from-pink-500 to-pink-600", text: "text-pink-600", border: "border-pink-500" },
  teal: { bg: "from-teal-500 to-teal-600", text: "text-teal-600", border: "border-teal-500" },
  red: { bg: "from-red-500 to-red-600", text: "text-red-600", border: "border-red-500" },
  indigo: { bg: "from-indigo-500 to-indigo-600", text: "text-indigo-600", border: "border-indigo-500" },
};

interface Position {
  position: {
    id: number;
    title: string;
    description: string | null;
    department: string | null;
    parentId: number | null;
    userId: number | null;
    color: string | null;
    sortOrder: number;
    level: number;
  };
  user: {
    id: number;
    name: string | null;
    email: string | null;
    avatarUrl: string | null;
  } | null;
}

interface TreeNode extends Position {
  children: TreeNode[];
  isExpanded: boolean;
}

// Build tree structure from flat positions
function buildTree(positions: Position[]): TreeNode[] {
  const positionMap = new Map<number, TreeNode>();
  const roots: TreeNode[] = [];

  // Create nodes
  positions.forEach((pos) => {
    positionMap.set(pos.position.id, { ...pos, children: [], isExpanded: true });
  });

  // Build tree
  positions.forEach((pos) => {
    const node = positionMap.get(pos.position.id)!;
    if (pos.position.parentId === null) {
      roots.push(node);
    } else {
      const parent = positionMap.get(pos.position.parentId);
      if (parent) {
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    }
  });

  // Sort children by sortOrder
  const sortChildren = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => a.position.sortOrder - b.position.sortOrder);
    nodes.forEach((node) => sortChildren(node.children));
  };
  sortChildren(roots);

  return roots;
}

// Draggable Position Card Component
function DraggablePositionCard({
  node,
  isAdmin,
  onEdit,
  onDelete,
  onAssignUser,
  onAddChild,
  onToggleExpand,
  zoom,
  isDragging,
}: {
  node: TreeNode;
  isAdmin: boolean;
  onEdit: (pos: Position) => void;
  onDelete: (id: number) => void;
  onAssignUser: (pos: Position) => void;
  onAddChild: (parentId: number) => void;
  onToggleExpand: (id: number) => void;
  zoom: number;
  isDragging?: boolean;
}) {
  const { attributes, listeners, setNodeRef: setDragRef, transform } = useDraggable({
    id: `position-${node.position.id}`,
    data: { position: node.position },
    disabled: !isAdmin,
  });

  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `drop-${node.position.id}`,
    data: { position: node.position },
  });

  const style = transform ? {
    transform: CSS.Translate.toString(transform),
  } : undefined;

  const colors = POSITION_COLORS[node.position.color || "blue"] || POSITION_COLORS.blue;
  const hasChildren = node.children.length > 0;
  const isVacant = !node.user;

  // Combine refs
  const setRefs = (element: HTMLDivElement | null) => {
    setDragRef(element);
    setDropRef(element);
  };

  const initials = node.user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "?";

  return (
    <div className="flex flex-col items-center" style={style}>
      {/* Position Card */}
      <div
        ref={setRefs}
        className={`relative bg-white dark:bg-gray-800 rounded-2xl shadow-lg border-2 ${colors.border} transition-all hover:shadow-xl hover:-translate-y-1 ${isOver ? 'ring-4 ring-primary/50 scale-105' : ''} ${isDragging ? 'opacity-50' : ''}`}
        style={{
          width: `${220 * (zoom / 100)}px`,
          minHeight: `${120 * (zoom / 100)}px`,
        }}
      >
        {/* Drag Handle */}
        {isAdmin && (
          <div
            {...attributes}
            {...listeners}
            className="absolute top-2 left-2 cursor-grab active:cursor-grabbing p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
        )}

        {/* Color Header */}
        <div className={`h-2 rounded-t-xl bg-gradient-to-r ${colors.bg}`} />

        <div className="p-4">
          {/* Actions Menu */}
          {isAdmin && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 h-7 w-7"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(node)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Bearbeiten
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onAssignUser(node)}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  {isVacant ? "Mitarbeiter zuweisen" : "Mitarbeiter ändern"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onAddChild(node.position.id)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Untergeordnete Position
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onDelete(node.position.id)}
                  className="text-red-600"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Löschen
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Avatar */}
          <div className="flex justify-center mb-3">
            <Avatar className="h-14 w-14 ring-2 ring-white shadow-md">
              <AvatarImage src={node.user?.avatarUrl || undefined} />
              <AvatarFallback className={`bg-gradient-to-br ${colors.bg} text-white font-bold`}>
                {initials}
              </AvatarFallback>
            </Avatar>
          </div>

          {/* Name & Title */}
          <div className="text-center">
            <h3 className="font-bold text-sm truncate">
              {node.user?.name || (
                <span className="text-muted-foreground italic">Vakant</span>
              )}
            </h3>
            <p className={`text-xs font-medium ${colors.text} truncate`}>
              {node.position.title}
            </p>
            {node.position.department && (
              <Badge variant="secondary" className="mt-1 text-xs">
                {node.position.department}
              </Badge>
            )}
          </div>
        </div>

        {/* Expand/Collapse Button */}
        {hasChildren && (
          <button
            onClick={() => onToggleExpand(node.position.id)}
            className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-white dark:bg-gray-800 border rounded-full p-1 shadow-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            {node.isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        )}
      </div>

      {/* Children */}
      {hasChildren && node.isExpanded && (
        <div className="mt-8 relative">
          {/* Vertical Line */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-6 bg-gray-300 dark:bg-gray-600" />

          {/* Horizontal Line */}
          {node.children.length > 1 && (
            <div
              className="absolute top-6 left-0 right-0 h-0.5 bg-gray-300 dark:bg-gray-600"
              style={{
                left: `calc(50% - ${((node.children.length - 1) * 130 * (zoom / 100))}px)`,
                right: `calc(50% - ${((node.children.length - 1) * 130 * (zoom / 100))}px)`,
              }}
            />
          )}

          {/* Children Container */}
          <div className="flex gap-4 pt-6">
            {node.children.map((child) => (
              <div key={child.position.id} className="relative">
                {/* Vertical Line to Child */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-6 bg-gray-300 dark:bg-gray-600" />
                <div className="pt-6">
                  <DraggablePositionCard
                    node={child}
                    isAdmin={isAdmin}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onAssignUser={onAssignUser}
                    onAddChild={onAddChild}
                    onToggleExpand={onToggleExpand}
                    zoom={zoom}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function OrgChart() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [zoom, setZoom] = useState(100);
  const [searchQuery, setSearchQuery] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const orgChartRef = useRef<HTMLDivElement>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<number>>(new Set());
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
  const [parentIdForNew, setParentIdForNew] = useState<number | null>(null);

  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formDepartment, setFormDepartment] = useState("");
  const [formColor, setFormColor] = useState("blue");
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  // DnD Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Queries
  const { data: positions, isLoading, refetch } = trpc.orgChart.getPositions.useQuery();
  const { data: allUsers } = trpc.users.list.useQuery();

  // Mutations
  const createPosition = trpc.orgChart.createPosition.useMutation({
    onSuccess: () => {
      toast.success("Position erstellt");
      refetch();
      setIsCreateDialogOpen(false);
      resetForm();
    },
    onError: (error) => toast.error(error.message),
  });

  const updatePosition = trpc.orgChart.updatePosition.useMutation({
    onSuccess: () => {
      toast.success("Position aktualisiert");
      refetch();
      setIsEditDialogOpen(false);
      resetForm();
    },
    onError: (error) => toast.error(error.message),
  });

  const deletePosition = trpc.orgChart.deletePosition.useMutation({
    onSuccess: () => {
      toast.success("Position gelöscht");
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  const assignUser = trpc.orgChart.assignUser.useMutation({
    onSuccess: () => {
      toast.success("Mitarbeiter zugewiesen");
      refetch();
      setIsAssignDialogOpen(false);
    },
    onError: (error) => toast.error(error.message),
  });

  const seedData = trpc.orgChart.seedExampleData.useMutation({
    onSuccess: () => {
      toast.success("Beispieldaten erstellt");
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  const movePosition = trpc.orgChart.movePosition.useMutation({
    onSuccess: () => {
      toast.success("Position verschoben");
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  const resetForm = () => {
    setFormTitle("");
    setFormDescription("");
    setFormDepartment("");
    setFormColor("blue");
    setSelectedPosition(null);
    setParentIdForNew(null);
    setSelectedUserId(null);
  };

  // Build tree with expansion state
  const tree = useMemo(() => {
    if (!positions) return [];
    const builtTree = buildTree(positions);

    // Apply expansion state
    const applyExpansion = (nodes: TreeNode[]) => {
      nodes.forEach((node) => {
        // Default to expanded, unless explicitly collapsed
        node.isExpanded = !expandedNodes.has(node.position.id) || expandedNodes.size === 0;
        applyExpansion(node.children);
      });
    };

    // Initialize all as expanded on first load
    if (expandedNodes.size === 0) {
      const allIds = new Set<number>();
      const collectIds = (nodes: TreeNode[]) => {
        nodes.forEach((node) => {
          allIds.add(node.position.id);
          collectIds(node.children);
        });
      };
      collectIds(builtTree);
      setExpandedNodes(allIds);
    }

    applyExpansion(builtTree);
    return builtTree;
  }, [positions, expandedNodes]);

  // Filter tree by search
  const filteredTree = useMemo(() => {
    if (!searchQuery) return tree;

    const query = searchQuery.toLowerCase();
    const matchesSearch = (node: TreeNode): boolean => {
      const matchesTitle = node.position.title.toLowerCase().includes(query);
      const matchesName = node.user?.name?.toLowerCase().includes(query);
      const matchesDept = node.position.department?.toLowerCase().includes(query);
      return matchesTitle || !!matchesName || !!matchesDept;
    };

    const filterNodes = (nodes: TreeNode[]): TreeNode[] => {
      return nodes
        .map((node) => ({
          ...node,
          children: filterNodes(node.children),
        }))
        .filter((node) => matchesSearch(node) || node.children.length > 0);
    };

    return filterNodes(tree);
  }, [tree, searchQuery]);

  const handleToggleExpand = (id: number) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleEdit = (pos: Position) => {
    setSelectedPosition(pos);
    setFormTitle(pos.position.title);
    setFormDescription(pos.position.description || "");
    setFormDepartment(pos.position.department || "");
    setFormColor(pos.position.color || "blue");
    setIsEditDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Position wirklich löschen? Untergeordnete Positionen werden zur obersten Ebene verschoben.")) {
      deletePosition.mutate({ id });
    }
  };

  const handleAssignUser = (pos: Position) => {
    setSelectedPosition(pos);
    setSelectedUserId(pos.user?.id || null);
    setIsAssignDialogOpen(true);
  };

  const handleAddChild = (parentId: number) => {
    setParentIdForNew(parentId);
    resetForm();
    setIsCreateDialogOpen(true);
  };

  const handleCreateSubmit = () => {
    createPosition.mutate({
      title: formTitle,
      description: formDescription || undefined,
      department: formDepartment || undefined,
      parentId: parentIdForNew,
      color: formColor,
    });
  };

  const handleEditSubmit = () => {
    if (!selectedPosition) return;
    updatePosition.mutate({
      id: selectedPosition.position.id,
      title: formTitle,
      description: formDescription || null,
      department: formDepartment || null,
      color: formColor,
    });
  };

  const handleAssignSubmit = () => {
    if (!selectedPosition) return;
    assignUser.mutate({
      positionId: selectedPosition.position.id,
      userId: selectedUserId,
    });
  };

  // DnD Handlers
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) return;

    const activeData = active.data.current as { position: Position["position"] } | undefined;
    const overData = over.data.current as { position: Position["position"] } | undefined;

    if (!activeData?.position || !overData?.position) return;

    // Don't allow dropping on self or own children
    const activeId = activeData.position.id;
    const overId = overData.position.id;

    // Move the position to be a child of the drop target
    movePosition.mutate({
      id: activeId,
      newParentId: overId,
      sortOrder: 0,
    });
  };

  // Export functions
  const exportAsImage = async () => {
    if (!orgChartRef.current) return;
    
    setIsExporting(true);
    try {
      // Temporarily set zoom to 100% for export
      const originalZoom = zoom;
      setZoom(100);
      
      // Wait for re-render
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const canvas = await html2canvas(orgChartRef.current, {
        backgroundColor: "#ffffff",
        scale: 2,
        useCORS: true,
        logging: false,
      });
      
      // Restore zoom
      setZoom(originalZoom);
      
      // Download
      const link = document.createElement("a");
      link.download = `organigramm-${new Date().toISOString().split("T")[0]}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      
      toast.success("Organigramm als PNG exportiert");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Fehler beim Exportieren");
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 rounded-2xl" />
        <div className="flex justify-center">
          <Skeleton className="h-64 w-96 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-500 shadow-lg">
            <Building2 className="h-7 w-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Organigramm</h1>
            <p className="text-muted-foreground">Unternehmensstruktur und Hierarchie</p>
          </div>
        </div>

        {isAdmin && (
          <Button
            onClick={() => {
              resetForm();
              setIsCreateDialogOpen(true);
            }}
            className="bg-gradient-to-r from-primary to-orange-500 hover:from-primary/90 hover:to-orange-500/90"
          >
            <Plus className="h-4 w-4 mr-2" />
            Position erstellen
          </Button>
        )}
      </div>

      {/* Controls */}
      <Card className="card-shadow rounded-2xl">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            {/* Search */}
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Position oder Mitarbeiter suchen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setZoom(Math.max(50, zoom - 10))}
                disabled={zoom <= 50}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium w-12 text-center">{zoom}%</span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setZoom(Math.min(150, zoom + 10))}
                disabled={zoom >= 150}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setZoom(100)}
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
              <div className="w-px h-6 bg-border" />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" disabled={isExporting || filteredTree.length === 0}>
                    {isExporting ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4 mr-2" />
                    )}
                    Exportieren
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={exportAsImage}>
                    <Image className="h-4 w-4 mr-2" />
                    Als PNG exportieren
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Org Chart */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <Card className="card-shadow rounded-2xl overflow-hidden">
          <CardContent className="p-8 overflow-x-auto">
            {filteredTree.length === 0 ? (
            <div className="text-center py-16">
              <Building2 className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {searchQuery ? "Keine Ergebnisse" : "Noch keine Positionen"}
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery
                  ? "Versuche einen anderen Suchbegriff."
                  : "Erstelle die erste Position, um das Organigramm aufzubauen."}
              </p>
              {isAdmin && !searchQuery && (
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button
                    onClick={() => {
                      resetForm();
                      setIsCreateDialogOpen(true);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Erste Position erstellen
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => seedData.mutate()}
                    disabled={seedData.isPending}
                  >
                    <Users className="h-4 w-4 mr-2" />
                    {seedData.isPending ? "Wird erstellt..." : "Beispieldaten laden"}
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div ref={orgChartRef} className="flex justify-center min-w-max bg-white p-4">
              <div className="flex flex-col items-center gap-4">
                {filteredTree.map((node) => (
                  <DraggablePositionCard
                    key={node.position.id}
                    node={node}
                    isAdmin={isAdmin}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onAssignUser={handleAssignUser}
                    onAddChild={handleAddChild}
                    onToggleExpand={handleToggleExpand}
                    zoom={zoom}
                  />
                ))}
              </div>
            </div>
            )}
          </CardContent>
        </Card>
      </DndContext>

      {/* Create Position Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Position erstellen</DialogTitle>
            <DialogDescription>
              {parentIdForNew
                ? "Erstelle eine untergeordnete Position."
                : "Erstelle eine neue Position auf oberster Ebene."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Titel *</Label>
              <Input
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="z.B. Geschäftsführer, Abteilungsleiter..."
              />
            </div>
            <div>
              <Label>Beschreibung</Label>
              <Textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Aufgaben und Verantwortlichkeiten..."
              />
            </div>
            <div>
              <Label>Abteilung</Label>
              <Input
                value={formDepartment}
                onChange={(e) => setFormDepartment(e.target.value)}
                placeholder="z.B. Marketing, IT, Vertrieb..."
              />
            </div>
            <div>
              <Label>Farbe</Label>
              <Select value={formColor} onValueChange={setFormColor}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(POSITION_COLORS).map((color) => (
                    <SelectItem key={color} value={color}>
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded-full bg-gradient-to-r ${POSITION_COLORS[color].bg}`} />
                        <span className="capitalize">{color}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button
              onClick={handleCreateSubmit}
              disabled={!formTitle || createPosition.isPending}
            >
              Erstellen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Position Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Position bearbeiten</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Titel *</Label>
              <Input
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
              />
            </div>
            <div>
              <Label>Beschreibung</Label>
              <Textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
              />
            </div>
            <div>
              <Label>Abteilung</Label>
              <Input
                value={formDepartment}
                onChange={(e) => setFormDepartment(e.target.value)}
              />
            </div>
            <div>
              <Label>Farbe</Label>
              <Select value={formColor} onValueChange={setFormColor}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(POSITION_COLORS).map((color) => (
                    <SelectItem key={color} value={color}>
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded-full bg-gradient-to-r ${POSITION_COLORS[color].bg}`} />
                        <span className="capitalize">{color}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button
              onClick={handleEditSubmit}
              disabled={!formTitle || updatePosition.isPending}
            >
              Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign User Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mitarbeiter zuweisen</DialogTitle>
            <DialogDescription>
              Wähle einen Mitarbeiter für die Position "{selectedPosition?.position.title}".
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Select
              value={selectedUserId?.toString() || "none"}
              onValueChange={(v) => setSelectedUserId(v === "none" ? null : parseInt(v))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Mitarbeiter auswählen..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">
                  <span className="text-muted-foreground italic">Vakant (kein Mitarbeiter)</span>
                </SelectItem>
                {allUsers?.map((u) => (
                  <SelectItem key={u.id} value={u.id.toString()}>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={u.avatarUrl || undefined} />
                        <AvatarFallback className="text-xs">
                          {u.name?.slice(0, 2).toUpperCase() || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <span>{u.name || u.email}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleAssignSubmit} disabled={assignUser.isPending}>
              Zuweisen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
