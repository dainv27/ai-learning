import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <div className="text-center py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Approval Not Found</h1>
        <p className="text-gray-600 mb-6">The requested approval does not exist or has been removed.</p>
        <Link
          href="/approvals"
          className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          Back to Approvals
        </Link>
      </div>
    </div>
  );
}
