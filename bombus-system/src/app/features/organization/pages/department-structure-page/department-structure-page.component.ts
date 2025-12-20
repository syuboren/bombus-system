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
import { OrganizationService } from '../../services/organization.service';
import {
  Company,
  Department,
  DepartmentCollaboration
} from '../../models/organization.model';

type ViewMode = 'canvas' | 'list';
type AlignType = 'left' | 'center-h' | 'right' | 'top' | 'center-v' | 'bottom' | 'distribute-h' | 'distribute-v';

interface NodePosition {
  id: string;
  x: number;
  y: number;
}

interface DepartmentNode {
  department: Department;
  children: DepartmentNode[];
  expanded: boolean;
}

@Component({
  selector: 'app-department-structure-page',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent],
  templateUrl: './department-structure-page.component.html',
  styleUrl: './department-structure-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DepartmentStructurePageComponent implements OnInit, AfterViewInit {
  private orgService = inject(OrganizationService);
  private cdr = inject(ChangeDetectorRef);

  @ViewChild('canvasContainer') canvasContainerRef!: ElementRef<HTMLDivElement>;

  // Page Info
  readonly pageTitle = '部門結構管理';
  readonly breadcrumbs = ['首頁', '組織管理'];

  // Data signals
  companies = signal<Company[]>([]);
  departments = signal<Department[]>([]);
  collaborations = signal<DepartmentCollaboration[]>([]);
  loading = signal(true);

  // Filters
  selectedCompanyId = signal<string>('');

  // View mode
  viewMode = signal<ViewMode>('canvas');

  // Edit mode
  isEditMode = signal(false);

  // Canvas state
  canvasScale = signal(1);
  canvasPanX = signal(0);
  canvasPanY = signal(0);
  isPanning = signal(false);
  panStartX = 0;
  panStartY = 0;

  // Node positions
  nodePositions = signal<Map<string, NodePosition>>(new Map());

  // Undo history
  positionHistory = signal<Map<string, NodePosition>[]>([]);
  readonly maxHistoryLength = 50;

  // Node dimensions for connection calculations (match CSS)
  readonly nodeWidth = 200;
  readonly nodeHeight = 90; // Actual card height including padding

  // Node dragging
  isDraggingNode = signal(false);
  draggingNodeId = signal<string | null>(null);
  dragNodeOffsetX = 0;
  dragNodeOffsetY = 0;

  // Multi-selection
  selectedNodes = signal<Set<string>>(new Set());

  // Grid snap
  gridSnapEnabled = signal(true);
  readonly gridSize = 20;

  // Selected department for modal
  selectedDepartment = signal<Department | null>(null);
  showDepartmentModal = signal(false);

  // Department navigation history for back button
  departmentViewHistory = signal<Department[]>([]);

  // Create/Edit department form
  showDepartmentForm = signal(false);
  isEditingDepartment = signal(false);
  departmentForm = signal<Partial<Department>>({});

  // Delete confirmation
  showDeleteConfirm = signal(false);
  departmentToDelete = signal<Department | null>(null);

  // Show collaboration lines
  showCollaborations = signal(true);

  // Filtered departments by company
  filteredDepartments = computed(() => {
    const companyId = this.selectedCompanyId();
    const all = this.departments();
    if (!companyId) return all;
    return all.filter(d => d.companyId === companyId);
  });

  // Tree structure for current company
  departmentTree = computed<DepartmentNode[]>(() => {
    const depts = this.filteredDepartments();
    const rootDepts = depts.filter(d => !d.parentDepartmentId);

    const buildTree = (parent: Department): DepartmentNode => {
      const children = depts.filter(d => d.parentDepartmentId === parent.id);
      return {
        department: parent,
        children: children.map(c => buildTree(c)),
        expanded: true
      };
    };

    return rootDepts.map(d => buildTree(d));
  });

  // Flat list for list view
  flatDepartmentList = computed(() => {
    const result: { department: Department; level: number }[] = [];
    const traverse = (nodes: DepartmentNode[], level: number) => {
      nodes.forEach(node => {
        result.push({ department: node.department, level });
        traverse(node.children, level + 1);
      });
    };
    traverse(this.departmentTree(), 0);
    return result;
  });

  // Count departments by level
  level2DepartmentCount = computed(() => {
    return this.filteredDepartments().filter(d => d.level === 2).length;
  });

  level3DepartmentCount = computed(() => {
    return this.filteredDepartments().filter(d => d.level === 3).length;
  });

  // Total employee count for selected company
  totalEmployeeCount = computed(() => {
    return this.filteredDepartments().reduce((sum, d) => sum + d.employeeCount, 0);
  });

  // Collaboration lines for canvas
  collaborationLines = computed(() => {
    const collabs = this.collaborations();
    const depts = this.filteredDepartments();
    const deptMap = new Map(depts.map(d => [d.id, d]));

    return collabs
      .filter(c =>
        deptMap.has(c.sourceDepartmentId) &&
        deptMap.has(c.targetDepartmentId)
      )
      .map(c => ({
        collaboration: c,
        source: deptMap.get(c.sourceDepartmentId)!,
        target: deptMap.get(c.targetDepartmentId)!
      }));
  });

  ngOnInit(): void {
    this.loadData();
  }

  ngAfterViewInit(): void {
    // Canvas initialization
  }

  loadData(): void {
    this.loading.set(true);

    this.orgService.getCompanies().subscribe(data => {
      this.companies.set(data);
      if (data.length > 0 && !this.selectedCompanyId()) {
        this.selectedCompanyId.set(data[0].id);
      }
    });

    this.orgService.getDepartments().subscribe(data => {
      this.departments.set(data);
      this.initializeNodePositions();
      this.loading.set(false);
    });

    this.orgService.getDepartmentCollaborations().subscribe(data => {
      this.collaborations.set(data);
    });
  }

  // Initialize node positions based on tree structure
  initializeNodePositions(): void {
    const positions = new Map<string, NodePosition>();
    const depts = this.filteredDepartments();
    const rootDepts = depts.filter(d => !d.parentDepartmentId);
    const nodeWidth = 200;
    const horizontalSpacing = 220;
    const verticalSpacing = 160;

    // Calculate total width needed for a subtree
    const getSubtreeWidth = (dept: Department): number => {
      const children = depts.filter(d => d.parentDepartmentId === dept.id);
      if (children.length === 0) {
        return nodeWidth;
      }
      const childrenTotalWidth = children.reduce((sum, child) => sum + getSubtreeWidth(child), 0);
      const gapsBetweenChildren = (children.length - 1) * (horizontalSpacing - nodeWidth);
      return Math.max(nodeWidth, childrenTotalWidth + gapsBetweenChildren);
    };

    // Assign positions with proper spacing
    const assignPositions = (nodes: Department[], level: number, startX: number): void => {
      let currentX = startX;

      nodes.forEach((dept) => {
        const subtreeWidth = getSubtreeWidth(dept);
        const x = currentX + (subtreeWidth - nodeWidth) / 2;
        const y = 40 + level * verticalSpacing;
        positions.set(dept.id, { id: dept.id, x, y });

        const children = depts.filter(d => d.parentDepartmentId === dept.id);
        if (children.length > 0) {
          assignPositions(children, level + 1, currentX);
        }

        currentX += subtreeWidth + (horizontalSpacing - nodeWidth);
      });
    };

    // Calculate total width of all root subtrees
    const totalWidth = rootDepts.reduce((sum, dept) => sum + getSubtreeWidth(dept), 0)
      + (rootDepts.length - 1) * (horizontalSpacing - nodeWidth);
    const startX = Math.max(40, 500 - totalWidth / 2);
    assignPositions(rootDepts, 0, startX);

    this.nodePositions.set(positions);
  }

  // Get node position
  getNodePosition(deptId: string): NodePosition {
    return this.nodePositions().get(deptId) || { id: deptId, x: 400, y: 40 };
  }

  onCompanyChange(companyId: string): void {
    this.selectedCompanyId.set(companyId);
    setTimeout(() => this.initializeNodePositions(), 100);
  }

  // View mode toggle
  setViewMode(mode: ViewMode): void {
    this.viewMode.set(mode);
  }

  // Edit mode toggle
  toggleEditMode(): void {
    this.isEditMode.update(v => !v);
    if (!this.isEditMode()) {
      this.selectedNodes.set(new Set());
    }
  }

  // Toggle collaboration lines
  toggleCollaborations(): void {
    this.showCollaborations.update(v => !v);
  }

  // Toggle grid snap
  toggleGridSnap(): void {
    this.gridSnapEnabled.update(v => !v);
  }

  // Canvas controls
  zoomIn(): void {
    this.canvasScale.update(s => Math.min(s + 0.1, 2));
  }

  zoomOut(): void {
    this.canvasScale.update(s => Math.max(s - 0.1, 0.5));
  }

  resetZoom(): void {
    this.canvasScale.set(1);
    this.canvasPanX.set(0);
    this.canvasPanY.set(0);
  }

  // Canvas panning - works in both view and edit mode
  onCanvasMouseDown(event: MouseEvent): void {
    if ((event.target as HTMLElement).closest('.dept-node')) {
      return;
    }

    // Allow panning in both modes - start panning on empty area click
    this.isPanning.set(true);
    this.panStartX = event.clientX - this.canvasPanX();
    this.panStartY = event.clientY - this.canvasPanY();

    // In edit mode, also clear selection when clicking empty area
    if (this.isEditMode()) {
      this.selectedNodes.set(new Set());
    }
  }

  onCanvasMouseMove(event: MouseEvent): void {
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
    this.isPanning.set(false);
    this.isDraggingNode.set(false);
    this.draggingNodeId.set(null);
  }

  onCanvasWheel(event: WheelEvent): void {
    event.preventDefault();
    const delta = event.deltaY > 0 ? -0.05 : 0.05;
    this.canvasScale.update(s => Math.max(0.5, Math.min(2, s + delta)));
  }

  // Save current positions to history
  saveToHistory(): void {
    const currentPositions = new Map(this.nodePositions());
    this.positionHistory.update(history => {
      const newHistory = [...history, currentPositions];
      if (newHistory.length > this.maxHistoryLength) {
        newHistory.shift();
      }
      return newHistory;
    });
  }

  // Undo last change
  undo(): void {
    const history = this.positionHistory();
    if (history.length === 0) return;

    const previousPositions = history[history.length - 1];
    this.positionHistory.update(h => h.slice(0, -1));
    this.nodePositions.set(previousPositions);
  }

  // Check if undo is available
  canUndo(): boolean {
    return this.positionHistory().length > 0;
  }

  // Node mouse events
  onNodeMouseDown(event: MouseEvent, deptId: string): void {
    event.stopPropagation();

    if (this.isEditMode()) {
      // Save current state before dragging
      this.saveToHistory();

      if (event.ctrlKey || event.metaKey) {
        this.selectedNodes.update(set => {
          const newSet = new Set(set);
          if (newSet.has(deptId)) {
            newSet.delete(deptId);
          } else {
            newSet.add(deptId);
          }
          return newSet;
        });
      } else if (!this.selectedNodes().has(deptId)) {
        this.selectedNodes.set(new Set([deptId]));
      }

      this.isDraggingNode.set(true);
      this.draggingNodeId.set(deptId);

      const pos = this.getNodePosition(deptId);
      const scale = this.canvasScale();

      this.dragNodeOffsetX = event.clientX - pos.x * scale;
      this.dragNodeOffsetY = event.clientY - pos.y * scale;
    }
  }

  onNodeClick(event: MouseEvent, department: Department): void {
    event.stopPropagation();

    if (!this.isEditMode()) {
      this.selectDepartment(department);
    }
  }

  isNodeSelected(deptId: string): boolean {
    return this.selectedNodes().has(deptId);
  }

  // Alignment functions
  alignNodes(alignType: AlignType): void {
    const selected = Array.from(this.selectedNodes());
    if (selected.length < 2) return;

    const positions = new Map(this.nodePositions());
    const selectedPositions = selected.map(id => positions.get(id)!).filter(p => p);

    if (selectedPositions.length < 2) return;

    const xs = selectedPositions.map(p => p.x);
    const ys = selectedPositions.map(p => p.y);

    switch (alignType) {
      case 'left':
        const minX = Math.min(...xs);
        selected.forEach(id => {
          const pos = positions.get(id);
          if (pos) positions.set(id, { ...pos, x: minX });
        });
        break;

      case 'center-h':
        const avgX = xs.reduce((a, b) => a + b, 0) / xs.length;
        selected.forEach(id => {
          const pos = positions.get(id);
          if (pos) positions.set(id, { ...pos, x: Math.round(avgX / this.gridSize) * this.gridSize });
        });
        break;

      case 'right':
        const maxX = Math.max(...xs);
        selected.forEach(id => {
          const pos = positions.get(id);
          if (pos) positions.set(id, { ...pos, x: maxX });
        });
        break;

      case 'top':
        const minY = Math.min(...ys);
        selected.forEach(id => {
          const pos = positions.get(id);
          if (pos) positions.set(id, { ...pos, y: minY });
        });
        break;

      case 'center-v':
        const avgY = ys.reduce((a, b) => a + b, 0) / ys.length;
        selected.forEach(id => {
          const pos = positions.get(id);
          if (pos) positions.set(id, { ...pos, y: Math.round(avgY / this.gridSize) * this.gridSize });
        });
        break;

      case 'bottom':
        const maxY = Math.max(...ys);
        selected.forEach(id => {
          const pos = positions.get(id);
          if (pos) positions.set(id, { ...pos, y: maxY });
        });
        break;

      case 'distribute-h':
        if (selected.length < 3) return;
        const sortedByX = [...selectedPositions].sort((a, b) => a.x - b.x);
        const totalWidthH = sortedByX[sortedByX.length - 1].x - sortedByX[0].x;
        const spacingH = totalWidthH / (sortedByX.length - 1);
        sortedByX.forEach((pos, index) => {
          const newX = sortedByX[0].x + index * spacingH;
          positions.set(pos.id, { ...pos, x: Math.round(newX / this.gridSize) * this.gridSize });
        });
        break;

      case 'distribute-v':
        if (selected.length < 3) return;
        const sortedByY = [...selectedPositions].sort((a, b) => a.y - b.y);
        const totalHeightV = sortedByY[sortedByY.length - 1].y - sortedByY[0].y;
        const spacingV = totalHeightV / (sortedByY.length - 1);
        sortedByY.forEach((pos, index) => {
          const newY = sortedByY[0].y + index * spacingV;
          positions.set(pos.id, { ...pos, y: Math.round(newY / this.gridSize) * this.gridSize });
        });
        break;
    }

    this.nodePositions.set(positions);
  }

  // Auto arrange
  autoArrange(): void {
    this.initializeNodePositions();
    this.selectedNodes.set(new Set());
  }

  // Select all nodes
  selectAllNodes(): void {
    const allIds = new Set(this.filteredDepartments().map(d => d.id));
    this.selectedNodes.set(allIds);
  }

  // Clear selection
  clearSelection(): void {
    this.selectedNodes.set(new Set());
  }

  // Department actions
  selectDepartment(department: Department, addToHistory = true): void {
    // Save current department to history before navigating
    if (addToHistory) {
      const current = this.selectedDepartment();
      if (current) {
        this.departmentViewHistory.update(history => [...history, current]);
      }
    }
    this.selectedDepartment.set(department);
    this.showDepartmentModal.set(true);
  }

  // Go back to previous department in modal
  goBackDepartment(): void {
    const history = this.departmentViewHistory();
    if (history.length === 0) return;

    const previousDepartment = history[history.length - 1];
    this.departmentViewHistory.update(h => h.slice(0, -1));
    this.selectDepartment(previousDepartment, false);
  }

  // Check if can go back
  canGoBackDepartment(): boolean {
    return this.departmentViewHistory().length > 0;
  }

  closeDepartmentModal(): void {
    this.showDepartmentModal.set(false);
    this.selectedDepartment.set(null);
    this.departmentViewHistory.set([]); // Clear history on close
  }

  // Get department color
  getDepartmentColor(department: Department): string {
    return department.color || '#D6A28C';
  }

  // Get collaboration line color
  getCollaborationColor(type: string): string {
    const colors: Record<string, string> = {
      upstream: '#4682B4',
      downstream: '#6B8E23',
      parallel: '#CD853F',
      support: '#9370DB'
    };
    return colors[type] || '#94A3B8';
  }

  // Get collaboration type label
  getCollaborationLabel(type: string): string {
    const labels: Record<string, string> = {
      upstream: '上游',
      downstream: '下游',
      parallel: '平行',
      support: '支援'
    };
    return labels[type] || type;
  }

  // Get frequency label
  getFrequencyLabel(freq: string): string {
    const labels: Record<string, string> = {
      daily: '每日',
      weekly: '每週',
      monthly: '每月',
      as_needed: '按需'
    };
    return labels[freq] || freq;
  }

  // Get company name
  getCompanyName(companyId: string): string {
    return this.companies().find(c => c.id === companyId)?.name || '';
  }

  // Get department by ID
  getDepartmentById(id: string): Department | undefined {
    return this.departments().find(d => d.id === id);
  }

  // Get child departments
  getChildDepartments(parentId: string): Department[] {
    return this.filteredDepartments().filter(d => d.parentDepartmentId === parentId);
  }

  // Get department collaborations
  getDepartmentCollaborations(deptId: string): DepartmentCollaboration[] {
    return this.collaborations().filter(
      c => c.sourceDepartmentId === deptId || c.targetDepartmentId === deptId
    );
  }

  // Get connection line between parent and child
  // Note: nodePos.x = card center X, nodePos.y = card top Y
  getConnectionPath(parentId: string, childId: string): string {
    const parentPos = this.getNodePosition(parentId);
    const childPos = this.getNodePosition(childId);

    // Calculate parent card boundaries
    const parentTop = parentPos.y;
    const parentBottom = parentPos.y + this.nodeHeight;
    const parentLeft = parentPos.x - this.nodeWidth / 2;
    const parentRight = parentPos.x + this.nodeWidth / 2;
    const parentCenterY = parentPos.y + this.nodeHeight / 2;

    // Calculate child card boundaries
    const childTop = childPos.y;
    const childBottom = childPos.y + this.nodeHeight;
    const childLeft = childPos.x - this.nodeWidth / 2;
    const childRight = childPos.x + this.nodeWidth / 2;
    const childCenterY = childPos.y + this.nodeHeight / 2;

    let startX: number, startY: number, endX: number, endY: number;

    // Determine connection type based on relative positions
    // Case 1: Child is mostly above parent (child bottom is above parent center)
    const isChildAbove = childBottom < parentCenterY;
    // Case 2: Child is mostly below parent (child top is below parent center)
    const isChildBelow = childTop > parentCenterY;

    if (isChildAbove) {
      // Child is above parent - connect from parent top to child bottom
      startX = parentPos.x;
      startY = parentTop;
      endX = childPos.x;
      endY = childBottom;

      const midY = startY + (endY - startY) / 2;
      return `M ${startX} ${startY} C ${startX} ${midY}, ${endX} ${midY}, ${endX} ${endY}`;
    } else if (isChildBelow) {
      // Child is below parent - connect from parent bottom to child top
      startX = parentPos.x;
      startY = parentBottom;
      endX = childPos.x;
      endY = childTop;

      const midY = startY + (endY - startY) / 2;
      return `M ${startX} ${startY} C ${startX} ${midY}, ${endX} ${midY}, ${endX} ${endY}`;
    } else {
      // Significant vertical overlap - connect from sides
      if (childPos.x > parentPos.x) {
        // Child is to the right
        startX = parentRight;
        startY = parentCenterY;
        endX = childLeft;
        endY = childCenterY;
      } else {
        // Child is to the left
        startX = parentLeft;
        startY = parentCenterY;
        endX = childRight;
        endY = childCenterY;
      }

      const midX = startX + (endX - startX) / 2;
      return `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`;
    }
  }

  // Get all departments flat for rendering
  getAllDepartmentsFlat(): Department[] {
    return this.filteredDepartments();
  }

  // Get parent department
  getParentDepartment(dept: Department): Department | undefined {
    if (!dept.parentDepartmentId) return undefined;
    return this.filteredDepartments().find(d => d.id === dept.parentDepartmentId);
  }

  // ============================================================
  // Department CRUD Methods
  // ============================================================

  // Open create department form
  openCreateDepartmentForm(): void {
    const companyId = this.selectedCompanyId() || this.companies()[0]?.id || '';
    const company = this.companies().find(c => c.id === companyId);

    this.departmentForm.set({
      companyId,
      name: '',
      code: '',
      parentDepartmentId: undefined,
      managerId: undefined,
      managerName: undefined,
      level: 1,
      employeeCount: 0,
      responsibilities: [],
      color: '#D6A28C',
      icon: 'ri-folder-line'
    });
    this.isEditingDepartment.set(false);
    this.showDepartmentForm.set(true);
  }

  // Open edit department form
  openEditDepartmentForm(department: Department): void {
    this.departmentForm.set({ ...department });
    this.isEditingDepartment.set(true);
    this.showDepartmentForm.set(true);
    this.closeDepartmentModal();
  }

  // Close department form
  closeDepartmentForm(): void {
    this.showDepartmentForm.set(false);
    this.departmentForm.set({});
  }

  // Save department (create or update)
  saveDepartment(): void {
    const formData = this.departmentForm();
    if (!formData.name || !formData.code) {
      alert('請填寫部門名稱和代碼');
      return;
    }

    // Determine level based on parent
    if (formData.parentDepartmentId) {
      const parent = this.departments().find(d => d.id === formData.parentDepartmentId);
      if (parent) {
        formData.level = ((parent.level || 1) + 1) as 1 | 2 | 3 | 4 | 5;
      }
    } else {
      formData.level = 1;
    }

    if (this.isEditingDepartment()) {
      // Update existing department
      this.orgService.updateDepartment(formData.id!, formData).subscribe(result => {
        if (result) {
          this.loadData();
          this.closeDepartmentForm();
        }
      });
    } else {
      // Create new department
      this.orgService.createDepartment(formData as Omit<Department, 'id'>).subscribe(result => {
        this.loadData();
        this.closeDepartmentForm();
      });
    }
  }

  // Confirm delete department
  confirmDeleteDepartment(department: Department): void {
    this.departmentToDelete.set(department);
    this.showDeleteConfirm.set(true);
    this.closeDepartmentModal();
  }

  // Cancel delete
  cancelDelete(): void {
    this.showDeleteConfirm.set(false);
    this.departmentToDelete.set(null);
  }

  // Execute delete
  executeDeleteDepartment(): void {
    const department = this.departmentToDelete();
    if (!department) return;

    this.orgService.deleteDepartment(department.id).subscribe(result => {
      if (result.success) {
        this.loadData();
      } else {
        alert(result.message);
      }
      this.cancelDelete();
    });
  }

  // Update form field
  updateDeptFormField(field: keyof Department, value: string | number | string[] | undefined): void {
    this.departmentForm.update(form => ({
      ...form,
      [field]: value
    }));
  }
}
