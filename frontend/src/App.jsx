import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import DocsPage from './pages/DocsPage';
import NotFoundPage from './pages/NotFoundPage';

const PlaygroundPage = React.lazy(() => import('./pages/PlaygroundPage'));
const StatusPage = React.lazy(() => import('./pages/StatusPage'));

export function AppContent() {
  return (
    <>
      <Navbar />
      <main>
        <Suspense fallback={<div className="page">Loading…</div>}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/playground" element={<PlaygroundPage />} />
          <Route path="/docs" element={<DocsPage />} />
          <Route path="/status" element={<StatusPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
        </Suspense>
      </main>
      <Footer />
    </>
  );
}

export default function App() {
  return <BrowserRouter><AppContent /></BrowserRouter>;
}
