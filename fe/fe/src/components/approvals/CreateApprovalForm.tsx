'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { approvalService } from '@/services/approvalService';

export function CreateApprovalForm() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    resourceType: '',
    resourceId: '',
    reason: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!formData.resourceType.trim() || !formData.resourceId.trim()) {
      setError('Resource type and resource ID are required');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const approval = await approvalService.createApproval(formData);
      router.push(`/approvals/${approval.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create approval request');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded p-4">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      <div className="mb-4">
        <label htmlFor="resourceType" className="block text-sm font-medium text-gray-700 mb-2">
          Resource Type <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="resourceType"
          value={formData.resourceType}
          onChange={(e) => setFormData({ ...formData, resourceType: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="e.g., deployment, feature-flag, config-change"
          required
          disabled={loading}
        />
      </div>

      <div className="mb-4">
        <label htmlFor="resourceId" className="block text-sm font-medium text-gray-700 mb-2">
          Resource ID <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="resourceId"
          value={formData.resourceId}
          onChange={(e) => setFormData({ ...formData, resourceId: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Unique identifier for the resource"
          required
          disabled={loading}
        />
      </div>

      <div className="mb-6">
        <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-2">
          Reason
        </label>
        <textarea
          id="reason"
          value={formData.reason}
          onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={4}
          placeholder="Explain why this approval is needed"
          disabled={loading}
        />
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          {loading ? 'Creating...' : 'Create Request'}
        </button>
        <button
          type="button"
          onClick={() => router.push('/approvals')}
          disabled={loading}
          className="px-6 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
