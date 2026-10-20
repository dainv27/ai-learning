import { Suspense } from 'react';
import { ApprovalDetailContent } from '@/components/approvals/ApprovalDetailContent';
import { LoadingSkeleton } from '@/components/approvals/LoadingSkeleton';
import { notFound } from 'next/navigation';

interface ApprovalDetailPageProps {
  params: {
    id: string;
  };
}

export default function ApprovalDetailPage({ params }: ApprovalDetailPageProps) {
  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(params.id)) {
    notFound();
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Suspense fallback={<LoadingSkeleton />}>
        <ApprovalDetailContent id={params.id} />
      </Suspense>
    </div>
  );
}
