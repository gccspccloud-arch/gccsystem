import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { userService } from '@/services/userService';
import { memberService } from '@/services/memberService';

/**
 * Builds a unified searchable list of people from Users + Members.
 * Returns items shaped as: { kind: 'User'|'Member', ref: id, name, sub, badge }
 */
const usePeople = () => {
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['users', 'assignable'],
    queryFn: () => userService.listAssignable(),
  });
  const { data: membersData, isLoading: membersLoading } = useQuery({
    queryKey: ['members', 'all-for-picker'],
    queryFn: () => memberService.list({ limit: 1000 }),
  });

  const people = useMemo(() => {
    const u = (usersData?.data || []).map((x) => ({
      kind: 'User',
      ref: x._id,
      name: `${x.firstName} ${x.lastName}`.trim(),
      sub: x.role,
      badge: 'User',
    }));
    const m = (membersData?.data?.items || []).map((x) => ({
      kind: 'Member',
      ref: x._id,
      name: `${x.lastName}, ${x.firstName}${x.middleName ? ' ' + x.middleName.charAt(0) + '.' : ''}`,
      sub: x.memberStatus,
      badge: 'Member',
    }));
    return [...u, ...m];
  }, [usersData, membersData]);

  return { people, isLoading: usersLoading || membersLoading };
};

const KIND_BADGE = {
  User: 'bg-primary-100 text-primary-700',
  Member: 'bg-amber-100 text-amber-700',
};

const personKey = (p) => `${p.kind}:${p.ref}`;

/* ───────── Single select ───────── */

export const PeoplePickerSingle = ({ value, onChange, label = 'Person', required = false, error }) => {
  const { people, isLoading } = usePeople();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const selected = useMemo(() => {
    if (!value) return null;
    // Prefer the live list (richer info), but fall back to the value itself
    return people.find((p) => p.kind === value.kind && p.ref === (value.ref?._id || value.ref))
      || (value.ref ? {
        kind: value.kind,
        ref: value.ref?._id || value.ref,
        name: value.ref?.firstName ? `${value.ref.firstName} ${value.ref.lastName}` : 'Loading...',
        sub: value.ref?.role || value.ref?.memberStatus || '',
        badge: value.kind,
      } : null);
  }, [people, value]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return people;
    return people.filter((p) => p.name.toLowerCase().includes(q));
  }, [people, search]);

  const select = (p) => {
    onChange({ kind: p.kind, ref: p.ref });
    setOpen(false);
    setSearch('');
  };

  const clear = () => onChange(null);

  return (
    <div className="relative">
      <label className="text-sm font-medium text-gray-700">
        {label} {required && '*'}
      </label>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="input-field w-full text-left flex items-center justify-between"
      >
        {selected ? (
          <span className="flex items-center gap-2 truncate">
            <span className={`text-[10px] px-1.5 py-0.5 rounded ${KIND_BADGE[selected.kind]}`}>
              {selected.badge}
            </span>
            <span className="truncate">{selected.name}</span>
            {selected.sub && <span className="text-[11px] text-gray-400 truncate">· {selected.sub}</span>}
          </span>
        ) : (
          <span className="text-gray-400">Select a person...</span>
        )}
        <span className="text-gray-400 ml-2">▾</span>
      </button>

      {selected && (
        <button
          type="button"
          onClick={clear}
          className="absolute right-9 top-9 text-gray-400 hover:text-accent-red text-sm"
        >
          ×
        </button>
      )}

      {error && <p className="text-xs text-accent-red mt-1">{error}</p>}

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute z-50 mt-1 w-full bg-white rounded-lg shadow-lg border border-gray-200 max-h-72 overflow-hidden flex flex-col">
            <input
              autoFocus
              className="input-field !rounded-none border-0 border-b !ring-0"
              placeholder="🔍 Search users or members..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="overflow-y-auto divide-y divide-gray-100">
              {isLoading ? (
                <p className="text-xs text-gray-400 p-3 text-center">Loading...</p>
              ) : filtered.length === 0 ? (
                <p className="text-xs text-gray-400 p-3 text-center">No matches.</p>
              ) : (
                filtered.map((p) => {
                  const isSel = selected && selected.kind === p.kind && selected.ref === p.ref;
                  return (
                    <button
                      key={personKey(p)}
                      type="button"
                      onClick={() => select(p)}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-primary-50 ${
                        isSel ? 'bg-primary-50' : ''
                      }`}
                    >
                      <span className={`text-[10px] px-1.5 py-0.5 rounded flex-shrink-0 ${KIND_BADGE[p.kind]}`}>
                        {p.badge}
                      </span>
                      <span className="flex-1 truncate">{p.name}</span>
                      {p.sub && <span className="text-[10px] text-gray-400 flex-shrink-0">{p.sub}</span>}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

/* ───────── Multi select ───────── */

export const PeoplePickerMulti = ({ value = [], onChange, label = 'People' }) => {
  const { people, isLoading } = usePeople();
  const [search, setSearch] = useState('');
  const [kindFilter, setKindFilter] = useState(''); // '', 'User', 'Member'

  const selectedKeys = useMemo(
    () => new Set(value.map((v) => `${v.kind}:${v.ref?._id || v.ref}`)),
    [value],
  );

  // Selected display objects (resolve from people list when possible)
  const selectedDisplay = useMemo(() => {
    return value.map((v) => {
      const refId = v.ref?._id || v.ref;
      const live = people.find((p) => p.kind === v.kind && p.ref === refId);
      if (live) return live;
      return {
        kind: v.kind,
        ref: refId,
        name: v.ref?.firstName ? `${v.ref.firstName} ${v.ref.lastName}` : '...',
        sub: v.ref?.role || v.ref?.memberStatus || '',
        badge: v.kind,
      };
    });
  }, [value, people]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return people.filter((p) => {
      if (kindFilter && p.kind !== kindFilter) return false;
      if (!q) return true;
      return p.name.toLowerCase().includes(q);
    });
  }, [people, search, kindFilter]);

  const toggle = (p) => {
    const key = personKey(p);
    if (selectedKeys.has(key)) {
      onChange(value.filter((v) => `${v.kind}:${v.ref?._id || v.ref}` !== key));
    } else {
      onChange([...value, { kind: p.kind, ref: p.ref }]);
    }
  };

  const removeOne = (p) => {
    onChange(value.filter((v) => !(v.kind === p.kind && (v.ref?._id || v.ref) === p.ref)));
  };

  const clearAll = () => onChange([]);

  const addAllVisible = () => {
    const next = [...value];
    visible.forEach((p) => {
      const key = personKey(p);
      if (!selectedKeys.has(key)) next.push({ kind: p.kind, ref: p.ref });
    });
    onChange(next);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-medium text-gray-700">
          {label} <span className="text-primary-700">({value.length})</span>
        </label>
        {value.length > 0 && (
          <button type="button" onClick={clearAll} className="text-[11px] text-accent-red hover:underline">
            Clear all
          </button>
        )}
      </div>

      {selectedDisplay.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2 p-2 bg-primary-50/50 border border-primary-100 rounded-lg max-h-28 overflow-y-auto">
          {selectedDisplay.map((p) => (
            <span
              key={personKey(p)}
              className="inline-flex items-center gap-1 text-xs bg-white border border-primary-200 text-primary-700 pl-2 pr-1 py-0.5 rounded-full"
            >
              <span className={`text-[9px] px-1 py-0 rounded ${KIND_BADGE[p.kind]}`}>{p.badge}</span>
              {p.name}
              <button
                type="button"
                onClick={() => removeOne(p)}
                className="w-4 h-4 inline-flex items-center justify-center rounded-full hover:bg-primary-100 text-primary-600"
                aria-label={`Remove ${p.name}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-2 mb-2">
        <input
          className="input-field flex-1"
          placeholder="🔍 Search users or members..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="input-field sm:max-w-[140px]"
          value={kindFilter}
          onChange={(e) => setKindFilter(e.target.value)}
        >
          <option value="">All</option>
          <option value="User">Users only</option>
          <option value="Member">Members only</option>
        </select>
      </div>

      <div className="flex items-center justify-between mb-1 px-1">
        <span className="text-[11px] text-gray-500">
          Showing {visible.length} of {people.length}
        </span>
        <button
          type="button"
          onClick={addAllVisible}
          disabled={visible.length === 0}
          className="text-[11px] text-primary-600 hover:underline disabled:text-gray-300 disabled:no-underline"
        >
          + Add all shown
        </button>
      </div>

      <div className="border border-gray-200 rounded-lg max-h-56 overflow-y-auto divide-y divide-gray-100">
        {isLoading ? (
          <p className="text-xs text-gray-400 p-3 text-center">Loading...</p>
        ) : visible.length === 0 ? (
          <p className="text-xs text-gray-400 p-3 text-center">No matches.</p>
        ) : (
          visible.map((p) => {
            const isSel = selectedKeys.has(personKey(p));
            return (
              <button
                key={personKey(p)}
                type="button"
                onClick={() => toggle(p)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors ${
                  isSel ? 'bg-primary-50 hover:bg-primary-100' : 'hover:bg-gray-50'
                }`}
              >
                <span className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                  isSel ? 'bg-primary-600 border-primary-600 text-white' : 'border-gray-300 bg-white'
                }`}>
                  {isSel && <span className="text-[10px] leading-none">✓</span>}
                </span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded flex-shrink-0 ${KIND_BADGE[p.kind]}`}>
                  {p.badge}
                </span>
                <span className="flex-1 truncate">{p.name}</span>
                {p.sub && <span className="text-[10px] text-gray-400 flex-shrink-0">{p.sub}</span>}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};
