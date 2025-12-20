import { Component, ChangeDetectionStrategy, inject, signal, OnInit, computed, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../../../../shared/components/header/header.component';
import { CompetencyService } from '../../services/competency.service';
import {
  GradeLevel,
  GradeMatrix,
  CareerPath,
  GradeType,
  GRADE_TYPE_OPTIONS
} from '../../models/competency.model';
import * as echarts from 'echarts';

// Employee interface for AI assistant
interface Employee {
  id: string;
  name: string;
  department: string;
  position: string;
  currentGrade: string;
  hireDate: Date;
}

// AI Analysis Result interface
interface AICareerAnalysis {
  employee: Employee;
  currentStatus: {
    grade: string;
    gradeName: string;
    yearsInGrade: number;
    overallScore: number;
    competencyScores: { name: string; score: number; required: number }[];
  };
  pathRecommendations: {
    vertical: PathRecommendation;
    horizontal: PathRecommendation;
    crossDepartment: PathRecommendation;
  };
  trainingPlan: {
    courses: { name: string; type: string; duration: string; priority: 'high' | 'medium' | 'low' }[];
    estimatedCompletion: string;
  };
  progressTracking: {
    milestones: { title: string; status: 'completed' | 'in_progress' | 'pending'; date: string }[];
    promotionReadiness: number;
    nextReviewDate: string;
  };
  simulation: CareerSimulation[];
}

interface PathRecommendation {
  targetPosition: string;
  targetGrade: string;
  estimatedTime: string;
  requiredCompetencies: { name: string; currentLevel: number; requiredLevel: number; gap: number }[];
  feasibility: number;
  recommendation: string;
}

interface CareerSimulation {
  path: string;
  pathType: 'vertical' | 'horizontal' | 'cross-department';
  steps: { year: number; position: string; grade: string; salary: string }[];
  totalTime: string;
  finalSalary: string;
  riskLevel: 'low' | 'medium' | 'high';
}

@Component({
  selector: 'app-grade-matrix-page',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent],
  templateUrl: './grade-matrix-page.component.html',
  styleUrl: './grade-matrix-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GradeMatrixPageComponent implements OnInit, AfterViewInit {
  @ViewChild('radarChart') radarChartRef!: ElementRef;
  private radarChart: echarts.ECharts | null = null;
  private competencyService = inject(CompetencyService);

  // Page Info
  readonly pageTitle = '職等職級管理';
  readonly breadcrumbs = ['首頁', '職能管理'];

  // Data signals
  gradeMatrix = signal<GradeMatrix | null>(null);
  careerPaths = signal<CareerPath[]>([]);
  loading = signal(true);

  // Active tab
  activeTab = signal<'matrix' | 'career' | 'ai-assistant'>('matrix');

  // Selected items
  selectedGrade = signal<GradeLevel | null>(null);
  selectedCareerPath = signal<CareerPath | null>(null);

  // Modal states
  showGradeDetailModal = signal(false);
  showCareerPathModal = signal(false);
  showAIAssistantModal = signal(false);

  // Filter
  selectedType = signal<string>('');
  readonly typeOptions = GRADE_TYPE_OPTIONS;

  // AI Assistant state - Enhanced
  employees = signal<Employee[]>([]);
  selectedEmployeeId = signal<string>('');
  aiActiveSection = signal<'overview' | 'paths' | 'training' | 'progress' | 'simulation'>('overview');
  aiAnalyzing = signal(false);
  aiAnalysisResult = signal<AICareerAnalysis | null>(null);

  // Computed
  filteredGrades = computed(() => {
    const matrix = this.gradeMatrix();
    if (!matrix) return [];

    let grades = matrix.rows;
    if (this.selectedType()) {
      grades = grades.filter(g => g.type === this.selectedType());
    }
    return grades;
  });

  selectedEmployee = computed(() => {
    const id = this.selectedEmployeeId();
    return this.employees().find(e => e.id === id) || null;
  });

  ngOnInit(): void {
    this.loadData();
    this.loadEmployees();
  }

  ngAfterViewInit(): void {
    // Radar chart will be initialized when AI analysis is complete
  }

  loadData(): void {
    this.loading.set(true);

    this.competencyService.getGradeMatrix().subscribe(data => {
      this.gradeMatrix.set(data);
    });

    this.competencyService.getCareerPaths().subscribe(data => {
      this.careerPaths.set(data);
      this.loading.set(false);
    });
  }

  loadEmployees(): void {
    // Mock employee data
    this.employees.set([
      { id: 'emp-001', name: '王小明', department: '研發部', position: '資深工程師', currentGrade: 'P3', hireDate: new Date('2020-03-15') },
      { id: 'emp-002', name: '李小華', department: '研發部', position: '工程師', currentGrade: 'P2', hireDate: new Date('2022-06-01') },
      { id: 'emp-003', name: '陳大文', department: '業務部', position: '業務專員', currentGrade: 'P2', hireDate: new Date('2021-09-10') },
      { id: 'emp-004', name: '林美玲', department: '行銷部', position: '行銷企劃', currentGrade: 'P2', hireDate: new Date('2022-01-05') },
      { id: 'emp-005', name: '張志偉', department: '研發部', position: '副理', currentGrade: 'M1', hireDate: new Date('2018-07-20') }
    ]);
  }

  setActiveTab(tab: 'matrix' | 'career' | 'ai-assistant'): void {
    this.activeTab.set(tab);
  }

  onTypeChange(value: string): void {
    this.selectedType.set(value);
  }

  // Grade Detail Modal
  openGradeDetail(grade: GradeLevel): void {
    this.selectedGrade.set(grade);
    this.showGradeDetailModal.set(true);
  }

  closeGradeDetailModal(): void {
    this.showGradeDetailModal.set(false);
    this.selectedGrade.set(null);
  }

  // Career Path Modal
  openCareerPathDetail(path: CareerPath): void {
    this.selectedCareerPath.set(path);
    this.showCareerPathModal.set(true);
  }

  closeCareerPathModal(): void {
    this.showCareerPathModal.set(false);
    this.selectedCareerPath.set(null);
  }

  // AI Assistant Methods
  onEmployeeChange(employeeId: string): void {
    this.selectedEmployeeId.set(employeeId);
    this.aiAnalysisResult.set(null);
    this.aiActiveSection.set('overview');
  }

  setAISection(section: 'overview' | 'paths' | 'training' | 'progress' | 'simulation'): void {
    this.aiActiveSection.set(section);

    // Initialize radar chart when viewing overview with analysis result
    if (section === 'overview' && this.aiAnalysisResult()) {
      setTimeout(() => this.initRadarChart(), 100);
    }
  }

  runAIAnalysis(): void {
    const employee = this.selectedEmployee();
    if (!employee) return;

    this.aiAnalyzing.set(true);

    // Simulate AI analysis
    setTimeout(() => {
      const analysis: AICareerAnalysis = this.generateMockAnalysis(employee);
      this.aiAnalysisResult.set(analysis);
      this.aiAnalyzing.set(false);

      // Initialize radar chart after analysis
      setTimeout(() => this.initRadarChart(), 100);
    }, 2000);
  }

  private generateMockAnalysis(employee: Employee): AICareerAnalysis {
    const yearsInCompany = new Date().getFullYear() - employee.hireDate.getFullYear();

    return {
      employee,
      currentStatus: {
        grade: employee.currentGrade,
        gradeName: this.getGradeName(employee.currentGrade),
        yearsInGrade: Math.min(yearsInCompany, 2),
        overallScore: 78,
        competencyScores: [
          { name: '程式設計', score: 4.2, required: 4 },
          { name: '系統分析', score: 3.8, required: 4 },
          { name: '專案管理', score: 3.0, required: 3.5 },
          { name: '溝通表達', score: 4.0, required: 4 },
          { name: '團隊合作', score: 4.5, required: 4 },
          { name: '問題解決', score: 3.5, required: 4 }
        ]
      },
      pathRecommendations: {
        vertical: {
          targetPosition: '主任工程師',
          targetGrade: 'P4',
          estimatedTime: '2-3 年',
          requiredCompetencies: [
            { name: '系統架構設計', currentLevel: 3, requiredLevel: 5, gap: 2 },
            { name: '技術決策', currentLevel: 3, requiredLevel: 4, gap: 1 },
            { name: '團隊指導', currentLevel: 2, requiredLevel: 4, gap: 2 }
          ],
          feasibility: 75,
          recommendation: '建議優先加強系統架構設計能力，參加進階技術培訓課程'
        },
        horizontal: {
          targetPosition: '技術專家',
          targetGrade: 'S1',
          estimatedTime: '3-4 年',
          requiredCompetencies: [
            { name: '領域專精', currentLevel: 3, requiredLevel: 5, gap: 2 },
            { name: '技術創新', currentLevel: 3, requiredLevel: 5, gap: 2 },
            { name: '知識傳承', currentLevel: 2, requiredLevel: 4, gap: 2 }
          ],
          feasibility: 60,
          recommendation: '需要深耕特定技術領域，建議取得專業認證並發表技術文章'
        },
        crossDepartment: {
          targetPosition: '產品經理',
          targetGrade: 'P3',
          estimatedTime: '1.5-2 年',
          requiredCompetencies: [
            { name: '產品規劃', currentLevel: 2, requiredLevel: 4, gap: 2 },
            { name: '市場分析', currentLevel: 1, requiredLevel: 3, gap: 2 },
            { name: '跨部門協調', currentLevel: 3, requiredLevel: 4, gap: 1 }
          ],
          feasibility: 55,
          recommendation: '技術背景是優勢，需補強產品管理與市場分析能力'
        }
      },
      trainingPlan: {
        courses: [
          { name: '進階系統架構設計', type: '專業技能', duration: '24小時', priority: 'high' },
          { name: 'PMP 專案管理認證', type: '管理能力', duration: '40小時', priority: 'high' },
          { name: '技術團隊領導力', type: '領導能力', duration: '16小時', priority: 'medium' },
          { name: '簡報技巧工作坊', type: '溝通技巧', duration: '8小時', priority: 'medium' },
          { name: '敏捷開發實戰', type: '專業技能', duration: '16小時', priority: 'low' }
        ],
        estimatedCompletion: '約 8-10 個月'
      },
      progressTracking: {
        milestones: [
          { title: '完成年度職能評估', status: 'completed', date: '2024-03' },
          { title: '取得進階技術認證', status: 'in_progress', date: '2024-06' },
          { title: '主導專案開發', status: 'in_progress', date: '2024-09' },
          { title: '完成管理培訓', status: 'pending', date: '2025-01' },
          { title: '晉升評審', status: 'pending', date: '2025-06' }
        ],
        promotionReadiness: 65,
        nextReviewDate: '2025-06-30'
      },
      simulation: [
        {
          path: '技術職垂直晉升',
          pathType: 'vertical',
          steps: [
            { year: 0, position: '資深工程師', grade: 'P3', salary: 'NT$ 70,000' },
            { year: 2, position: '主任工程師', grade: 'P4', salary: 'NT$ 90,000' },
            { year: 5, position: '首席工程師', grade: 'P5', salary: 'NT$ 120,000' }
          ],
          totalTime: '5 年',
          finalSalary: 'NT$ 120,000',
          riskLevel: 'low'
        },
        {
          path: '轉型管理職',
          pathType: 'vertical',
          steps: [
            { year: 0, position: '資深工程師', grade: 'P3', salary: 'NT$ 70,000' },
            { year: 1, position: '副理', grade: 'M1', salary: 'NT$ 80,000' },
            { year: 3, position: '經理', grade: 'M2', salary: 'NT$ 100,000' },
            { year: 6, position: '協理', grade: 'M3', salary: 'NT$ 130,000' }
          ],
          totalTime: '6 年',
          finalSalary: 'NT$ 130,000',
          riskLevel: 'medium'
        },
        {
          path: '成為技術專家',
          pathType: 'horizontal',
          steps: [
            { year: 0, position: '資深工程師', grade: 'P3', salary: 'NT$ 70,000' },
            { year: 3, position: '技術專家', grade: 'S1', salary: 'NT$ 110,000' },
            { year: 6, position: '首席技術專家', grade: 'S2', salary: 'NT$ 140,000' }
          ],
          totalTime: '6 年',
          finalSalary: 'NT$ 140,000',
          riskLevel: 'medium'
        }
      ]
    };
  }

  private getGradeName(grade: string): string {
    const gradeNames: Record<string, string> = {
      'P1': '初級工程師',
      'P2': '工程師',
      'P3': '資深工程師',
      'P4': '主任工程師',
      'M1': '副理',
      'M2': '經理',
      'M3': '協理',
      'S1': '技術專家'
    };
    return gradeNames[grade] || grade;
  }

  private initRadarChart(): void {
    const result = this.aiAnalysisResult();
    if (!result || !this.radarChartRef?.nativeElement) return;

    if (this.radarChart) {
      this.radarChart.dispose();
    }

    this.radarChart = echarts.init(this.radarChartRef.nativeElement);

    const indicators = result.currentStatus.competencyScores.map(c => ({
      name: c.name,
      max: 5
    }));

    const option: echarts.EChartsOption = {
      tooltip: {
        trigger: 'item'
      },
      legend: {
        data: ['目前能力', '職位要求'],
        bottom: 0
      },
      radar: {
        indicator: indicators,
        shape: 'polygon',
        splitNumber: 5,
        axisName: {
          color: '#666'
        },
        splitLine: {
          lineStyle: {
            color: '#ddd'
          }
        },
        splitArea: {
          show: true,
          areaStyle: {
            color: ['rgba(200, 200, 200, 0.1)', 'rgba(200, 200, 200, 0.2)']
          }
        }
      },
      series: [
        {
          type: 'radar',
          data: [
            {
              value: result.currentStatus.competencyScores.map(c => c.score),
              name: '目前能力',
              areaStyle: {
                color: 'rgba(193, 131, 104, 0.3)'
              },
              lineStyle: {
                color: '#C18368'
              },
              itemStyle: {
                color: '#C18368'
              }
            },
            {
              value: result.currentStatus.competencyScores.map(c => c.required),
              name: '職位要求',
              areaStyle: {
                color: 'rgba(139, 157, 130, 0.3)'
              },
              lineStyle: {
                color: '#8B9D82'
              },
              itemStyle: {
                color: '#8B9D82'
              }
            }
          ]
        }
      ]
    };

    this.radarChart.setOption(option);
  }

  getScoreClass(score: number, required: number): string {
    const diff = score - required;
    if (diff >= 0) return 'score-good';
    if (diff >= -0.5) return 'score-warning';
    return 'score-danger';
  }

  getFeasibilityClass(value: number): string {
    if (value >= 70) return 'feasibility-high';
    if (value >= 50) return 'feasibility-medium';
    return 'feasibility-low';
  }

  getPriorityClass(priority: string): string {
    return `priority-${priority}`;
  }

  getRiskClass(risk: string): string {
    return `risk-${risk}`;
  }

  getMilestoneStatusClass(status: string): string {
    return `milestone-${status}`;
  }

  getMilestoneIcon(status: string): string {
    const icons: Record<string, string> = {
      'completed': 'ri-checkbox-circle-fill',
      'in_progress': 'ri-loader-4-line',
      'pending': 'ri-checkbox-blank-circle-line'
    };
    return icons[status] || 'ri-checkbox-blank-circle-line';
  }

  // Helper methods
  getTypeLabel(type: GradeType): string {
    const map: Record<GradeType, string> = {
      professional: '專業職',
      management: '管理職',
      specialist: '專家職'
    };
    return map[type];
  }

  getTypeClass(type: GradeType): string {
    return `type-${type}`;
  }

  getTypeIcon(type: GradeType): string {
    const map: Record<GradeType, string> = {
      professional: 'ri-code-box-line',
      management: 'ri-team-line',
      specialist: 'ri-award-line'
    };
    return map[type];
  }

  getCareerPathTypeLabel(type: string): string {
    const map: Record<string, string> = {
      vertical: '垂直晉升',
      horizontal: '橫向發展',
      'cross-department': '跨部門發展'
    };
    return map[type] || type;
  }

  getCareerPathTypeIcon(type: string): string {
    const map: Record<string, string> = {
      vertical: 'ri-arrow-up-line',
      horizontal: 'ri-arrow-left-right-line',
      'cross-department': 'ri-swap-box-line'
    };
    return map[type] || 'ri-route-line';
  }

  getCareerPathTypeClass(type: string): string {
    return `path-${type}`;
  }

  getStepStatusClass(status: string): string {
    return `step-${status}`;
  }

  getStepStatusIcon(status: string): string {
    const map: Record<string, string> = {
      completed: 'ri-checkbox-circle-fill',
      current: 'ri-focus-3-line',
      pending: 'ri-checkbox-blank-circle-line'
    };
    return map[status] || 'ri-checkbox-blank-circle-line';
  }

  formatSalary(amount: number): string {
    return new Intl.NumberFormat('zh-TW').format(amount);
  }

  getGradesByType(type: GradeType): GradeLevel[] {
    return this.filteredGrades().filter(g => g.type === type);
  }
}

