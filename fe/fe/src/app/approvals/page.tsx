import { Suspense } from 'react';
import Link from 'next/link';
import { getApprovals } from '@/lib/api/approvals';

export default function ApprovalsPage() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Approvals</h1>
      <Suspense fallback={<LoadingState />}>
        <ApprovalsList />
      </Suspense>
    </div>
  );
}

async function ApprovalsList() {
  try {
    const approvals = await getApprovals();
    
    if (approvals.length === 0) {
      return <EmptyState />;
    }

    return (
      <div className="space-y-4">
        {approvals.map((approval) => (
          <Link
            key={approval.id}
            href={`/approvals/${approval.id}`}
            className="block p-4 border rounded-lg hover:bg-gray-50 transition"
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="font-medium">Request ID: {approval.id}</p>
                <p className="text-sm text-gray-600">Requester: {approval.requesterId}</p>
                {approval.comment && (
                  <p className="text-sm text-gray-500 mt-1">{approval.comment}</p>
                )}
              </div>
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  approval.status === 'PENDING'
                    ? 'bg-yellow-100 text-yellow-800'
                    : approval.status === 'APPROVED'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {approval.status}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Created: {new Date(approval.createdAt).toLocaleString()}
            </p>
          </Link>
        ))}
      </div>
    );
  } catch (error) {
    return <ErrorState error={error} />;
  }
}

function LoadingState() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="p-4 border rounded-lg animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-1/3"></div>
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-12">
      <p className="text-gray-500 text-lg">No approvals found</p>
      <p className="text-gray-400 text-sm mt-2">Pending approval requests will appear here</p>
    </div>
  );
}

function ErrorState({ error }: { error: unknown }) {
  const message = error instanceof Error ? error.message : 'Failed to load approvals';
  return (
    <div className="text-center py-12">
      <p className="text-red-600 text-lg">Error</p>
      <p className="text-gray-600 text-sm mt-2">{message}</p>
    </div>
  );
}
