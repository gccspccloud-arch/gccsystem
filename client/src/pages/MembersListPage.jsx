import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { memberService } from '@/services/memberService';
import { MEMBER_STATUS_STYLES } from '@/utils/constants';
import { AGE_CLASS_STYLES } from '@/utils/age';
import { useAuth } from '@/context/AuthContext';

const formatDate = (date) => {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
};

const MembersListPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const canRegister = hasRole('super_admin', 'admin');
  const justRegistered = location.state?.justRegistered;

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['members', search, page],
    queryFn: () => memberService.list({ search, page, limit: 20 }),
    keepPreviousData: true,
  });

  const items = data?.data?.items || [];
  const total = data?.data?.total || 0;
  const totalPages = Math.ceil(total / 20) || 1;

  return (
    <div className="max-w-6xl mx-auto">
      {justRegistered && (
        <div className="mb-4 p-3 rounded-lg bg-primary-50 text-primary-800 text-sm border border-primary-200">
          ✓ Member registered successfully.
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-bold text-primary-700">Members</h1>
          <p className="text-sm text-gray-500">{total} registered member{total !== 1 ? 's' : ''}</p>
        </div>
        {canRegister && (
          <Link to="/members/register" className="btn-primary text-center">
            + Register New Member
          </Link>
        )}
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by name..."
          className="input-field max-w-md"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
      </div>

      <div className="card p-0 overflow-hidden">
        {isLoading ? (
          <p className="p-6 text-center text-gray-500 text-sm">Loading...</p>
        ) : isError ? (
          <p className="p-6 text-center text-accent-red text-sm">{error.message}</p>
        ) : items.length === 0 ? (
          <p className="p-6 text-center text-gray-500 text-sm">No members found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left px-4 py-3">Name</th>
                  <th className="text-left px-4 py-3">Gender</th>
                  <th className="text-left px-4 py-3">Birthdate</th>
                  <th className="text-left px-4 py-3">Age Class</th>
                  <th className="text-left px-4 py-3">Contact</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Civil Status</th>
                  <th className="text-left px-4 py-3">Baptized</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((m) => (
                  <tr
                    key={m._id}
                    className="hover:bg-primary-50/40 transition-colors cursor-pointer"
                    onClick={() => navigate(`/members/${m._id}`)}
                  >
                    <td className="px-4 py-3 font-medium text-gray-800">
                      {m.lastName}, {m.firstName} {m.middleName}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{m.gender}</td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(m.birthdate)}</td>
                    <td className="px-4 py-3">
                      {m.ageClass ? (
                        <span className={`text-xs font-medium px-2 py-1 rounded ${AGE_CLASS_STYLES[m.ageClass]}`}>
                          {m.ageClass} {m.age != null && <span className="opacity-70">· {m.age}</span>}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{m.contactNumber || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-1 rounded ${MEMBER_STATUS_STYLES[m.memberStatus] || 'bg-gray-100 text-gray-600'}`}>
                        {m.memberStatus || 'New Attendee'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{m.civilStatus}</td>
                    <td className="px-4 py-3 text-gray-600">{m.isBaptized ? 'Yes' : 'No'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-4">
          <button
            className="btn-secondary px-3 py-1 text-xs"
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </button>
          <span className="text-xs text-gray-500">
            Page {page} of {totalPages}
          </span>
          <button
            className="btn-secondary px-3 py-1 text-xs"
            disabled={page === totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default MembersListPage;
