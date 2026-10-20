import { ApprovalRequestCard } from './ApprovalRequestCard';
import { getApprovalRequests } from './actions';

export default async function ApprovalList() {
  const requests = await getApprovalRequests();

  if (requests.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="text-lg">No approval requests found</p>
        <p className="text-sm mt-2">All requests have been processed</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {requests.map((request) => (
        <ApprovalRequestCard key={request.id} request={request} />
      ))}
    </div>
  );
}
