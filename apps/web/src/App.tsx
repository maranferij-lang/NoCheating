import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { FullPageSpinner } from './ui';

// Route table (architect-owned). Each page module default-exports its component.
const HomePage = lazy(() => import('./landing/HomePage'));
const HowItWorksPage = lazy(() => import('./landing/HowItWorksPage'));
const NotFoundPage = lazy(() => import('./landing/NotFoundPage'));
const LabPage = lazy(() => import('./lab/LabPage'));
const JoinPage = lazy(() => import('./student/JoinPage'));
const StudentApp = lazy(() => import('./student/StudentApp'));
const PhonePage = lazy(() => import('./phone/PhonePage'));
const ProctorLoginPage = lazy(() => import('./proctor/LoginPage'));
const ProctorApp = lazy(() => import('./proctor/ProctorApp'));

export function App() {
  return (
    <Suspense fallback={<FullPageSpinner label="Завантаження…" />}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/how" element={<HowItWorksPage />} />
        <Route path="/lab" element={<LabPage />} />
        <Route path="/join" element={<JoinPage />} />
        <Route path="/join/:code" element={<JoinPage />} />
        {/* Student flow after joining: /exam/consent, /exam/check, /exam/identity, /exam/calibration, /exam/phone, /exam/ready, /exam/live, /exam/done */}
        <Route path="/exam/*" element={<StudentApp />} />
        <Route path="/phone/:pairToken" element={<PhonePage />} />
        <Route path="/proctor/login" element={<ProctorLoginPage />} />
        {/* Proctor: /proctor, /proctor/exams/new, /proctor/exams/:id, /proctor/exams/:id/edit, /proctor/sessions/:id, /proctor/sessions/:id/report */}
        <Route path="/proctor/*" element={<ProctorApp />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
