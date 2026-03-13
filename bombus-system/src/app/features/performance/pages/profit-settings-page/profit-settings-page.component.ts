import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  OnInit,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../../../../shared/components/header/header.component';
import { OrgUnitService } from '../../../../core/services/org-unit.service';

// ============================================
// 資料模型
// ============================================
interface EmployeeSalary {
  id: string;
  name: string;
  department: string;
  position: string;
  grade: string;
  baseSalary: number;
  lastUpdated: Date;
}

interface DepartmentParam {
  id: string;
  name: string;
  costCenterCode: string;
  indirectCostRatio: number;
  profitTarget: number;
  bonusWeight: number;
}

interface PositionParam {
  id: string;
  title: string;
  salaryMin: number;
  salaryMax: number;
  performanceCoefficient: number;
  bonusRatio: number;
  isManager: boolean;
}

interface CostCategory {
  id: string;
  type: 'direct' | 'indirect';
  name: string;
  description: string;
  allocationRule: string;
}

interface FormulaConfig {
  hourlyRateFormula: string;
  hourlyRateDivisor: number;
  hourlyRateCoefficient: number;
  overtimeMultiplier: number;
  benefitRatio: number;
  calculationPeriod: 'month' | 'quarter' | 'year';
}

type SettingsTab = 'salary' | 'department' | 'position' | 'cost' | 'formula';

@Component({
  standalone: true,
  selector: 'app-profit-settings-page',
  templateUrl: './profit-settings-page.component.html',
  styleUrl: './profit-settings-page.component.scss',
  imports: [CommonModule, FormsModule, HeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfitSettingsPageComponent implements OnInit {
  private cdr = inject(ChangeDetectorRef);
  private orgUnitService = inject(OrgUnitService);

  // 子公司→部門級聯篩選
  selectedSubsidiaryId = signal<string>('');
  subsidiaries = this.orgUnitService.subsidiaries;
  filteredDepartments = computed(() => this.orgUnitService.filterDepartments(this.selectedSubsidiaryId()));

  // Tabs
  activeTab = signal<SettingsTab>('salary');

  // Data
  loading = signal(false);
  employeeSalaries = signal<EmployeeSalary[]>([]);
  departmentParams = signal<DepartmentParam[]>([]);
  positionParams = signal<PositionParam[]>([]);
  costCategories = signal<CostCategory[]>([]);
  formulaConfig = signal<FormulaConfig>({
    hourlyRateFormula: '月薪 ÷ 工作時數 × 係數',
    hourlyRateDivisor: 176,
    hourlyRateCoefficient: 1.0,
    overtimeMultiplier: 1.5,
    benefitRatio: 25,
    calculationPeriod: 'month'
  });

  // Edit state
  editingId = signal<string | null>(null);
  showImportModal = signal(false);

  // Search & Filter
  searchKeyword = signal('');
  selectedDepartment = signal<string>('all');

  readonly tabs: { id: SettingsTab; label: string; icon: string }[] = [
    { id: 'salary', label: '基本薪資設定', icon: 'ri-money-dollar-circle-line' },
    { id: 'department', label: '部門參數設定', icon: 'ri-building-line' },
    { id: 'position', label: '職稱參數設定', icon: 'ri-user-star-line' },
    { id: 'cost', label: '成本分類設定', icon: 'ri-pie-chart-line' },
    { id: 'formula', label: '計算公式設定', icon: 'ri-calculator-line' }
  ];

  ngOnInit(): void {
    this.orgUnitService.loadOrgUnits().subscribe();
    this.loadMockData();
  }

  private loadMockData(): void {
    // Mock Employee Salaries
    this.employeeSalaries.set([
      { id: 'E001', name: '張志豪', department: '工程部', position: '資深工程師', grade: 'L4', baseSalary: 85000, lastUpdated: new Date('2025-01-01') },
      { id: 'E002', name: '林淑芬', department: '工程部', position: '工程師', grade: 'L3', baseSalary: 62000, lastUpdated: new Date('2025-01-01') },
      { id: 'E003', name: '王建民', department: '工程部', position: '技術經理', grade: 'L5', baseSalary: 120000, lastUpdated: new Date('2025-01-01') },
      { id: 'E004', name: '陳美玲', department: '專案部', position: '專案經理', grade: 'L5', baseSalary: 105000, lastUpdated: new Date('2024-10-01') },
      { id: 'E005', name: '李宗翰', department: '專案部', position: '專案專員', grade: 'L2', baseSalary: 48000, lastUpdated: new Date('2025-01-01') },
      { id: 'E006', name: '黃雅琪', department: '業務部', position: '業務經理', grade: 'L5', baseSalary: 95000, lastUpdated: new Date('2024-07-01') },
      { id: 'E007', name: '吳承恩', department: '業務部', position: '資深業務', grade: 'L4', baseSalary: 72000, lastUpdated: new Date('2025-01-01') },
      { id: 'E008', name: '周杰倫', department: '財會部', position: '財務經理', grade: 'L5', baseSalary: 98000, lastUpdated: new Date('2024-04-01') }
    ]);

    // Mock Department Params
    this.departmentParams.set([
      { id: 'D001', name: '工程部', costCenterCode: 'ENG-001', indirectCostRatio: 15, profitTarget: 30, bonusWeight: 35 },
      { id: 'D002', name: '專案部', costCenterCode: 'PM-001', indirectCostRatio: 12, profitTarget: 28, bonusWeight: 25 },
      { id: 'D003', name: '業務部', costCenterCode: 'SALES-001', indirectCostRatio: 10, profitTarget: 35, bonusWeight: 30 },
      { id: 'D004', name: '財會部', costCenterCode: 'FIN-001', indirectCostRatio: 8, profitTarget: 25, bonusWeight: 10 }
    ]);

    // Mock Position Params
    this.positionParams.set([
      { id: 'P001', title: '技術經理', salaryMin: 100000, salaryMax: 150000, performanceCoefficient: 1.3, bonusRatio: 15, isManager: true },
      { id: 'P002', title: '資深工程師', salaryMin: 75000, salaryMax: 100000, performanceCoefficient: 1.2, bonusRatio: 12, isManager: false },
      { id: 'P003', title: '工程師', salaryMin: 50000, salaryMax: 75000, performanceCoefficient: 1.0, bonusRatio: 10, isManager: false },
      { id: 'P004', title: '專案經理', salaryMin: 90000, salaryMax: 130000, performanceCoefficient: 1.25, bonusRatio: 15, isManager: true },
      { id: 'P005', title: '專案專員', salaryMin: 40000, salaryMax: 55000, performanceCoefficient: 1.0, bonusRatio: 8, isManager: false },
      { id: 'P006', title: '業務經理', salaryMin: 85000, salaryMax: 120000, performanceCoefficient: 1.3, bonusRatio: 18, isManager: true },
      { id: 'P007', title: '資深業務', salaryMin: 60000, salaryMax: 85000, performanceCoefficient: 1.15, bonusRatio: 15, isManager: false },
      { id: 'P008', title: '財務經理', salaryMin: 85000, salaryMax: 120000, performanceCoefficient: 1.2, bonusRatio: 12, isManager: true }
    ]);

    // Mock Cost Categories
    this.costCategories.set([
      { id: 'C001', type: 'direct', name: '人力成本', description: '員工薪資、加班費、獎金', allocationRule: '依實際工時分攤' },
      { id: 'C002', type: 'direct', name: '材料成本', description: '專案所需材料與設備', allocationRule: '依專案歸屬' },
      { id: 'C003', type: 'direct', name: '外包費用', description: '外包廠商費用', allocationRule: '依合約專案歸屬' },
      { id: 'C004', type: 'indirect', name: '租金', description: '辦公室租賃費用', allocationRule: '依部門人數比例分攤' },
      { id: 'C005', type: 'indirect', name: '水電費', description: '水費、電費、網路費', allocationRule: '依部門人數比例分攤' },
      { id: 'C006', type: 'indirect', name: '行政費用', description: '行政支援、總務費用', allocationRule: '依部門營收比例分攤' }
    ]);

    this.cdr.detectChanges();
  }

  switchTab(tab: SettingsTab): void {
    this.activeTab.set(tab);
    this.editingId.set(null);
  }

  // Salary Methods
  get filteredSalaries(): EmployeeSalary[] {
    let result = this.employeeSalaries();
    
    if (this.selectedDepartment() !== 'all') {
      result = result.filter(e => e.department === this.selectedDepartment());
    }
    
    if (this.searchKeyword()) {
      const keyword = this.searchKeyword().toLowerCase();
      result = result.filter(e => 
        e.name.toLowerCase().includes(keyword) ||
        e.position.toLowerCase().includes(keyword)
      );
    }
    
    return result;
  }

  // Edit Methods
  startEdit(id: string): void {
    this.editingId.set(id);
  }

  cancelEdit(): void {
    this.editingId.set(null);
  }

  saveEdit(): void {
    // In real app, save to backend
    this.editingId.set(null);
    this.cdr.detectChanges();
  }

  // Formula Methods
  updateFormula(field: keyof FormulaConfig, value: string | number): void {
    this.formulaConfig.update(config => ({
      ...config,
      [field]: value
    }));
  }

  // Import Modal
  openImportModal(): void {
    this.showImportModal.set(true);
  }

  closeImportModal(): void {
    this.showImportModal.set(false);
  }

  handleImport(): void {
    // In real app, handle file import
    this.showImportModal.set(false);
  }

  // Utility
  formatCurrency(value: number): string {
    return value.toLocaleString();
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('zh-TW');
  }

  getCostTypeLabel(type: 'direct' | 'indirect'): string {
    return type === 'direct' ? '直接成本' : '間接成本';
  }
}

