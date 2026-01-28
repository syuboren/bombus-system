import { Routes } from '@angular/router';

export const publicRoutes: Routes = [
    {
        path: 'interview-response/:token',
        loadComponent: () =>
            import('./pages/interview-response-page/interview-response-page.component')
                .then(m => m.InterviewResponsePageComponent),
        title: '面試邀約回覆'
    },
    {
        path: 'interview-cancel/:token',
        loadComponent: () =>
            import('./pages/interview-cancel-page/interview-cancel-page.component')
                .then(m => m.InterviewCancelPageComponent),
        title: '取消面試'
    },
    {
        path: 'offer-response/:token',
        loadComponent: () =>
            import('./pages/offer-response-page/offer-response-page.component')
                .then(m => m.OfferResponsePageComponent),
        title: '錄用通知回覆'
    },
    {
        path: 'meeting-sign-in/:meetingId',
        loadComponent: () =>
            import('./pages/meeting-sign-in-page/meeting-sign-in-page.component')
                .then(m => m.MeetingSignInPageComponent),
        title: '會議簽到'
    }
];
