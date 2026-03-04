/**
 * 職務說明書專屬 Model
 * 用於狀態流程與版本控制
 */

export type JDStatus = 'draft' | 'pending_review' | 'rejected' | 'published' | 'archived';

export interface JDApprovalRecord {
    id: string;
    version: string;
    action: 'submit' | 'approve' | 'reject' | 'archive' | 'create_new_version';
    actorId: string;
    actorName: string;
    actorRole: 'hr' | 'manager' | 'admin' | 'system';
    comment?: string;
    createdAt: string;
}

export interface JDVersion {
    id: string;
    version: string;
    status: JDStatus;
    effectiveFrom?: string;
    effectiveUntil?: string;
    createdBy: string;
    createdAt: string;
    publishedAt?: string;
    archivedAt?: string;
}

export interface JDStatusConfig {
    label: string;
    color: string;
    bgColor: string;
    icon: string;
}

export const JD_STATUS_CONFIG: Record<JDStatus, JDStatusConfig> = {
    draft: {
        label: '草稿',
        color: '#757575',
        bgColor: 'rgba(158, 158, 158, 0.15)',
        icon: 'ri-draft-line'
    },
    pending_review: {
        label: '審核中',
        color: '#F57C00',
        bgColor: 'rgba(255, 152, 0, 0.15)',
        icon: 'ri-time-line'
    },
    rejected: {
        label: '已退回',
        color: '#D32F2F',
        bgColor: 'rgba(244, 67, 54, 0.15)',
        icon: 'ri-close-circle-line'
    },
    published: {
        label: '已發佈',
        color: '#388E3C',
        bgColor: 'rgba(76, 175, 80, 0.15)',
        icon: 'ri-checkbox-circle-line'
    },
    archived: {
        label: '已封存',
        color: '#616161',
        bgColor: 'rgba(97, 97, 97, 0.15)',
        icon: 'ri-archive-line'
    }
};

export const JD_ACTION_LABELS: Record<string, string> = {
    submit: '送出審核',
    approve: '審核通過',
    reject: '退回',
    archive: '封存',
    create_new_version: '建立新版本'
};
