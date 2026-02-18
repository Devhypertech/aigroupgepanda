'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { getPublicConfig } from '../../../../lib/config';
import { useToast } from '../../../../components/ui/Toast';

interface User {
  id: string;
  name: string | null;
  email: string;
  createdAt: string;
  interestsCount: number;
  savedCount: number;
}

export default function AdminUsersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const config = getPublicConfig();
  const API_URL = config.apiUrl;
  const { showToast, ToastComponent } = useToast();

  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [total, setTotal] = useState(0);

  // Check if user is admin (client-side check - backend will enforce)
  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/login?next=/admin/users');
      return;
    }

    // Fetch users
    fetchUsers();
  }, [status, session, router]);

  const fetchUsers = async (search?: string) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) {
        params.set('search', search);
      }
      params.set('limit', '100');

      // Get user ID from session for backend auth
      const userId = (session?.user as any)?.id;
      
      const response = await fetch(`${API_URL}/api/users?${params.toString()}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(userId ? { 'X-User-Id': userId } : {}),
        },
        credentials: 'include',
      });

      if (response.status === 403) {
        showToast('You do not have permission to access this page', 'error');
        router.push('/feed');
        return;
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch users: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      setUsers(data.users || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error('Error fetching users:', error);
      showToast(
        error instanceof Error ? error.message : 'Failed to load users',
        'error'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    fetchUsers(query);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen bg-gp-bg flex items-center justify-center">
        <div className="text-gp-text">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-gp-bg py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gp-text mb-2">Admin: Users</h1>
          <p className="text-gp-muted text-sm">
            Manage and view all users ({total} total)
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search by email or name..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full max-w-md px-4 py-2 bg-gp-surface border border-gray-200 rounded-lg text-gp-text placeholder-gp-muted focus:outline-none focus:ring-2 focus:ring-gp-primary focus:border-transparent"
          />
        </div>

        {/* Users Table */}
        <div className="bg-gp-surface rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gp-muted uppercase tracking-wider">
                    User ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gp-muted uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gp-muted uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gp-muted uppercase tracking-wider">
                    Created At
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gp-muted uppercase tracking-wider">
                    Interests
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gp-muted uppercase tracking-wider">
                    Saved Items
                  </th>
                </tr>
              </thead>
              <tbody className="bg-gp-bg divide-y divide-gray-200">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gp-muted">
                      {searchQuery ? 'No users found matching your search' : 'No users found'}
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id} className="hover:bg-gp-surface/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <code className="text-xs text-gp-muted font-mono">
                          {user.id.substring(0, 8)}...
                        </code>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gp-text">{user.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gp-text">
                          {user.name || <span className="text-gp-muted italic">No name</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gp-muted">
                          {formatDate(user.createdAt)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gp-text font-medium">
                          {user.interestsCount}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gp-text font-medium">
                          {user.savedCount}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-4 text-sm text-gp-muted">
          Showing {users.length} of {total} users
        </div>
      </div>

      {ToastComponent}
    </div>
  );
}

