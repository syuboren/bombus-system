import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  OnInit,
  AfterViewInit,
  ViewChild,
  ElementRef,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../../../../shared/components/header/header.component';
import { HasPermissionDirective } from '../../../../shared/directives/has-permission.directive';
import { OrganizationService } from '../../../organization/services/organization.service';
import { TenantAdminService } from '../../services/tenant-admin.service';
import {
  OrgTreeNode,
  OrgNodeType,
  CompanyType,
  CompanyStatus,
  SimpleCollaboration,
  SimpleCollaborationType,
  AnchorSide,
  DepartmentEmployee,
  DepartmentPositionInfo,
  Employee
} from '../../../organization/models/organization.model';
import { OrgUnit } from '../../models/tenant-admin.model';

type ViewMode = 'canvas' | 'list';
type AlignType = 'left' | 'center-h' | 'right' | 'top' | 'center-v' | 'bottom' | 'distribute-h' | 'distribute-v';

interface NodePosition {
  id: string;
  x: number;
  y: number;
}

interface UnifiedTreeNode {
  node: OrgTreeNode;
  children: UnifiedTreeNode[];
}

@Component({
  standalone: true,
  selector: 'app-org-structure-page',
  templateUrl: './org-structure-page.component.html',
  styleUrl: './org-structure-page.component.scss',
  imports: [CommonModule, FormsModule, HeaderComponent, HasPermissionDirective],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OrgStructurePageComponent implements OnInit, AfterViewInit {
  private orgService = inject(OrganizationService);
  private tenantAdminService = inject(TenantAdminService);
  private cdr = inject(ChangeDetectorRef);

  @ViewChild('canvasContainer') canvasContainerRef!: ElementRef<HTMLDivElement>;

  // Page Info
  readonly pageTitle = '組織架構圖';
  readonly breadcrumbs = ['首頁', '設定'];

  // ============================================================
  // Data Signals
  // ============================================================
  orgTree = signal<OrgTreeNode[]>([]);
  collaborations = signal<SimpleCollaboration[]>([]);
  employees = signal<Employee[]>([]);
  loading = signal(true);

  // ============================================================
  // View State
  // ============================================================
  viewMode = signal<ViewMode>('canvas');
  isEditMode = signal(false);
  showEmployeeNodes = signal(false);
  showCollaborations = signal(true);
  collapsedNodes = signal<Set<string>>(new Set());

  // ============================================================
  // Canvas State
  // ============================================================
  canvasScale = signal(1);
  canvasPanX = signal(0);
  canvasPanY = signal(0);
  isPanning = signal(false);
  panStartX = 0;
  panStartY = 0;

  // Node positions
  nodePositions = signal<Map<string, NodePosition>>(new Map());

  // Undo / Redo
  undoStack = signal<Map<string, NodePosition>[]>([]);
  redoStack = signal<Map<string, NodePosition>[]>([]);
  readonly maxHistoryLength = 50;

  // Grid snap
  gridSnapEnabled = signal(true);
  readonly gridSize = 20;

  // Node dragging
  isDraggingNode = signal(false);
  draggingNodeId = signal<string | null>(null);
  dragNodeOffsetX = 0;
  dragNodeOffsetY = 0;

  // Multi-selection
  selectedNodes = signal<Set<string>>(new Set());

  // Anchor editing
  editingAnchorCollabId = signal<string | null>(null);

  // Anchor dragging
  draggingAnchor = signal<{
    collabId: string;
    endpoint: 'source' | 'target';
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  } | null>(null);

  // ============================================================
  // Modal State
  // ============================================================

  // Node detail modal
  selectedNode = signal<OrgTreeNode | null>(null);
  showNodeDetail = signal(false);
  nodeDetailEmployees = signal<DepartmentEmployee[]>([]);
  nodeDetailPositions = signal<DepartmentPositionInfo[]>([]);
  nodeDetailSubsidiaries = signal<{ id: string; name: string; employeeCount: number }[]>([]);
  nodeDetailDepartments = signal<{ id: string; name: string; employeeCount: number }[]>([]);

  // Company form modal (group/subsidiary)
  showCompanyForm = signal(false);
  isEditingCompany = signal(false);
  companyForm = signal<{
    id?: string;
    name: string;
    code: string;
    type: string;
    parent_id: string | null;
    address: string;
    phone: string;
    email: string;
    description: string;
    tax_id: string;
    status: 'active' | 'inactive';
    established_date: string;
  }>({
    name: '', code: '', type: 'group', parent_id: null,
    address: '', phone: '', email: '', description: '',
    tax_id: '', status: 'active', established_date: ''
  });

  // Department form modal
  showDepartmentForm = signal(false);
  isEditingDepartment = signal(false);
  departmentForm = signal<{
    id?: string;
    name: string;
    code: string;
    parentId: string | null;
    managerId: string | null;
    responsibilities: string[];
    kpiItems: string[];
    competencyFocus: { name: string; jobs: { name: string; description: string }[] }[];
  }>({
    name: '',
    code: '',
    parentId: null,
    managerId: null,
    responsibilities: [],
    kpiItems: [],
    competencyFocus: []
  });

  // Collaboration form modal
  showCollaborationForm = signal(false);
  isEditingCollaboration = signal(false);
  collabSourceLocked = signal(false);
  collaborationForm = signal<{
    id?: string;
    sourceDeptId: string;
    targetDeptId: string;
    relationType: SimpleCollaborationType;
    description: string;
  }>({
    sourceDeptId: '',
    targetDeptId: '',
    relationType: 'parallel',
    description: ''
  });

  // Form dirty-check snapshots
  private companyFormSnapshot = '';
  private departmentFormSnapshot = '';
  private collabFormSnapshot = '';

  // Delete confirmation
  showDeleteConfirm = signal(false);
  deleteTarget = signal<{ type: 'node' | 'collaboration'; id: string; name: string } | null>(null);

  // ============================================================
  // Computed
  // ============================================================

  // Build tree from flat OrgTreeNode[]
  tree = computed<UnifiedTreeNode[]>(() => {
    const nodes = this.orgTree();
    const nodeMap = new Map<string, UnifiedTreeNode>();
    const roots: UnifiedTreeNode[] = [];

    nodes.forEach(n => nodeMap.set(n.id, { node: n, children: [] }));

    nodeMap.forEach(treeNode => {
      const parentId = treeNode.node.parentId;
      if (parentId && nodeMap.has(parentId)) {
        nodeMap.get(parentId)!.children.push(treeNode);
      } else {
        roots.push(treeNode);
      }
    });

    return roots;
  });

  // Visible nodes for canvas (excludes children of collapsed nodes)
  visibleNodes = computed(() => {
    const collapsed = this.collapsedNodes();
    if (collapsed.size === 0) return this.orgTree();

    const allNodes = this.orgTree();
    const hiddenIds = new Set<string>();

    // Collect all descendant IDs of collapsed nodes
    const collectDescendants = (parentId: string) => {
      allNodes.filter(n => n.parentId === parentId).forEach(child => {
        hiddenIds.add(child.id);
        collectDescendants(child.id);
      });
    };

    collapsed.forEach(id => collectDescendants(id));
    return allNodes.filter(n => !hiddenIds.has(n.id));
  });

  // Flat list for list view (respects collapsed state)
  flatList = computed(() => {
    const collapsed = this.collapsedNodes();
    const result: { node: OrgTreeNode; level: number }[] = [];
    const traverse = (treeNodes: UnifiedTreeNode[], level: number) => {
      treeNodes.forEach(tn => {
        result.push({ node: tn.node, level });
        if (!collapsed.has(tn.node.id)) {
          traverse(tn.children, level + 1);
        }
      });
    };
    traverse(this.tree(), 0);
    return result;
  });

  // Statistics
  stats = computed(() => {
    const nodes = this.orgTree();
    return {
      groupCount: nodes.filter(n => n.type === 'group').length,
      subsidiaryCount: nodes.filter(n => n.type === 'subsidiary').length,
      departmentCount: nodes.filter(n => n.type === 'department').length,
      totalEmployees: nodes.filter(n => n.type === 'department').reduce((sum, n) => sum + n.employeeCount, 0),
      collaborationCount: this.collaborations().length
    };
  });

  // Collaboration lines for canvas (only between visible nodes)
  collaborationLines = computed(() => {
    const collabs = this.collaborations();
    const nodes = this.visibleNodes();
    const nodeMap = new Map(nodes.map(n => [n.id, n]));

    return collabs
      .filter(c => nodeMap.has(c.sourceDeptId) && nodeMap.has(c.targetDeptId))
      .map(c => ({
        collaboration: c,
        source: nodeMap.get(c.sourceDeptId)!,
        target: nodeMap.get(c.targetDeptId)!
      }));
  });

  // Department nodes only (for collaboration form dropdowns)
  departmentNodes = computed(() => {
    return this.orgTree().filter(n => n.type === 'department');
  });

  // All employees list (for manager dropdown)
  allEmployees = signal<Employee[]>([]);

  // ============================================================
  // Lifecycle
  // ============================================================

  ngOnInit(): void {
    this.loadData();
  }

  ngAfterViewInit(): void {
    // Canvas ready
  }

  // ============================================================
  // Data Loading
  // ============================================================

  loadData(): void {
    this.loading.set(true);

    this.orgService.getOrgTree().subscribe(data => {
      this.orgTree.set(data);
      this.initializeNodePositions(data);
      this.loading.set(false);
    });

    this.orgService.getCollaborations().subscribe(data => {
      this.collaborations.set(data);
    });

    this.orgService.getEmployees().subscribe(data => {
      this.allEmployees.set(data);
    });
  }

  // ============================================================
  // Node Dimensions — per-type sizing (design D2)
  // ============================================================

  getNodeDimensions(type: string): { width: number; height: number } {
    switch (type) {
      case 'group':      return { width: 240, height: 160 };
      case 'subsidiary': return { width: 240, height: 120 };
      case 'department': return { width: 200, height: 90 };
      default:           return { width: 160, height: 50 }; // employee
    }
  }

  // ============================================================
  // Auto-Arrange — recursive subtreeWidth (from department-structure D3)
  // ============================================================

  initializeNodePositions(nodes?: OrgTreeNode[]): void {
    const all = nodes || this.orgTree();
    const positions = new Map<string, NodePosition>();
    const treeRoots = this.buildTreeFromFlat(all);
    const horizontalGap = 40;
    const verticalSpacing = 60;

    // Calculate subtree width recursively
    const getSubtreeWidth = (treeNode: UnifiedTreeNode): number => {
      const dim = this.getNodeDimensions(treeNode.node.type);
      if (treeNode.children.length === 0) {
        return dim.width;
      }
      const childrenTotalWidth = treeNode.children.reduce(
        (sum, child) => sum + getSubtreeWidth(child), 0
      );
      const gapsBetweenChildren = (treeNode.children.length - 1) * horizontalGap;
      return Math.max(dim.width, childrenTotalWidth + gapsBetweenChildren);
    };

    // Assign positions
    const assignPositions = (treeNodes: UnifiedTreeNode[], startX: number, startY: number): void => {
      let currentX = startX;
      treeNodes.forEach(tn => {
        const dim = this.getNodeDimensions(tn.node.type);
        const subtreeWidth = getSubtreeWidth(tn);
        const x = currentX + subtreeWidth / 2; // center x
        const y = startY;
        positions.set(tn.node.id, { id: tn.node.id, x, y });

        if (tn.children.length > 0) {
          assignPositions(tn.children, currentX, y + dim.height + verticalSpacing);
        }

        currentX += subtreeWidth + horizontalGap;
      });
    };

    // Calculate total width and center
    const totalWidth = treeRoots.reduce((sum, r) => sum + getSubtreeWidth(r), 0)
      + Math.max(0, (treeRoots.length - 1) * horizontalGap);
    const startX = Math.max(40, 600 - totalWidth / 2);
    assignPositions(treeRoots, startX, 60);

    this.nodePositions.set(positions);
  }

  private buildTreeFromFlat(nodes: OrgTreeNode[]): UnifiedTreeNode[] {
    const nodeMap = new Map<string, UnifiedTreeNode>();
    const roots: UnifiedTreeNode[] = [];

    nodes.forEach(n => nodeMap.set(n.id, { node: n, children: [] }));

    nodeMap.forEach(treeNode => {
      const parentId = treeNode.node.parentId;
      if (parentId && nodeMap.has(parentId)) {
        nodeMap.get(parentId)!.children.push(treeNode);
      } else {
        roots.push(treeNode);
      }
    });

    return roots;
  }

  // ============================================================
  // View Mode
  // ============================================================

  setViewMode(mode: ViewMode): void {
    this.viewMode.set(mode);
  }

  toggleEditMode(): void {
    this.isEditMode.update(v => !v);
    if (!this.isEditMode()) {
      this.selectedNodes.set(new Set());
    }
  }

  toggleEmployeeNodes(): void {
    this.showEmployeeNodes.update(v => !v);
  }

  toggleCollaborations(): void {
    this.showCollaborations.update(v => !v);
  }

  toggleGridSnap(): void {
    this.gridSnapEnabled.update(v => !v);
  }

  // ============================================================
  // Canvas Controls — pan/zoom (from group-structure)
  // ============================================================

  zoomIn(): void {
    this.canvasScale.update(s => Math.min(s + 0.1, 2));
  }

  zoomOut(): void {
    this.canvasScale.update(s => Math.max(s - 0.1, 0.3));
  }

  resetZoom(): void {
    this.canvasScale.set(1);
    this.canvasPanX.set(0);
    this.canvasPanY.set(0);
  }

  onCanvasMouseDown(event: MouseEvent): void {
    if ((event.target as HTMLElement).closest('.org-node')) {
      return;
    }

    this.isPanning.set(true);
    this.panStartX = event.clientX - this.canvasPanX();
    this.panStartY = event.clientY - this.canvasPanY();

    if (this.isEditMode()) {
      this.selectedNodes.set(new Set());
    }
  }

  onCanvasMouseMove(event: MouseEvent): void {
    // Anchor dragging
    if (this.draggingAnchor()) {
      const pos = this.screenToCanvas(event.clientX, event.clientY);
      this.draggingAnchor.update(d => d ? { ...d, currentX: pos.x, currentY: pos.y } : null);
      this.cdr.detectChanges();
      return;
    }

    if (this.isPanning()) {
      this.canvasPanX.set(event.clientX - this.panStartX);
      this.canvasPanY.set(event.clientY - this.panStartY);
    }

    if (this.isDraggingNode() && this.draggingNodeId()) {
      const scale = this.canvasScale();
      let newX = (event.clientX - this.dragNodeOffsetX) / scale;
      let newY = (event.clientY - this.dragNodeOffsetY) / scale;

      if (this.gridSnapEnabled()) {
        newX = Math.round(newX / this.gridSize) * this.gridSize;
        newY = Math.round(newY / this.gridSize) * this.gridSize;
      }

      const positions = new Map(this.nodePositions());
      const nodeId = this.draggingNodeId()!;
      const oldPos = positions.get(nodeId);

      if (oldPos) {
        const deltaX = newX - oldPos.x;
        const deltaY = newY - oldPos.y;

        if (this.selectedNodes().has(nodeId) && this.selectedNodes().size > 1) {
          this.selectedNodes().forEach(id => {
            const pos = positions.get(id);
            if (pos) {
              let updatedX = pos.x + deltaX;
              let updatedY = pos.y + deltaY;
              if (this.gridSnapEnabled()) {
                updatedX = Math.round(updatedX / this.gridSize) * this.gridSize;
                updatedY = Math.round(updatedY / this.gridSize) * this.gridSize;
              }
              positions.set(id, { ...pos, x: updatedX, y: updatedY });
            }
          });
        } else {
          positions.set(nodeId, { id: nodeId, x: newX, y: newY });
        }
      }

      this.nodePositions.set(positions);
      this.cdr.detectChanges();
    }
  }

  onCanvasMouseUp(): void {
    // Handle anchor drag drop
    const dragAnchor = this.draggingAnchor();
    if (dragAnchor) {
      const collab = this.collaborations().find(c => c.id === dragAnchor.collabId);
      if (collab) {
        const nodeId = dragAnchor.endpoint === 'source' ? collab.sourceDeptId : collab.targetDeptId;
        const newSide = this.getNearestAnchorSide(dragAnchor.currentX, dragAnchor.currentY, nodeId);

        const updates = dragAnchor.endpoint === 'source'
          ? { sourceAnchor: newSide }
          : { targetAnchor: newSide };

        this.orgService.updateCollaboration(collab.id, updates).subscribe(updated => {
          this.collaborations.update(list =>
            list.map(c => c.id === updated.id ? { ...c, ...updates } : c)
          );
        });
      }
      this.draggingAnchor.set(null);
    }

    this.isPanning.set(false);
    this.isDraggingNode.set(false);
    this.draggingNodeId.set(null);
  }

  onCanvasWheel(event: WheelEvent): void {
    event.preventDefault();
    const delta = event.deltaY > 0 ? -0.05 : 0.05;
    this.canvasScale.update(s => Math.max(0.3, Math.min(2, s + delta)));
  }

  // ============================================================
  // Undo / Redo
  // ============================================================

  saveToHistory(): void {
    const currentPositions = new Map(this.nodePositions());
    this.undoStack.update(stack => {
      const newStack = [...stack, currentPositions];
      if (newStack.length > this.maxHistoryLength) {
        newStack.shift();
      }
      return newStack;
    });
    // Clear redo stack on new action
    this.redoStack.set([]);
  }

  undo(): void {
    const stack = this.undoStack();
    if (stack.length === 0) return;

    // Push current state to redo stack
    this.redoStack.update(rs => [...rs, new Map(this.nodePositions())]);

    const previousPositions = stack[stack.length - 1];
    this.undoStack.update(s => s.slice(0, -1));
    this.nodePositions.set(previousPositions);
  }

  redo(): void {
    const stack = this.redoStack();
    if (stack.length === 0) return;

    // Push current state to undo stack
    this.undoStack.update(us => [...us, new Map(this.nodePositions())]);

    const nextPositions = stack[stack.length - 1];
    this.redoStack.update(s => s.slice(0, -1));
    this.nodePositions.set(nextPositions);
  }

  canUndo(): boolean {
    return this.undoStack().length > 0;
  }

  canRedo(): boolean {
    return this.redoStack().length > 0;
  }

  // ============================================================
  // Node Interaction — drag/select (from group-structure)
  // ============================================================

  onNodeMouseDown(event: MouseEvent, nodeId: string): void {
    event.stopPropagation();

    if (this.isEditMode()) {
      this.saveToHistory();

      if (event.ctrlKey || event.metaKey) {
        this.selectedNodes.update(set => {
          const newSet = new Set(set);
          if (newSet.has(nodeId)) {
            newSet.delete(nodeId);
          } else {
            newSet.add(nodeId);
          }
          return newSet;
        });
      } else if (!this.selectedNodes().has(nodeId)) {
        this.selectedNodes.set(new Set([nodeId]));
      }

      this.isDraggingNode.set(true);
      this.draggingNodeId.set(nodeId);

      const pos = this.getNodePosition(nodeId);
      const scale = this.canvasScale();
      this.dragNodeOffsetX = event.clientX - pos.x * scale;
      this.dragNodeOffsetY = event.clientY - pos.y * scale;
    }
  }

  onNodeClick(event: MouseEvent, node: OrgTreeNode): void {
    event.stopPropagation();

    if (!this.isEditMode()) {
      this.openNodeDetail(node);
    }
  }

  isNodeSelected(nodeId: string): boolean {
    return this.selectedNodes().has(nodeId);
  }

  getNodePosition(nodeId: string): NodePosition {
    return this.nodePositions().get(nodeId) || { id: nodeId, x: 400, y: 60 };
  }

  // ============================================================
  // Expand / Collapse
  // ============================================================

  toggleNodeCollapse(event: MouseEvent, nodeId: string): void {
    event.stopPropagation();
    this.collapsedNodes.update(set => {
      const newSet = new Set(set);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  }

  isNodeCollapsed(nodeId: string): boolean {
    return this.collapsedNodes().has(nodeId);
  }

  hasChildren(nodeId: string): boolean {
    return this.orgTree().some(n => n.parentId === nodeId);
  }

  getChildCount(nodeId: string): number {
    return this.orgTree().filter(n => n.parentId === nodeId).length;
  }

  // ============================================================
  // Alignment (from group-structure L389-474)
  // ============================================================

  alignNodes(alignType: AlignType): void {
    const selected = Array.from(this.selectedNodes());
    if (selected.length < 2) return;

    this.saveToHistory();

    const positions = new Map(this.nodePositions());
    const selectedPositions = selected.map(id => positions.get(id)!).filter(p => p);
    if (selectedPositions.length < 2) return;

    const xs = selectedPositions.map(p => p.x);
    const ys = selectedPositions.map(p => p.y);

    switch (alignType) {
      case 'left': {
        const minX = Math.min(...xs);
        selected.forEach(id => {
          const pos = positions.get(id);
          if (pos) positions.set(id, { ...pos, x: minX });
        });
        break;
      }
      case 'center-h': {
        const avgX = xs.reduce((a, b) => a + b, 0) / xs.length;
        selected.forEach(id => {
          const pos = positions.get(id);
          if (pos) positions.set(id, { ...pos, x: Math.round(avgX / this.gridSize) * this.gridSize });
        });
        break;
      }
      case 'right': {
        const maxX = Math.max(...xs);
        selected.forEach(id => {
          const pos = positions.get(id);
          if (pos) positions.set(id, { ...pos, x: maxX });
        });
        break;
      }
      case 'top': {
        const minY = Math.min(...ys);
        selected.forEach(id => {
          const pos = positions.get(id);
          if (pos) positions.set(id, { ...pos, y: minY });
        });
        break;
      }
      case 'center-v': {
        const avgY = ys.reduce((a, b) => a + b, 0) / ys.length;
        selected.forEach(id => {
          const pos = positions.get(id);
          if (pos) positions.set(id, { ...pos, y: Math.round(avgY / this.gridSize) * this.gridSize });
        });
        break;
      }
      case 'bottom': {
        const maxY = Math.max(...ys);
        selected.forEach(id => {
          const pos = positions.get(id);
          if (pos) positions.set(id, { ...pos, y: maxY });
        });
        break;
      }
      case 'distribute-h': {
        if (selected.length < 3) return;
        const sortedByX = [...selectedPositions].sort((a, b) => a.x - b.x);
        const totalW = sortedByX[sortedByX.length - 1].x - sortedByX[0].x;
        const spacingH = totalW / (sortedByX.length - 1);
        sortedByX.forEach((pos, index) => {
          const newX = sortedByX[0].x + index * spacingH;
          positions.set(pos.id, { ...pos, x: Math.round(newX / this.gridSize) * this.gridSize });
        });
        break;
      }
      case 'distribute-v': {
        if (selected.length < 3) return;
        const sortedByY = [...selectedPositions].sort((a, b) => a.y - b.y);
        const totalH = sortedByY[sortedByY.length - 1].y - sortedByY[0].y;
        const spacingV = totalH / (sortedByY.length - 1);
        sortedByY.forEach((pos, index) => {
          const newY = sortedByY[0].y + index * spacingV;
          positions.set(pos.id, { ...pos, y: Math.round(newY / this.gridSize) * this.gridSize });
        });
        break;
      }
    }

    this.nodePositions.set(positions);
  }

  autoArrange(): void {
    this.saveToHistory();
    this.initializeNodePositions();
    this.selectedNodes.set(new Set());
  }

  selectAllNodes(): void {
    const allIds = new Set(this.orgTree().map(n => n.id));
    this.selectedNodes.set(allIds);
  }

  clearSelection(): void {
    this.selectedNodes.set(new Set());
  }

  // ============================================================
  // SVG Connection Paths — Bézier with per-type dimensions
  // ============================================================

  getConnectionPath(parentId: string, childId: string): string {
    const parentPos = this.getNodePosition(parentId);
    const childPos = this.getNodePosition(childId);

    const parentNode = this.orgTree().find(n => n.id === parentId);
    const childNode = this.orgTree().find(n => n.id === childId);

    const parentDim = this.getNodeDimensions(parentNode?.type || 'department');
    const childDim = this.getNodeDimensions(childNode?.type || 'department');

    // Parent card boundaries (x = center)
    const parentTop = parentPos.y;
    const parentBottom = parentPos.y + parentDim.height;
    const parentLeft = parentPos.x - parentDim.width / 2;
    const parentRight = parentPos.x + parentDim.width / 2;
    const parentCenterY = parentPos.y + parentDim.height / 2;

    // Child card boundaries
    const childTop = childPos.y;
    const childBottom = childPos.y + childDim.height;
    const childLeft = childPos.x - childDim.width / 2;
    const childRight = childPos.x + childDim.width / 2;
    const childCenterY = childPos.y + childDim.height / 2;

    const isChildAbove = childBottom < parentCenterY;
    const isChildBelow = childTop > parentCenterY;

    if (isChildAbove) {
      const startX = parentPos.x;
      const startY = parentTop;
      const endX = childPos.x;
      const endY = childBottom;
      const midY = startY + (endY - startY) / 2;
      return `M ${startX} ${startY} C ${startX} ${midY}, ${endX} ${midY}, ${endX} ${endY}`;
    } else if (isChildBelow) {
      const startX = parentPos.x;
      const startY = parentBottom;
      const endX = childPos.x;
      const endY = childTop;
      const midY = startY + (endY - startY) / 2;
      return `M ${startX} ${startY} C ${startX} ${midY}, ${endX} ${midY}, ${endX} ${endY}`;
    } else {
      let startX: number, startY: number, endX: number, endY: number;
      if (childPos.x > parentPos.x) {
        startX = parentRight;
        startY = parentCenterY;
        endX = childLeft;
        endY = childCenterY;
      } else {
        startX = parentLeft;
        startY = parentCenterY;
        endX = childRight;
        endY = childCenterY;
      }
      const midX = startX + (endX - startX) / 2;
      return `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`;
    }
  }

  // Collaboration dashed line
  /** 取得錨點座標（卡片邊緣中點） */
  getAnchorPoint(nodeId: string, side: AnchorSide): { x: number; y: number } {
    const pos = this.getNodePosition(nodeId);
    const node = this.orgTree().find(n => n.id === nodeId);
    const dim = this.getNodeDimensions(node?.type || 'department');
    const cx = pos.x;  // x is center
    const cy = pos.y + dim.height / 2;

    switch (side) {
      case 'top':    return { x: cx, y: pos.y };
      case 'bottom': return { x: cx, y: pos.y + dim.height };
      case 'left':   return { x: cx - dim.width / 2, y: cy };
      case 'right':  return { x: cx + dim.width / 2, y: cy };
    }
  }

  /** 智慧錨點：根據兩節點相對位置自動選擇最佳連接邊 */
  getSmartAnchor(sourceId: string, targetId: string): { srcSide: AnchorSide; tgtSide: AnchorSide } {
    const srcPos = this.getNodePosition(sourceId);
    const tgtPos = this.getNodePosition(targetId);
    const srcNode = this.orgTree().find(n => n.id === sourceId);
    const tgtNode = this.orgTree().find(n => n.id === targetId);
    const srcDim = this.getNodeDimensions(srcNode?.type || 'department');
    const tgtDim = this.getNodeDimensions(tgtNode?.type || 'department');

    const dx = tgtPos.x - srcPos.x;
    const dy = (tgtPos.y + tgtDim.height / 2) - (srcPos.y + srcDim.height / 2);

    // Prefer horizontal (left/right) to avoid overlapping with hierarchy lines.
    // Only use vertical when nodes are nearly side-by-side (large dx, small dy).
    if (Math.abs(dx) < srcDim.width * 0.3) {
      // Nodes are nearly vertically aligned → use right side to route around
      return dy > 0
        ? { srcSide: 'right', tgtSide: 'right' }
        : { srcSide: 'right', tgtSide: 'right' };
    } else if (Math.abs(dy) > Math.abs(dx) * 1.5) {
      // Strong vertical offset with some horizontal → use diagonal (side → top/bottom)
      return dx > 0
        ? { srcSide: 'right', tgtSide: dy > 0 ? 'top' : 'bottom' }
        : { srcSide: 'left', tgtSide: dy > 0 ? 'top' : 'bottom' };
    } else {
      // Default: horizontal left/right
      return dx > 0
        ? { srcSide: 'right', tgtSide: 'left' }
        : { srcSide: 'left', tgtSide: 'right' };
    }
  }

  getCollaborationPath(sourceId: string, targetId: string, srcAnchor?: AnchorSide | null, tgtAnchor?: AnchorSide | null): string {
    const smart = this.getSmartAnchor(sourceId, targetId);
    const srcSide = srcAnchor || smart.srcSide;
    const tgtSide = tgtAnchor || smart.tgtSide;

    const start = this.getAnchorPoint(sourceId, srcSide);
    const end = this.getAnchorPoint(targetId, tgtSide);

    // Build control points based on anchor directions
    const offset = Math.max(40, Math.abs(start.x - end.x) * 0.3, Math.abs(start.y - end.y) * 0.3);

    const cp1 = this.getControlPoint(start, srcSide, offset);
    const cp2 = this.getControlPoint(end, tgtSide, offset);

    return `M ${start.x} ${start.y} C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${end.x} ${end.y}`;
  }

  private getControlPoint(point: { x: number; y: number }, side: AnchorSide, offset: number): { x: number; y: number } {
    switch (side) {
      case 'top':    return { x: point.x, y: point.y - offset };
      case 'bottom': return { x: point.x, y: point.y + offset };
      case 'left':   return { x: point.x - offset, y: point.y };
      case 'right':  return { x: point.x + offset, y: point.y };
    }
  }

  /** 取得協作線的中點座標（用於標籤定位） */
  getCollaborationMidpoint(sourceId: string, targetId: string, srcAnchor?: AnchorSide | null, tgtAnchor?: AnchorSide | null): { x: number; y: number } {
    const smart = this.getSmartAnchor(sourceId, targetId);
    const srcSide = srcAnchor || smart.srcSide;
    const tgtSide = tgtAnchor || smart.tgtSide;

    const start = this.getAnchorPoint(sourceId, srcSide);
    const end = this.getAnchorPoint(targetId, tgtSide);

    const offset = Math.max(40, Math.abs(start.x - end.x) * 0.3, Math.abs(start.y - end.y) * 0.3);
    const cp1 = this.getControlPoint(start, srcSide, offset);
    const cp2 = this.getControlPoint(end, tgtSide, offset);

    // Bezier midpoint at t=0.5
    const t = 0.5;
    const mt = 1 - t;
    return {
      x: mt * mt * mt * start.x + 3 * mt * mt * t * cp1.x + 3 * mt * t * t * cp2.x + t * t * t * end.x,
      y: mt * mt * mt * start.y + 3 * mt * mt * t * cp1.y + 3 * mt * t * t * cp2.y + t * t * t * end.y
    };
  }

  getCollaborationColor(type: SimpleCollaborationType): string {
    return type === 'parallel' ? '#CD853F' : '#6B8E23';
  }

  getCollaborationLabel(type: SimpleCollaborationType): string {
    return type === 'parallel' ? '平行' : '下游';
  }

  getDepartmentCollaborations(deptId: string): SimpleCollaboration[] {
    return this.collaborations().filter(
      c => c.sourceDeptId === deptId || c.targetDeptId === deptId
    );
  }

  // ============================================================
  // Anchor Editing
  // ============================================================

  private readonly anchorCycle: (AnchorSide | null)[] = [null, 'top', 'right', 'bottom', 'left'];

  toggleEditingAnchor(event: MouseEvent, collabId: string): void {
    event.stopPropagation();
    const current = this.editingAnchorCollabId();
    this.editingAnchorCollabId.set(current === collabId ? null : collabId);
  }

  cycleAnchor(event: MouseEvent, collabId: string, endpoint: 'source' | 'target'): void {
    event.stopPropagation();
    const collab = this.collaborations().find(c => c.id === collabId);
    if (!collab) return;

    const current = endpoint === 'source' ? collab.sourceAnchor : collab.targetAnchor;
    const idx = this.anchorCycle.indexOf(current ?? null);
    const next = this.anchorCycle[(idx + 1) % this.anchorCycle.length];

    const updates = endpoint === 'source'
      ? { sourceAnchor: next }
      : { targetAnchor: next };

    this.orgService.updateCollaboration(collab.id, updates).subscribe(updated => {
      this.collaborations.update(list =>
        list.map(c => c.id === updated.id ? { ...c, ...updates } : c)
      );
    });
  }

  getAnchorLabel(anchor: AnchorSide | null | undefined): string {
    if (!anchor) return '自動';
    switch (anchor) {
      case 'top': return '上';
      case 'bottom': return '下';
      case 'left': return '左';
      case 'right': return '右';
    }
  }

  /** 拖曳錨點：開始 */
  onAnchorDragStart(event: MouseEvent, collabId: string, endpoint: 'source' | 'target'): void {
    event.stopPropagation();
    event.preventDefault();
    const pos = this.screenToCanvas(event.clientX, event.clientY);
    this.draggingAnchor.set({
      collabId, endpoint,
      startX: pos.x, startY: pos.y,
      currentX: pos.x, currentY: pos.y
    });
  }

  /** 螢幕座標轉換為畫布座標 */
  private screenToCanvas(clientX: number, clientY: number): { x: number; y: number } {
    const container = this.canvasContainerRef?.nativeElement;
    if (!container) return { x: 0, y: 0 };
    const rect = container.getBoundingClientRect();
    return {
      x: (clientX - rect.left - this.canvasPanX()) / this.canvasScale(),
      y: (clientY - rect.top - this.canvasPanY()) / this.canvasScale()
    };
  }

  /** 根據座標找出最近的卡片邊緣方向 */
  getNearestAnchorSide(x: number, y: number, nodeId: string): AnchorSide | null {
    const pos = this.getNodePosition(nodeId);
    const node = this.orgTree().find(n => n.id === nodeId);
    const dim = this.getNodeDimensions(node?.type || 'department');
    const cx = pos.x;
    const cy = pos.y + dim.height / 2;

    const sides: { side: AnchorSide; point: { x: number; y: number } }[] = [
      { side: 'top', point: { x: cx, y: pos.y } },
      { side: 'bottom', point: { x: cx, y: pos.y + dim.height } },
      { side: 'left', point: { x: cx - dim.width / 2, y: cy } },
      { side: 'right', point: { x: cx + dim.width / 2, y: cy } },
    ];

    let nearest = sides[0];
    let minDist = Infinity;
    for (const s of sides) {
      const dist = Math.hypot(x - s.point.x, y - s.point.y);
      if (dist < minDist) {
        minDist = dist;
        nearest = s;
      }
    }
    // 超出 120px 則回復自動模式
    return minDist > 120 ? null : nearest.side;
  }

  /** 拖曳中預覽：目前最近的錨點方向 */
  getDragPreviewSide(): AnchorSide | null {
    const drag = this.draggingAnchor();
    if (!drag) return null;
    const collab = this.collaborations().find(c => c.id === drag.collabId);
    if (!collab) return null;
    const nodeId = drag.endpoint === 'source' ? collab.sourceDeptId : collab.targetDeptId;
    return this.getNearestAnchorSide(drag.currentX, drag.currentY, nodeId);
  }

  /** 拖曳中取得協作線顏色 */
  getDragCollabColor(): string {
    const drag = this.draggingAnchor();
    if (!drag) return '#94A3B8';
    const collab = this.collaborations().find(c => c.id === drag.collabId);
    return collab ? this.getCollaborationColor(collab.relationType) : '#94A3B8';
  }

  // ============================================================
  // Node Detail Modal
  // ============================================================

  openNodeDetail(node: OrgTreeNode): void {
    this.selectedNode.set(node);
    this.showNodeDetail.set(true);

    // Reset all detail signals
    this.nodeDetailEmployees.set([]);
    this.nodeDetailPositions.set([]);
    this.nodeDetailSubsidiaries.set([]);
    this.nodeDetailDepartments.set([]);

    if (node.type === 'department') {
      // Lazy-load employees and positions for department nodes
      this.orgService.getDepartmentEmployees(node.id).subscribe(data => {
        this.nodeDetailEmployees.set(data);
      });
      this.orgService.getDepartmentPositions(node.id).subscribe(data => {
        this.nodeDetailPositions.set(data);
      });
    } else if (node.type === 'group' || node.type === 'subsidiary') {
      // Lazy-load company detail: subsidiaries + departments
      this.orgService.getCompanyDetail(node.id).subscribe(detail => {
        this.nodeDetailSubsidiaries.set(detail?.subsidiaries || []);
        this.nodeDetailDepartments.set(detail?.departments || []);
      });
    }
  }

  closeNodeDetail(): void {
    this.showNodeDetail.set(false);
    this.selectedNode.set(null);
    this.nodeDetailEmployees.set([]);
    this.nodeDetailPositions.set([]);
    this.nodeDetailSubsidiaries.set([]);
    this.nodeDetailDepartments.set([]);
  }

  // ============================================================
  // Company Form (group/subsidiary) — uses TenantAdminService
  // ============================================================

  openCreateCompanyForm(parentNode?: OrgTreeNode): void {
    const childType = parentNode?.type === 'group' ? 'subsidiary' : 'group';
    this.companyForm.set({
      name: '', code: '', type: childType,
      parent_id: parentNode?.id || null,
      address: '', phone: '', email: '', description: '',
      tax_id: '', status: 'active', established_date: ''
    });
    this.isEditingCompany.set(false);
    this.showCompanyForm.set(true);
    this.companyFormSnapshot = JSON.stringify(this.companyForm());
  }

  openEditCompanyForm(node: OrgTreeNode): void {
    this.companyForm.set({
      id: node.id,
      name: node.name,
      code: node.code || '',
      type: node.type,
      parent_id: node.parentId,
      address: node.address || '',
      phone: node.phone || '',
      email: node.email || '',
      description: node.description || '',
      tax_id: node.taxId || '',
      status: (node.status as 'active' | 'inactive') || 'active',
      established_date: node.establishedDate || ''
    });
    this.isEditingCompany.set(true);
    this.showCompanyForm.set(true);
    this.companyFormSnapshot = JSON.stringify(this.companyForm());
    this.closeNodeDetail();
  }

  closeCompanyForm(): void {
    this.showCompanyForm.set(false);
    this.companyForm.set({
      name: '', code: '', type: 'group', parent_id: null,
      address: '', phone: '', email: '', description: '',
      tax_id: '', status: 'active', established_date: ''
    });
  }

  saveCompanyForm(): void {
    const data = this.companyForm();
    if (!data.name) return;

    const companyType = data.type as CompanyType;

    if (this.isEditingCompany() && data.id) {
      this.orgService.updateCompany(data.id, {
        name: data.name,
        code: data.code || undefined,
        type: companyType,
        address: data.address || undefined,
        phone: data.phone || undefined,
        email: data.email || undefined,
        description: data.description || undefined,
        taxId: data.tax_id || undefined,
        status: data.status as CompanyStatus,
        establishedDate: data.established_date ? new Date(data.established_date) : undefined
      }).subscribe(() => {
        this.closeCompanyForm();
        this.loadData();
      });
    } else {
      this.orgService.createCompany({
        name: data.name,
        code: data.code || '',
        type: companyType,
        parentCompanyId: data.parent_id || undefined,
        address: data.address || '',
        phone: data.phone || undefined,
        email: data.email || undefined,
        employeeCount: 0,
        departmentCount: 0,
        establishedDate: data.established_date ? new Date(data.established_date) : new Date(),
        status: data.status as CompanyStatus,
        description: data.description || undefined,
        taxId: data.tax_id || undefined
      } as any).subscribe(() => {
        this.closeCompanyForm();
        this.loadData();
      });
    }
  }

  // ============================================================
  // Department Form — uses OrganizationService extended API
  // ============================================================

  openCreateDepartmentForm(parentNode?: OrgTreeNode): void {
    this.departmentForm.set({
      name: '',
      code: '',
      parentId: parentNode?.id || null,
      managerId: null,
      responsibilities: [],
      kpiItems: [],
      competencyFocus: []
    });
    this.isEditingDepartment.set(false);
    this.showDepartmentForm.set(true);
    this.departmentFormSnapshot = JSON.stringify(this.departmentForm());
  }

  openEditDepartmentForm(node: OrgTreeNode): void {
    // Backward compatibility: convert old string[] to new object format
    const rawFocus = node.competencyFocus || [];
    const parsedFocus = rawFocus.map((item: any) => {
      if (typeof item === 'string') {
        return { name: item, jobs: [] };
      }
      return { name: item.name || '', jobs: item.jobs || [] };
    });
    this.departmentForm.set({
      id: node.id,
      name: node.name,
      code: node.code || '',
      parentId: node.parentId,
      managerId: node.managerId,
      responsibilities: [...node.responsibilities],
      kpiItems: [...node.kpiItems],
      competencyFocus: parsedFocus
    });
    this.isEditingDepartment.set(true);
    this.showDepartmentForm.set(true);
    this.departmentFormSnapshot = JSON.stringify(this.departmentForm());
    this.closeNodeDetail();
  }

  closeDepartmentForm(): void {
    this.showDepartmentForm.set(false);
  }

  saveDepartmentForm(): void {
    const data = this.departmentForm();
    if (!data.name) return;

    if (this.isEditingDepartment() && data.id) {
      this.orgService.updateDepartmentExtended(data.id, {
        name: data.name,
        code: data.code || undefined,
        managerId: data.managerId || undefined,
        responsibilities: data.responsibilities,
        kpiItems: data.kpiItems,
        competencyFocus: data.competencyFocus
      }).subscribe(() => {
        this.closeDepartmentForm();
        this.loadData();
      });
    } else {
      // Create as org_unit type=department, then update extended fields
      this.tenantAdminService.createOrgUnit({
        name: data.name,
        type: 'department',
        parent_id: data.parentId
      }).subscribe((result: any) => {
        if (result?.id) {
          this.orgService.updateDepartmentExtended(result.id, {
            managerId: data.managerId || undefined,
            responsibilities: data.responsibilities,
            kpiItems: data.kpiItems,
            competencyFocus: data.competencyFocus
          }).subscribe(() => {
            this.closeDepartmentForm();
            this.loadData();
          });
        } else {
          this.closeDepartmentForm();
          this.loadData();
        }
      });
    }
  }

  // Dynamic list helpers for responsibilities / kpiItems
  addListItem(field: 'responsibilities' | 'kpiItems'): void {
    this.departmentForm.update(f => ({
      ...f,
      [field]: [...f[field], '']
    }));
  }

  removeListItem(field: 'responsibilities' | 'kpiItems', index: number): void {
    this.departmentForm.update(f => ({
      ...f,
      [field]: f[field].filter((_, i) => i !== index)
    }));
  }

  updateListItem(field: 'responsibilities' | 'kpiItems', index: number, value: string): void {
    this.departmentForm.update(f => {
      const list = [...f[field]];
      list[index] = value;
      return { ...f, [field]: list };
    });
  }

  addCompetencyCategory(): void {
    this.departmentForm.update(f => ({
      ...f,
      competencyFocus: [...f.competencyFocus, { name: '', jobs: [] }]
    }));
  }

  removeCompetencyCategory(catIndex: number): void {
    this.departmentForm.update(f => ({
      ...f,
      competencyFocus: f.competencyFocus.filter((_, i) => i !== catIndex)
    }));
  }

  updateCategoryName(catIndex: number, name: string): void {
    this.departmentForm.update(f => {
      const cats = [...f.competencyFocus];
      cats[catIndex] = { ...cats[catIndex], name };
      return { ...f, competencyFocus: cats };
    });
  }

  addCategoryJob(catIndex: number): void {
    this.departmentForm.update(f => {
      const cats = [...f.competencyFocus];
      cats[catIndex] = { ...cats[catIndex], jobs: [...cats[catIndex].jobs, { name: '', description: '' }] };
      return { ...f, competencyFocus: cats };
    });
  }

  removeCategoryJob(catIndex: number, jobIndex: number): void {
    this.departmentForm.update(f => {
      const cats = [...f.competencyFocus];
      cats[catIndex] = { ...cats[catIndex], jobs: cats[catIndex].jobs.filter((_, i) => i !== jobIndex) };
      return { ...f, competencyFocus: cats };
    });
  }

  updateJobField(catIndex: number, jobIndex: number, field: 'name' | 'description', value: string): void {
    this.departmentForm.update(f => {
      const cats = [...f.competencyFocus];
      const jobs = [...cats[catIndex].jobs];
      jobs[jobIndex] = { ...jobs[jobIndex], [field]: value };
      cats[catIndex] = { ...cats[catIndex], jobs };
      return { ...f, competencyFocus: cats };
    });
  }

  // ============================================================
  // Collaboration Form
  // ============================================================

  openCreateCollaborationForm(lockedSourceDeptId?: string): void {
    const depts = this.departmentNodes();
    const sourceId = lockedSourceDeptId || depts[0]?.id || '';
    const targetId = depts.find(d => d.id !== sourceId)?.id || '';
    this.collaborationForm.set({
      sourceDeptId: sourceId,
      targetDeptId: targetId,
      relationType: 'parallel',
      description: ''
    });
    this.collabSourceLocked.set(!!lockedSourceDeptId);
    this.isEditingCollaboration.set(false);
    this.showCollaborationForm.set(true);
    this.collabFormSnapshot = JSON.stringify(this.collaborationForm());
  }

  openEditCollaborationForm(collab: SimpleCollaboration): void {
    this.collaborationForm.set({
      id: collab.id,
      sourceDeptId: collab.sourceDeptId,
      targetDeptId: collab.targetDeptId,
      relationType: collab.relationType,
      description: collab.description || ''
    });
    this.isEditingCollaboration.set(true);
    this.showCollaborationForm.set(true);
    this.collabFormSnapshot = JSON.stringify(this.collaborationForm());
  }

  closeCollaborationForm(): void {
    this.showCollaborationForm.set(false);
  }

  saveCollaborationForm(): void {
    const data = this.collaborationForm();
    if (!data.sourceDeptId || !data.targetDeptId) return;

    if (this.isEditingCollaboration() && data.id) {
      this.orgService.updateCollaboration(data.id, {
        relationType: data.relationType,
        description: data.description || undefined
      }).subscribe(() => {
        this.closeCollaborationForm();
        this.loadData();
      });
    } else {
      this.orgService.createCollaboration({
        sourceDeptId: data.sourceDeptId,
        targetDeptId: data.targetDeptId,
        relationType: data.relationType,
        description: data.description || undefined
      }).subscribe(() => {
        this.closeCollaborationForm();
        this.loadData();
      });
    }
  }

  // ============================================================
  // Delete Confirmation
  // ============================================================

  confirmDeleteNode(node: OrgTreeNode): void {
    this.deleteTarget.set({ type: 'node', id: node.id, name: node.name });
    this.showDeleteConfirm.set(true);
    this.closeNodeDetail();
  }

  confirmDeleteCollaboration(collab: SimpleCollaboration): void {
    const name = `${collab.sourceName || collab.sourceDeptId} → ${collab.targetName || collab.targetDeptId}`;
    this.deleteTarget.set({ type: 'collaboration', id: collab.id, name });
    this.showDeleteConfirm.set(true);
  }

  closeDeleteConfirm(): void {
    this.showDeleteConfirm.set(false);
    this.deleteTarget.set(null);
  }

  executeDelete(): void {
    const target = this.deleteTarget();
    if (!target) return;

    if (target.type === 'node') {
      this.tenantAdminService.deleteOrgUnit(target.id).subscribe(() => {
        this.closeDeleteConfirm();
        this.loadData();
      });
    } else {
      this.orgService.deleteCollaboration(target.id).subscribe(() => {
        this.closeDeleteConfirm();
        this.loadData();
      });
    }
  }

  // ============================================================
  // PNG Export (task 4.5)
  // ============================================================

  async exportPNG(): Promise<void> {
    const container = this.canvasContainerRef?.nativeElement;
    if (!container) return;

    try {
      const html2canvas = (await import('html2canvas')).default;

      // Temporarily reset transform for capture
      const originalTransform = container.style.transform;
      container.style.transform = 'none';

      const canvas = await html2canvas(container, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true
      });

      // Restore transform
      container.style.transform = originalTransform;

      // Download
      const link = document.createElement('a');
      const date = new Date().toISOString().split('T')[0];
      link.download = `組織架構圖_${date}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('PNG 匯出失敗:', err);
    }
  }

  // ============================================================
  // Helpers
  // ============================================================

  getTypeLabel(type: OrgNodeType | string): string {
    const labels: Record<string, string> = {
      group: '集團',
      subsidiary: '子公司',
      department: '部門'
    };
    return labels[type] || type;
  }

  getTypeIcon(type: OrgNodeType | string): string {
    const icons: Record<string, string> = {
      group: 'ri-building-4-line',
      subsidiary: 'ri-building-line',
      department: 'ri-organization-chart'
    };
    return icons[type] || 'ri-folder-line';
  }

  getParentOptions(excludeId?: string): OrgTreeNode[] {
    return this.orgTree().filter(n => {
      if (excludeId && n.id === excludeId) return false;
      return n.type !== 'department' || true; // all nodes can be parents
    });
  }

  getNodeName(nodeId: string): string {
    return this.orgTree().find(n => n.id === nodeId)?.name || '';
  }

  trackByNodeId(index: number, item: { node: OrgTreeNode; level: number }): string {
    return item.node.id;
  }

  trackByCollabId(index: number, item: SimpleCollaboration): string {
    return item.id;
  }

  // ============================================================
  // Contextual Child Node Creation
  // ============================================================

  getValidChildTypes(node: OrgTreeNode): { type: string; label: string }[] {
    if (node.type === 'group') {
      return [
        { type: 'subsidiary', label: '子公司' },
        { type: 'department', label: '部門' }
      ];
    }
    if (node.type === 'subsidiary') {
      return [{ type: 'department', label: '部門' }];
    }
    if (node.type === 'department') {
      return [{ type: 'department', label: '子部門' }];
    }
    return [];
  }

  openCreateChildNode(parent: OrgTreeNode, childType: string): void {
    this.closeNodeDetail();
    if (childType === 'subsidiary' || childType === 'group') {
      this.openCreateCompanyForm(parent);
    } else if (childType === 'department') {
      this.openCreateDepartmentForm(parent);
    }
  }

  getDepartmentEmployees(): Employee[] {
    const form = this.departmentForm();
    if (!form.id) return [];
    const dept = this.orgTree().find(n => n.id === form.id);
    if (!dept) return [];
    return this.allEmployees().filter(emp =>
      emp.positions.some(p => p.departmentName === dept.name)
    );
  }

  getStatusLabel(status?: string): string {
    return status === 'inactive' ? '已停止' : '營運中';
  }

  getStatusClass(status?: string): string {
    return status === 'inactive' ? 'status--inactive' : 'status--active';
  }

  // ============================================================
  // Modal Guard (dirty check on overlay click)
  // ============================================================

  guardCloseCompanyForm(): void {
    if (JSON.stringify(this.companyForm()) !== this.companyFormSnapshot) {
      if (!confirm('您有未儲存的變更，確定要關閉嗎？')) return;
    }
    this.closeCompanyForm();
  }

  guardCloseDepartmentForm(): void {
    if (JSON.stringify(this.departmentForm()) !== this.departmentFormSnapshot) {
      if (!confirm('您有未儲存的變更，確定要關閉嗎？')) return;
    }
    this.closeDepartmentForm();
  }

  guardCloseCollaborationForm(): void {
    if (JSON.stringify(this.collaborationForm()) !== this.collabFormSnapshot) {
      if (!confirm('您有未儲存的變更，確定要關閉嗎？')) return;
    }
    this.closeCollaborationForm();
  }

  // ============================================================
  // Form Field Update Helpers (Angular templates don't support arrow functions)
  // ============================================================

  updateCompanyFormField(field: string, value: string | null): void {
    this.companyForm.update(f => ({ ...f, [field]: value }));
  }

  updateDeptFormField(field: string, value: string | null): void {
    this.departmentForm.update(f => ({ ...f, [field]: value } as any));
  }

  updateCollabFormField(field: string, value: string): void {
    this.collaborationForm.update(f => ({ ...f, [field]: value } as any));
  }
}
