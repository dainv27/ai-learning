import { Suspense } from 'react';
import { ApprovalDetail } from './ApprovalDetail';

interface Props {
  params: {
    id: string;
  };
}

export default function ApprovalDetailPage({ params }: Props) {
  return (
    <main className="container mx-auto px-4 py-8">
      <Suspense fallback={<div className="text-gray-500">Loading approval...</div>}>
        <ApprovalDetail id={params.id} />
      </Suspense>
    </main>
  );
}
