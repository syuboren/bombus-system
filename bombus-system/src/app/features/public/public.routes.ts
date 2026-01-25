import { Routes } from '@angular/router';

export const publicRoutes: Routes = [
    {
        path: 'interview-response/:token',
        loadComponent: () =>
            import('./pages/interview-response-page/interview-response-page.component')
                .then(m => m.InterviewResponsePageComponent),
        title: '面試邀約回覆'
    }
];
