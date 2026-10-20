import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { getApproval } from '@/lib/api/approvals';
import ApprovalActions from '@/components/approvals/ApprovalActions';

interface PageProps {
  params: { id: string };
}

export default function ApprovalDetailPage({ params }: PageProps) {
  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <Suspense fallback={<LoadingState />}>
        <ApprovalDetail id={params.id} />
      </Suspense>
    </div>
  );
}

async function ApprovalDetail({ id }: { id: string }) {
  try {
    const approval = await getApproval(id);

    return (
      <div>
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Approval Request</h1>
          <span
            className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
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

        <div className="bg-white border rounded-lg p-6 space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-600">Request ID</label>
            <p className="text-gray-900">{approval.id}</p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-600">Requester</label>
            <p className="text-gray-900">{approval.requesterId}</p>
          </div>

          {approval.comment && (
            <div>
              <label className="text-sm font-medium text-gray-600">Comment</label>
              <p className="text-gray-900">{approval.comment}</p>
            </div>
          )}

          {approval.approverId && (
            <div>
              <label className="text-sm font-medium text-gray-600">Approver</label>
              <p className="text-gray-900">{approval.approverId}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-600">Created</label>
              <p className="text-gray-900 text-sm">
                {new Date(approval.createdAt).toLocaleString()}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Updated</label>
              <p className="text-gray-900 text-sm">
                {new Date(approval.updatedAt).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {approval.status === 'PENDING' && (
          <ApprovalActions approvalId={approval.id} />
        )}
      </div>
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      notFound();
    }
    return <ErrorState error={error} />;
  }
}

function LoadingState() {
  return (
    <div className="animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
      <div className="bg-white border rounded-lg p-6 space-y-4">
        <div className="h-4 bg-gray-200 rounded w-1/4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/3"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      </div>
    </div>
  );
}

function ErrorState({ error }: { error: unknown }) {
  const message = error instanceof Error ? error.message : 'Failed to load approval';
  return (
    <div className="text-center py-12">
      <p className="text-red-600 text-lg">Error</p>
      <p className="text-gray-600 text-sm mt-2">{message}</p>
    </div>
  );
}
