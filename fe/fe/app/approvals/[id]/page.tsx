import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import ApprovalDetail from './ApprovalDetail';

interface PageProps {
  params: { id: string };
}

async function getApproval(id: string) {
  const baseUrl = process.env.API_BASE_URL || 'http://localhost:8080';
  const res = await fetch(`${baseUrl}/api/approvals/${id}`, {
    cache: 'no-store',
    headers: {
      'Accept': 'application/json',
    },
  });

  if (res.status === 404) {
    return null;
  }

  if (!res.ok) {
    throw new Error(`Failed to fetch approval: ${res.status}`);
  }

  return res.json();
}

export default async function ApprovalPage({ params }: PageProps) {
  const approval = await getApproval(params.id);

  if (!approval) {
    notFound();
  }

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Approval Request</h1>
        <Suspense fallback={<div className="animate-pulse bg-gray-200 h-64 rounded" />}>
          <ApprovalDetail approval={approval} />
        </Suspense>
      </div>
    </main>
  );
}
