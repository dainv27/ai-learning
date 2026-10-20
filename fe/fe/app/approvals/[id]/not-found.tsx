export default function NotFound() {
  return (
    <main className="min-h-screen p-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white shadow rounded-lg p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Approval Not Found</h1>
          <p className="text-gray-600 mb-6">
            The approval request you are looking for does not exist or has been removed.
          </p>
          <a
            href="/approvals"
            className="inline-block px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Back to Approvals
          </a>
        </div>
      </div>
    </main>
  );
}
