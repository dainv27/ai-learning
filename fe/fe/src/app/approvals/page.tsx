import { Suspense } from 'react';
import { ApprovalsListContent } from '@/components/approvals/ApprovalsListContent';
import { LoadingSkeleton } from '@/components/approvals/LoadingSkeleton';

export default function ApprovalsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Approval Requests</h1>
        <p className="mt-2 text-gray-600">Manage and review approval requests</p>
      </div>
      <Suspense fallback={<LoadingSkeleton />}>
        <ApprovalsListContent />
      </Suspense>
    </div>
  );
}
