// =====================================================
// 共用動畫定義
// =====================================================
import { 
  trigger, 
  transition, 
  style, 
  animate, 
  query, 
  stagger,
  state,
  keyframes,
  animateChild,
  group
} from '@angular/animations';

// ---------------------------------------------------------------
// 淡入滑動動畫 (用於頁面載入、列表項目)
// ---------------------------------------------------------------
export const fadeSlideIn = trigger('fadeSlideIn', [
  transition(':enter', [
    style({ opacity: 0, transform: 'translateY(20px)' }),
    animate('400ms cubic-bezier(0.35, 0, 0.25, 1)', 
      style({ opacity: 1, transform: 'translateY(0)' }))
  ]),
  transition(':leave', [
    animate('300ms cubic-bezier(0.35, 0, 0.25, 1)', 
      style({ opacity: 0, transform: 'translateY(-10px)' }))
  ])
]);

// ---------------------------------------------------------------
// 淡入放大動畫 (用於 Modal)
// ---------------------------------------------------------------
export const fadeScaleIn = trigger('fadeScaleIn', [
  transition(':enter', [
    style({ opacity: 0, transform: 'scale(0.9)' }),
    animate('300ms cubic-bezier(0.34, 1.56, 0.64, 1)', 
      style({ opacity: 1, transform: 'scale(1)' }))
  ]),
  transition(':leave', [
    animate('200ms ease-in', 
      style({ opacity: 0, transform: 'scale(0.95)' }))
  ])
]);

// ---------------------------------------------------------------
// 彈性縮放動畫 (用於按鈕、卡片點擊)
// ---------------------------------------------------------------
export const elasticScale = trigger('elasticScale', [
  state('normal', style({ transform: 'scale(1)' })),
  state('pressed', style({ transform: 'scale(0.95)' })),
  state('expanded', style({ transform: 'scale(1.02)' })),
  transition('normal <=> pressed', animate('150ms ease-out')),
  transition('normal <=> expanded', animate('200ms cubic-bezier(0.34, 1.56, 0.64, 1)'))
]);

// ---------------------------------------------------------------
// 列表交錯進場動畫 (用於卡片網格、列表)
// ---------------------------------------------------------------
export const staggerFadeIn = trigger('staggerFadeIn', [
  transition('* => *', [
    query(':enter', [
      style({ opacity: 0, transform: 'translateY(30px)' }),
      stagger('60ms', [
        animate('400ms cubic-bezier(0.35, 0, 0.25, 1)', 
          style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ], { optional: true })
  ])
]);

// ---------------------------------------------------------------
// 手風琴展開/收合動畫
// ---------------------------------------------------------------
export const accordionAnimation = trigger('accordionAnimation', [
  state('collapsed', style({ 
    height: '0px', 
    opacity: 0, 
    overflow: 'hidden' 
  })),
  state('expanded', style({ 
    height: '*', 
    opacity: 1 
  })),
  transition('collapsed <=> expanded', [
    animate('300ms cubic-bezier(0.4, 0, 0.2, 1)')
  ])
]);

// ---------------------------------------------------------------
// 滑入動畫 (用於側邊抽屜、Modal)
// ---------------------------------------------------------------
export const slideInRight = trigger('slideInRight', [
  transition(':enter', [
    style({ transform: 'translateX(100%)', opacity: 0 }),
    animate('300ms cubic-bezier(0.25, 0.8, 0.25, 1)', 
      style({ transform: 'translateX(0)', opacity: 1 }))
  ]),
  transition(':leave', [
    animate('250ms ease-in', 
      style({ transform: 'translateX(100%)', opacity: 0 }))
  ])
]);

export const slideInLeft = trigger('slideInLeft', [
  transition(':enter', [
    style({ transform: 'translateX(-100%)', opacity: 0 }),
    animate('300ms cubic-bezier(0.25, 0.8, 0.25, 1)', 
      style({ transform: 'translateX(0)', opacity: 1 }))
  ]),
  transition(':leave', [
    animate('250ms ease-in', 
      style({ transform: 'translateX(-100%)', opacity: 0 }))
  ])
]);

export const slideInUp = trigger('slideInUp', [
  transition(':enter', [
    style({ transform: 'translateY(100%)', opacity: 0 }),
    animate('300ms cubic-bezier(0.25, 0.8, 0.25, 1)', 
      style({ transform: 'translateY(0)', opacity: 1 }))
  ]),
  transition(':leave', [
    animate('250ms ease-in', 
      style({ transform: 'translateY(100%)', opacity: 0 }))
  ])
]);

// ---------------------------------------------------------------
// 脈動動畫 (用於提示、狀態標籤)
// ---------------------------------------------------------------
export const pulseAnimation = trigger('pulseAnimation', [
  state('pulse', style({ transform: 'scale(1)' })),
  transition('* => pulse', [
    animate('600ms ease-in-out', keyframes([
      style({ transform: 'scale(1)', offset: 0 }),
      style({ transform: 'scale(1.05)', offset: 0.5 }),
      style({ transform: 'scale(1)', offset: 1 })
    ]))
  ])
]);

// ---------------------------------------------------------------
// 搖擺動畫 (用於提示、錯誤)
// ---------------------------------------------------------------
export const shakeAnimation = trigger('shakeAnimation', [
  transition('* => shake', [
    animate('400ms ease-in-out', keyframes([
      style({ transform: 'translateX(0)', offset: 0 }),
      style({ transform: 'translateX(-10px)', offset: 0.2 }),
      style({ transform: 'translateX(10px)', offset: 0.4 }),
      style({ transform: 'translateX(-10px)', offset: 0.6 }),
      style({ transform: 'translateX(10px)', offset: 0.8 }),
      style({ transform: 'translateX(0)', offset: 1 })
    ]))
  ])
]);

// ---------------------------------------------------------------
// 旋轉進場動畫 (用於成功/完成狀態)
// ---------------------------------------------------------------
export const rotateIn = trigger('rotateIn', [
  transition(':enter', [
    style({ opacity: 0, transform: 'rotate(-180deg) scale(0)' }),
    animate('500ms cubic-bezier(0.34, 1.56, 0.64, 1)', 
      style({ opacity: 1, transform: 'rotate(0) scale(1)' }))
  ])
]);

// ---------------------------------------------------------------
// 數字彈跳動畫 (用於分數揭曉)
// ---------------------------------------------------------------
export const numberPop = trigger('numberPop', [
  transition(':increment', [
    animate('300ms ease-out', keyframes([
      style({ transform: 'scale(1)', offset: 0 }),
      style({ transform: 'scale(1.3)', offset: 0.5 }),
      style({ transform: 'scale(1)', offset: 1 })
    ]))
  ])
]);

// ---------------------------------------------------------------
// 背景遮罩淡入動畫
// ---------------------------------------------------------------
export const backdropFade = trigger('backdropFade', [
  transition(':enter', [
    style({ opacity: 0 }),
    animate('200ms ease-out', style({ opacity: 1 }))
  ]),
  transition(':leave', [
    animate('150ms ease-in', style({ opacity: 0 }))
  ])
]);

// ---------------------------------------------------------------
// Tab 切換滑動動畫
// ---------------------------------------------------------------
export const tabSlide = trigger('tabSlide', [
  transition(':increment', [
    style({ transform: 'translateX(-30px)', opacity: 0 }),
    animate('300ms ease-out', style({ transform: 'translateX(0)', opacity: 1 }))
  ]),
  transition(':decrement', [
    style({ transform: 'translateX(30px)', opacity: 0 }),
    animate('300ms ease-out', style({ transform: 'translateX(0)', opacity: 1 }))
  ])
]);

// ---------------------------------------------------------------
// 光暈效果動畫
// ---------------------------------------------------------------
export const glowPulse = trigger('glowPulse', [
  state('active', style({ boxShadow: '0 0 20px rgba(var(--module-color-rgb), 0.4)' })),
  state('inactive', style({ boxShadow: 'none' })),
  transition('inactive => active', animate('300ms ease-out')),
  transition('active => inactive', animate('500ms ease-in'))
]);

