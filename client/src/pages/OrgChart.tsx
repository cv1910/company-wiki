import { useState, useMemo, useRef, useEffect, useCallback } from "react";
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
import { toast } from "@/lib/hapticToast";
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
  Fullscreen,
  Minimize2,
  Map as MapIcon,
  X,
  Keyboard,
} from "lucide-react";
import html2canvas from "html2canvas";
// useRef already imported above

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
  const positionMap: Map<number, TreeNode> = new Map();
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
  isFocused,
  onDoubleTap,
  registerRef,
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
  isFocused?: boolean;
  onDoubleTap?: (e: React.MouseEvent | React.TouchEvent, positionId: number) => void;
  registerRef?: (id: number, element: HTMLDivElement | null) => void;
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

  // Combine refs and register for keyboard navigation
  const setRefs = (element: HTMLDivElement | null) => {
    setDragRef(element);
    setDropRef(element);
    if (registerRef) {
      registerRef(node.position.id, element);
    }
  };

  // Handle double-tap on this position
  const handleClick = (e: React.MouseEvent) => {
    if (onDoubleTap) {
      onDoubleTap(e, node.position.id);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (onDoubleTap) {
      onDoubleTap(e, node.position.id);
    }
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
        role="button"
        tabIndex={0}
        onClick={handleClick}
        onTouchEnd={handleTouchEnd}
        className={`relative bg-white dark:bg-gray-800 rounded-2xl shadow-lg border-2 ${colors.border} transition-all hover:shadow-xl hover:-translate-y-1 ${isOver ? 'ring-4 ring-primary/50 scale-105' : ''} ${isDragging ? 'opacity-50' : ''} ${isFocused ? 'ring-4 ring-primary ring-offset-2 scale-105' : ''}`}
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
              <AvatarImage src={node.user?.avatarUrl || undefined} className="object-cover" />
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
                    isFocused={isFocused}
                    onDoubleTap={onDoubleTap}
                    registerRef={registerRef}
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
  const pinchContainerRef = useRef<HTMLDivElement>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<number>>(new Set());
  
  // Pinch-to-Zoom state
  const initialPinchDistance = useRef<number | null>(null);
  const initialZoom = useRef<number>(100);
  
  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);
  const fullscreenContainerRef = useRef<HTMLDivElement>(null);
  
  // Minimap state
  const [showMinimap, setShowMinimap] = useState(true);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  
  // Double-tap state
  const lastTapTime = useRef<number>(0);
  
  // Position focus state for keyboard navigation
  const [focusedPositionId, setFocusedPositionId] = useState<number | null>(null);
  const positionRefs = useRef(new Map<number, HTMLDivElement>());
  
  // Scroll offset for centering
  const scrollContainerRef = useRef<HTMLDivElement>(null);
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

  // Pinch-to-Zoom handlers
  const getDistance = useCallback((touches: TouchList) => {
    if (touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      initialPinchDistance.current = getDistance(e.touches);
      initialZoom.current = zoom;
    }
  }, [zoom, getDistance]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (e.touches.length === 2 && initialPinchDistance.current !== null) {
      e.preventDefault();
      const currentDistance = getDistance(e.touches);
      const scale = currentDistance / initialPinchDistance.current;
      const newZoom = Math.min(200, Math.max(25, Math.round(initialZoom.current * scale)));
      setZoom(newZoom);
    }
  }, [getDistance]);

  const handleTouchEnd = useCallback(() => {
    initialPinchDistance.current = null;
  }, []);

  // Attach touch event listeners for pinch-to-zoom
  useEffect(() => {
    const container = pinchContainerRef.current;
    if (!container) return;

    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);
    container.addEventListener('touchcancel', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  // Fullscreen handlers
  const toggleFullscreen = useCallback(async () => {
    // Try native fullscreen first, fallback to CSS fullscreen
    if (!isFullscreen) {
      try {
        if (fullscreenContainerRef.current?.requestFullscreen) {
          await fullscreenContainerRef.current.requestFullscreen();
        }
        setIsFullscreen(true);
      } catch (err) {
        // Fallback to CSS fullscreen if native fails
        console.log('Native fullscreen not available, using CSS fallback');
        setIsFullscreen(true);
      }
    } else {
      try {
        if (document.fullscreenElement) {
          await document.exitFullscreen();
        }
        setIsFullscreen(false);
      } catch (err) {
        setIsFullscreen(false);
      }
    }
  }, [isFullscreen]);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Helper function to center a position in the viewport
  const centerPosition = useCallback((positionId: number) => {
    const positionElement = positionRefs.current.get(positionId);
    const container = scrollContainerRef.current || fullscreenContainerRef.current;
    
    if (positionElement && container) {
      const posRect = positionElement.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      
      // Calculate the scroll position to center the element
      const scrollLeft = container.scrollLeft + (posRect.left - containerRect.left) - (containerRect.width / 2) + (posRect.width / 2);
      const scrollTop = container.scrollTop + (posRect.top - containerRect.top) - (containerRect.height / 2) + (posRect.height / 2);
      
      container.scrollTo({
        left: scrollLeft,
        top: scrollTop,
        behavior: 'smooth'
      });
    }
  }, []);

  // Double-tap to zoom handler - now also focuses on clicked position
  const handleDoubleTapOnPosition = useCallback((e: React.MouseEvent | React.TouchEvent, positionId: number) => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    
    if (now - lastTapTime.current < DOUBLE_TAP_DELAY) {
      // Double tap detected
      e.preventDefault();
      e.stopPropagation();
      
      // Set focus to this position
      setFocusedPositionId(positionId);
      
      // Toggle zoom and center on position
      if (zoom < 150) {
        setZoom(150);
        // Wait for zoom animation then center
        setTimeout(() => centerPosition(positionId), 100);
      } else {
        setZoom(100);
        setTimeout(() => centerPosition(positionId), 100);
      }
    }
    lastTapTime.current = now;
  }, [zoom, centerPosition]);

  // Fallback double-tap handler for background
  const handleDoubleTap = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    
    if (now - lastTapTime.current < DOUBLE_TAP_DELAY) {
      // Double tap detected - toggle between 100% and 150%
      e.preventDefault();
      if (zoom < 150) {
        setZoom(150);
      } else {
        setZoom(100);
      }
    }
    lastTapTime.current = now;
  }, [zoom]);

  // Initialize expanded nodes when positions load
  const [initialized, setInitialized] = useState(false);
  
  // Initialize all nodes as expanded on first load
  if (positions && positions.length > 0 && !initialized) {
    const allIds = new Set<number>();
    positions.forEach((pos) => allIds.add(pos.position.id));
    setExpandedNodes(allIds);
    setInitialized(true);
  }

  // Build tree with expansion state
  const tree = useMemo(() => {
    if (!positions) return [];
    const builtTree = buildTree(positions);

    // Apply expansion state
    const applyExpansion = (nodes: TreeNode[]) => {
      nodes.forEach((node) => {
        // Default to expanded if in expandedNodes set, or if not initialized yet
        node.isExpanded = expandedNodes.has(node.position.id) || !initialized;
        applyExpansion(node.children);
      });
    };

    applyExpansion(builtTree);
    return builtTree;
  }, [positions, expandedNodes, initialized]);

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

  // Flatten tree for keyboard navigation
  const flattenedPositions = useMemo(() => {
    const result: { id: number; parentId: number | null; level: number; siblings: number[] }[] = [];
    
    const flatten = (nodes: TreeNode[], parentId: number | null = null) => {
      const siblingIds = nodes.map(n => n.position.id);
      nodes.forEach((node) => {
        result.push({
          id: node.position.id,
          parentId,
          level: node.position.level,
          siblings: siblingIds
        });
        if (node.isExpanded && node.children.length > 0) {
          flatten(node.children, node.position.id);
        }
      });
    };
    
    flatten(filteredTree);
    return result;
  }, [filteredTree]);

  // Keyboard navigation handler
  useEffect(() => {
    if (!isFullscreen) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!focusedPositionId && flattenedPositions.length > 0) {
        // If no position is focused, focus the first one
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
          e.preventDefault();
          const firstId = flattenedPositions[0]?.id;
          if (firstId) {
            setFocusedPositionId(firstId);
            centerPosition(firstId);
          }
        }
        return;
      }
      
      const currentIndex = flattenedPositions.findIndex(p => p.id === focusedPositionId);
      if (currentIndex === -1) return;
      
      const current = flattenedPositions[currentIndex];
      let nextId: number | null = null;
      
      switch (e.key) {
        case 'ArrowDown': {
          // Move to first child or next sibling
          e.preventDefault();
          const children = flattenedPositions.filter(p => p.parentId === focusedPositionId);
          if (children.length > 0) {
            nextId = children[0].id;
          } else {
            // Find next sibling or parent's next sibling
            const siblingIndex = current.siblings.indexOf(focusedPositionId!);
            if (siblingIndex < current.siblings.length - 1) {
              nextId = current.siblings[siblingIndex + 1];
            }
          }
          break;
        }
        case 'ArrowUp': {
          // Move to parent
          e.preventDefault();
          if (current.parentId) {
            nextId = current.parentId;
          }
          break;
        }
        case 'ArrowLeft': {
          // Move to previous sibling
          e.preventDefault();
          const siblingIndex = current.siblings.indexOf(focusedPositionId!);
          if (siblingIndex > 0) {
            nextId = current.siblings[siblingIndex - 1];
          }
          break;
        }
        case 'ArrowRight': {
          // Move to next sibling
          e.preventDefault();
          const siblingIndex = current.siblings.indexOf(focusedPositionId!);
          if (siblingIndex < current.siblings.length - 1) {
            nextId = current.siblings[siblingIndex + 1];
          }
          break;
        }
        case 'Enter': {
          // Toggle expand/collapse
          e.preventDefault();
          if (focusedPositionId) {
            handleToggleExpand(focusedPositionId);
          }
          break;
        }
        case 'Escape': {
          // Clear focus or exit fullscreen
          e.preventDefault();
          if (focusedPositionId) {
            setFocusedPositionId(null);
          } else {
            toggleFullscreen();
          }
          break;
        }
      }
      
      if (nextId) {
        setFocusedPositionId(nextId);
        centerPosition(nextId);
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, focusedPositionId, flattenedPositions, centerPosition, toggleFullscreen]);

  // Touch swipe navigation state
  const swipeStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const SWIPE_THRESHOLD = 50; // minimum distance for swipe
  const SWIPE_TIMEOUT = 300; // maximum time for swipe in ms

  // Touch swipe navigation handler for position navigation
  const handleSwipeStart = useCallback((e: React.TouchEvent) => {
    if (!isFullscreen || !focusedPositionId) return;
    const touch = e.touches[0];
    swipeStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    };
  }, [isFullscreen, focusedPositionId]);

  const handleSwipeEnd = useCallback((e: React.TouchEvent) => {
    if (!isFullscreen || !focusedPositionId || !swipeStartRef.current) return;
    
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - swipeStartRef.current.x;
    const deltaY = touch.clientY - swipeStartRef.current.y;
    const deltaTime = Date.now() - swipeStartRef.current.time;
    
    // Check if it's a valid swipe
    if (deltaTime > SWIPE_TIMEOUT) {
      swipeStartRef.current = null;
      return;
    }
    
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);
    
    // Determine swipe direction
    if (absX < SWIPE_THRESHOLD && absY < SWIPE_THRESHOLD) {
      swipeStartRef.current = null;
      return;
    }
    
    const currentIndex = flattenedPositions.findIndex(p => p.id === focusedPositionId);
    if (currentIndex === -1) {
      swipeStartRef.current = null;
      return;
    }
    
    const current = flattenedPositions[currentIndex];
    let nextId: number | null = null;
    
    if (absX > absY) {
      // Horizontal swipe - navigate between siblings
      const siblingIndex = current.siblings.indexOf(focusedPositionId);
      if (deltaX > SWIPE_THRESHOLD && siblingIndex > 0) {
        // Swipe right - previous sibling
        nextId = current.siblings[siblingIndex - 1];
      } else if (deltaX < -SWIPE_THRESHOLD && siblingIndex < current.siblings.length - 1) {
        // Swipe left - next sibling
        nextId = current.siblings[siblingIndex + 1];
      }
    } else {
      // Vertical swipe - navigate parent/child
      if (deltaY > SWIPE_THRESHOLD && current.parentId) {
        // Swipe down - go to parent
        nextId = current.parentId;
      } else if (deltaY < -SWIPE_THRESHOLD) {
        // Swipe up - go to first child
        const children = flattenedPositions.filter(p => p.parentId === focusedPositionId);
        if (children.length > 0) {
          nextId = children[0].id;
        }
      }
    }
    
    if (nextId) {
      setFocusedPositionId(nextId);
      centerPosition(nextId);
    }
    
    swipeStartRef.current = null;
  }, [isFullscreen, focusedPositionId, flattenedPositions, centerPosition]);

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
      <div className="space-y-6 pb-[calc(var(--bottom-nav-height,64px)+1rem)] md:pb-6">
        <Skeleton className="h-32 rounded-2xl" />
        <div className="flex justify-center">
          <Skeleton className="h-64 w-96 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-[calc(var(--bottom-nav-height,64px)+1rem)] md:pb-6">
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
              {/* Zoom Stufen Buttons */}
              <div className="flex items-center border rounded-lg overflow-hidden">
                {[50, 75, 100, 125, 150].map((level) => (
                  <Button
                    key={level}
                    variant={zoom === level ? "default" : "ghost"}
                    size="sm"
                    className={`rounded-none px-3 h-9 ${zoom === level ? '' : 'hover:bg-muted'}`}
                    onClick={() => setZoom(level)}
                  >
                    {level}%
                  </Button>
                ))}
              </div>
              <div className="w-px h-6 bg-border" />
              {/* Fine-tune Buttons */}
              <Button
                variant="outline"
                size="icon"
                onClick={() => setZoom(Math.max(25, zoom - 10))}
                disabled={zoom <= 25}
                title="Verkleinern (-10%)"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium w-12 text-center">{zoom}%</span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setZoom(Math.min(200, zoom + 10))}
                disabled={zoom >= 200}
                title="Vergrößern (+10%)"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setZoom(100)}
                title="Zurücksetzen (100%)"
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={toggleFullscreen}
                title={isFullscreen ? "Vollbild beenden" : "Vollbild"}
              >
                {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Fullscreen className="h-4 w-4" />}
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
      <div 
        ref={fullscreenContainerRef}
        className={isFullscreen ? "fixed inset-0 z-50 bg-background overflow-auto" : ""}
      >
        {isFullscreen && (
          <>
            <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h2 className="font-semibold">Organigramm</h2>
                {focusedPositionId && (
                  <Badge variant="secondary" className="text-xs">
                    Position fokussiert - Pfeiltasten zum Navigieren
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant={showMinimap ? "default" : "outline"} 
                  size="icon" 
                  onClick={() => setShowMinimap(!showMinimap)}
                  title="Minimap ein-/ausblenden"
                >
                  <MapIcon className="h-4 w-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={() => setShowKeyboardHelp(!showKeyboardHelp)}
                  title="Tastaturkürzel anzeigen"
                >
                  <Keyboard className="h-4 w-4" />
                </Button>
                <div className="w-px h-6 bg-border" />
                <Button variant="outline" size="icon" onClick={() => setZoom(Math.max(25, zoom - 10))} disabled={zoom <= 25}>
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium w-12 text-center">{zoom}%</span>
                <Button variant="outline" size="icon" onClick={() => setZoom(Math.min(200, zoom + 10))} disabled={zoom >= 200}>
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={toggleFullscreen}>
                  <Minimize2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            {/* Keyboard Help Panel */}
            {showKeyboardHelp && (
              <div className="absolute top-20 right-4 z-20 bg-background/95 backdrop-blur border rounded-lg shadow-lg p-4 w-64">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-sm">Tastaturkürzel</h3>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowKeyboardHelp(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">↑</span><span>Zur übergeordneten Position</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">↓</span><span>Zum ersten Kind / nächsten Geschwister</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">←</span><span>Vorheriger Geschwister</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">→</span><span>Nächster Geschwister</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Enter</span><span>Auf-/Zuklappen</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Esc</span><span>Fokus aufheben / Beenden</span></div>
                </div>
              </div>
            )}
            
            {/* Minimap */}
            {showMinimap && filteredTree.length > 0 && (
              <div className="fixed bottom-4 right-4 z-20 bg-background/95 backdrop-blur border rounded-lg shadow-lg p-3 w-48">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-muted-foreground">Übersicht</span>
                  <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setShowMinimap(false)}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {flattenedPositions.map((pos) => {
                    const position = positions?.find(p => p.position.id === pos.id);
                    const colors = POSITION_COLORS[position?.position.color || "blue"] || POSITION_COLORS.blue;
                    return (
                      <button
                        key={pos.id}
                        onClick={() => {
                          setFocusedPositionId(pos.id);
                          centerPosition(pos.id);
                        }}
                        className={`w-full text-left text-xs p-1.5 rounded transition-colors hover:bg-muted ${
                          focusedPositionId === pos.id ? 'bg-primary/10 ring-1 ring-primary' : ''
                        }`}
                        style={{ paddingLeft: `${(pos.level || 0) * 8 + 6}px` }}
                      >
                        <div className="flex items-center gap-1.5">
                          <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${colors.bg}`} />
                          <span className="truncate">{position?.position.title || 'Position'}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <Card className={`card-shadow rounded-2xl overflow-hidden ${isFullscreen ? 'border-0 rounded-none' : ''}`}>
            <CardContent 
              ref={pinchContainerRef}
              className={`p-8 overflow-x-auto touch-none ${isFullscreen ? 'min-h-[calc(100vh-80px)]' : ''}`}
              style={{ touchAction: 'pan-x pan-y' }}
              onClick={handleDoubleTap}
              onTouchEnd={handleDoubleTap}
              onTouchStart={handleSwipeStart}
              onTouchEndCapture={handleSwipeEnd}
            >
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
                    isFocused={focusedPositionId === node.position.id}
                    onDoubleTap={handleDoubleTapOnPosition}
                    registerRef={(id, el) => {
                      if (el) {
                        positionRefs.current.set(id, el);
                      } else {
                        positionRefs.current.delete(id);
                      }
                    }}
                  />
                ))}
              </div>
            </div>
            )}
          </CardContent>
        </Card>
      </DndContext>
      </div>

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
                        <AvatarImage src={u.avatarUrl || undefined} className="object-cover" />
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
