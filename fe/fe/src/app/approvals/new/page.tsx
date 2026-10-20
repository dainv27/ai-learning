import { CreateApprovalForm } from '@/components/approvals/CreateApprovalForm';
import Link from 'next/link';

export default function NewApprovalPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link href="/approvals" className="text-blue-600 hover:text-blue-800 mb-4 inline-block">
          ← Back to approvals
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Create Approval Request</h1>
        <p className="mt-2 text-gray-600">Submit a new approval request</p>
      </div>
      <div className="max-w-2xl">
        <CreateApprovalForm />
      </div>
    </div>
  );
}
