import { Suspense } from 'react';
import { ApprovalsList } from './ApprovalsList';

export default function ApprovalsPage() {
  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Approval Requests</h1>
      <Suspense fallback={<div className="text-gray-500">Loading approvals...</div>}>
        <ApprovalsList />
      </Suspense>
    </main>
  );
}
