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
import { Company, OrganizationStats } from '../../models/organization.model';

type ViewMode = 'canvas' | 'list';
type AlignType = 'left' | 'center-h' | 'right' | 'top' | 'center-v' | 'bottom' | 'distribute-h' | 'distribute-v';

interface NodePosition {
  id: string;
  x: number;
  y: number;
}

interface TreeNode {
  company: Company;
  children: TreeNode[];
  expanded: boolean;
}

@Component({
  selector: 'app-group-structure-page',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent],
  templateUrl: './group-structure-page.component.html',
  styleUrl: './group-structure-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GroupStructurePageComponent implements OnInit, AfterViewInit {
  private orgService = inject(OrganizationService);
  private cdr = inject(ChangeDetectorRef);

  @ViewChild('canvasContainer') canvasContainerRef!: ElementRef<HTMLDivElement>;

  // Page Info
  readonly pageTitle = '集團組織圖';
  readonly breadcrumbs = ['首頁', '組織管理'];

  // Data signals
  companies = signal<Company[]>([]);
  stats = signal<OrganizationStats | null>(null);
  loading = signal(true);

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
  readonly nodeWidth = 240;
  readonly nodeHeight = 160; // Actual card height including padding

  // Node dragging
  isDraggingNode = signal(false);
  draggingNodeId = signal<string | null>(null);
  dragNodeStartX = 0;
  dragNodeStartY = 0;
  dragNodeOffsetX = 0;
  dragNodeOffsetY = 0;

  // Multi-selection
  selectedNodes = signal<Set<string>>(new Set());

  // Grid snap
  gridSnapEnabled = signal(true);
  readonly gridSize = 20;

  // Selected company for modal
  selectedCompany = signal<Company | null>(null);
  showCompanyModal = signal(false);
  companyViewHistory = signal<Company[]>([]);

  // Create/Edit company form
  showCompanyForm = signal(false);
  isEditingCompany = signal(false);
  companyForm = signal<Partial<Company>>({});

  // Delete confirmation
  showDeleteConfirm = signal(false);
  companyToDelete = signal<Company | null>(null);

  // Tree structure
  treeData = computed<TreeNode | null>(() => {
    const allCompanies = this.companies();
    const hq = allCompanies.find(c => c.type === 'headquarters');
    if (!hq) return null;

    const buildTree = (parent: Company): TreeNode => {
      const children = allCompanies.filter(c => c.parentCompanyId === parent.id);
      return {
        company: parent,
        children: children.map(c => buildTree(c)),
        expanded: true
      };
    };

    return buildTree(hq);
  });

  // Flat list for list view
  flatList = computed(() => {
    const result: { company: Company; level: number }[] = [];
    const traverse = (node: TreeNode | null, level: number) => {
      if (!node) return;
      result.push({ company: node.company, level });
      node.children.forEach(child => traverse(child, level + 1));
    };
    traverse(this.treeData(), 0);
    return result;
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
      this.initializeNodePositions(data);
      this.loading.set(false);
    });

    this.orgService.getOrganizationStats().subscribe(data => {
      this.stats.set(data);
    });
  }

  // Initialize node positions based on tree structure
  initializeNodePositions(companies: Company[]): void {
    const positions = new Map<string, NodePosition>();
    const hq = companies.find(c => c.type === 'headquarters');
    if (!hq) return;

    // Position headquarters
    positions.set(hq.id, { id: hq.id, x: 400, y: 60 });

    // Position subsidiaries
    const subsidiaries = companies.filter(c => c.parentCompanyId === hq.id);
    const spacing = 280;
    const startX = 400 - ((subsidiaries.length - 1) * spacing) / 2;

    subsidiaries.forEach((sub, index) => {
      positions.set(sub.id, {
        id: sub.id,
        x: startX + index * spacing,
        y: 240
      });
    });

    this.nodePositions.set(positions);
  }

  // Get node position
  getNodePosition(companyId: string): NodePosition {
    return this.nodePositions().get(companyId) || { id: companyId, x: 400, y: 60 };
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

  // Toggle grid snap
  toggleGridSnap(): void {
    this.gridSnapEnabled.update(v => !v);
  }

  // Canvas panning - works in both view and edit mode
  onCanvasMouseDown(event: MouseEvent): void {
    // Don't pan if clicking on a node
    if ((event.target as HTMLElement).closest('.company-node')) {
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

      // Apply grid snap
      if (this.gridSnapEnabled()) {
        newX = Math.round(newX / this.gridSize) * this.gridSize;
        newY = Math.round(newY / this.gridSize) * this.gridSize;
      }

      // Update position for dragging node
      const positions = new Map(this.nodePositions());
      const nodeId = this.draggingNodeId()!;

      // Calculate delta for moving selected nodes together
      const oldPos = positions.get(nodeId);
      if (oldPos) {
        const deltaX = newX - oldPos.x;
        const deltaY = newY - oldPos.y;

        // Move all selected nodes
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
      // Limit history length
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
  onNodeMouseDown(event: MouseEvent, companyId: string): void {
    event.stopPropagation();

    if (this.isEditMode()) {
      // Save current state before dragging
      this.saveToHistory();

      // Handle selection
      if (event.ctrlKey || event.metaKey) {
        // Multi-select with Ctrl/Cmd
        this.selectedNodes.update(set => {
          const newSet = new Set(set);
          if (newSet.has(companyId)) {
            newSet.delete(companyId);
          } else {
            newSet.add(companyId);
          }
          return newSet;
        });
      } else if (!this.selectedNodes().has(companyId)) {
        // Single select
        this.selectedNodes.set(new Set([companyId]));
      }

      // Start dragging
      this.isDraggingNode.set(true);
      this.draggingNodeId.set(companyId);

      const pos = this.getNodePosition(companyId);
      const scale = this.canvasScale();

      this.dragNodeOffsetX = event.clientX - pos.x * scale;
      this.dragNodeOffsetY = event.clientY - pos.y * scale;
    }
  }

  onNodeClick(event: MouseEvent, company: Company): void {
    event.stopPropagation();

    if (!this.isEditMode()) {
      this.selectCompany(company);
    }
  }

  // Check if node is selected
  isNodeSelected(companyId: string): boolean {
    return this.selectedNodes().has(companyId);
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

  // Auto arrange - reset to default tree layout
  autoArrange(): void {
    const companies = this.companies();
    this.initializeNodePositions(companies);
    this.selectedNodes.set(new Set());
  }

  // Select all nodes
  selectAllNodes(): void {
    const allIds = new Set(this.companies().map(c => c.id));
    this.selectedNodes.set(allIds);
  }

  // Clear selection
  clearSelection(): void {
    this.selectedNodes.set(new Set());
  }

  // Company actions
  selectCompany(company: Company, addToHistory = true): void {
    if (addToHistory) {
      const current = this.selectedCompany();
      if (current) {
        this.companyViewHistory.update(history => [...history, current]);
      }
    }
    this.selectedCompany.set(company);
    this.showCompanyModal.set(true);
  }

  goBackCompany(): void {
    const history = this.companyViewHistory();
    if (history.length === 0) return;

    const previousCompany = history[history.length - 1];
    this.companyViewHistory.update(h => h.slice(0, -1));
    this.selectCompany(previousCompany, false);
  }

  canGoBackCompany(): boolean {
    return this.companyViewHistory().length > 0;
  }

  closeCompanyModal(): void {
    this.showCompanyModal.set(false);
    this.selectedCompany.set(null);
    this.companyViewHistory.set([]);
  }

  // Get company type label
  getCompanyTypeLabel(type: string): string {
    return type === 'headquarters' ? '母公司' : '子公司';
  }

  // Get company status class
  getStatusClass(status: string): string {
    return status === 'active' ? 'status--active' : 'status--inactive';
  }

  // Get subsidiaries for a company
  getSubsidiaries(companyId: string): Company[] {
    return this.companies().filter(c => c.parentCompanyId === companyId);
  }

  // Get connection line path between nodes with smart anchor points
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

  // ============================================================
  // Company CRUD Methods
  // ============================================================

  // Open create company form
  openCreateCompanyForm(): void {
    this.companyForm.set({
      name: '',
      code: '',
      type: 'subsidiary',
      parentCompanyId: this.companies().find(c => c.type === 'headquarters')?.id,
      address: '',
      phone: '',
      email: '',
      taxId: '',
      employeeCount: 0,
      departmentCount: 0,
      establishedDate: new Date(),
      status: 'active',
      description: ''
    });
    this.isEditingCompany.set(false);
    this.showCompanyForm.set(true);
  }

  // Open edit company form
  openEditCompanyForm(company: Company): void {
    this.companyForm.set({ ...company });
    this.isEditingCompany.set(true);
    this.showCompanyForm.set(true);
    this.closeCompanyModal();
  }

  // Close company form
  closeCompanyForm(): void {
    this.showCompanyForm.set(false);
    this.companyForm.set({});
  }

  // Save company (create or update)
  saveCompany(): void {
    const formData = this.companyForm();
    if (!formData.name || !formData.code) {
      alert('請填寫公司名稱和代碼');
      return;
    }

    if (this.isEditingCompany()) {
      // Update existing company
      this.orgService.updateCompany(formData.id!, formData).subscribe(result => {
        if (result) {
          this.loadData();
          this.closeCompanyForm();
        }
      });
    } else {
      // Create new company
      this.orgService.createCompany(formData as Omit<Company, 'id'>).subscribe(result => {
        this.loadData();
        this.closeCompanyForm();
      });
    }
  }

  // Confirm delete company
  confirmDeleteCompany(company: Company): void {
    this.companyToDelete.set(company);
    this.showDeleteConfirm.set(true);
    this.closeCompanyModal();
  }

  // Cancel delete
  cancelDelete(): void {
    this.showDeleteConfirm.set(false);
    this.companyToDelete.set(null);
  }

  // Execute delete
  executeDeleteCompany(): void {
    const company = this.companyToDelete();
    if (!company) return;

    this.orgService.deleteCompany(company.id).subscribe(result => {
      if (result.success) {
        this.loadData();
      } else {
        alert(result.message);
      }
      this.cancelDelete();
    });
  }

  // Update form field
  updateFormField(field: keyof Company, value: string | number | Date): void {
    this.companyForm.update(form => ({
      ...form,
      [field]: value
    }));
  }
}
