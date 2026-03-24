'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { fetchAdminUsers, updateAdminUser } from '@/lib/users/userService';
import { USER_STATUSES, type AdminUser, type UserStatus } from '@/lib/users/types';

function formatDate(v: unknown): string {
  if (v == null) return '-';
  if (typeof (v as { toDate?: () => Date }).toDate === 'function') {
    return (v as { toDate: () => Date }).toDate().toLocaleDateString('ko-KR');
  }
  return String(v);
}

const STATUS_LABEL: Record<UserStatus, string> = {
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
  SUSPENDED: 'Suspended',
};

export default function UsersPage() {
  const [list, setList] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [keyword, setKeyword] = useState('');
  const [roundSort, setRoundSort] = useState<'desc' | 'asc'>('desc');
  const [drafts, setDrafts] = useState<
    Record<string, { role: string; status: UserStatus; defaultTee: string; customerName: string }>
  >({});

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchAdminUsers();
      setList(data);
      const nextDrafts: typeof drafts = {};
      data.forEach((u) => {
        nextDrafts[u.id] = {
          role: u.role ?? '',
          status: (u.status ?? 'ACTIVE') as UserStatus,
          defaultTee: u.defaultTee ?? 'white',
          customerName: u.customerName ?? '',
        };
      });
      setDrafts(nextDrafts);
    } catch (e) {
      setError(e instanceof Error ? e.message : '사용자 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filteredList = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    const base = !q
      ? list
      : list.filter((u) =>
      [u.customerName, u.nickname, u.displayName, u.email, u.role]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
    const sorted = [...base].sort((a, b) => {
      const av = a.roundCount ?? 0;
      const bv = b.roundCount ?? 0;
      return roundSort === 'desc' ? bv - av : av - bv;
    });
    return sorted;
  }, [list, keyword, roundSort]);

  const handleSave = async (id: string) => {
    const d = drafts[id];
    if (!d) return;
    setSavingId(id);
    setError('');
    try {
      await updateAdminUser(id, {
        role: d.role,
        status: d.status,
        defaultTee: d.defaultTee,
        customerName: d.customerName,
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : '사용자 저장 실패');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-800">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
          <Link
            href="/"
            className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            ← 대시보드
          </Link>
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">사용자 목록 / 계정 관리</h1>
          <button
            type="button"
            onClick={load}
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-700"
          >
            새로고침
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="고객명, 이름, 이메일, 권한 검색"
            className="w-full max-w-md rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
          />
          <p className="text-sm text-zinc-500 dark:text-zinc-400">총 {filteredList.length}명</p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-800">
            <table className="min-w-[1100px] w-full text-sm">
              <thead className="bg-zinc-100 dark:bg-zinc-700/40">
                <tr>
                  <th className="px-3 py-2 text-left">고객명</th>
                  <th className="px-3 py-2 text-left">이름</th>
                  <th className="px-3 py-2 text-left">E-Mail</th>
                  <th className="px-3 py-2 text-left">
                    <button
                      type="button"
                      onClick={() => setRoundSort((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
                      className="inline-flex items-center gap-1 font-semibold text-zinc-900 hover:text-emerald-700 dark:text-zinc-100 dark:hover:text-emerald-300"
                    >
                      라운드 수
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">
                        {roundSort === 'desc' ? '▼' : '▲'}
                      </span>
                    </button>
                  </th>
                  <th className="px-3 py-2 text-left">권한</th>
                  <th className="px-3 py-2 text-left">상태</th>
                  <th className="px-3 py-2 text-left">기본티</th>
                  <th className="px-3 py-2 text-left">마지막 로그인</th>
                  <th className="px-3 py-2 text-left">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredList.map((u) => {
                  const d = drafts[u.id] ?? {
                    role: u.role ?? '',
                    status: (u.status ?? 'ACTIVE') as UserStatus,
                    defaultTee: u.defaultTee ?? 'white',
                    customerName: u.customerName ?? '',
                  };
                  return (
                    <tr key={u.id} className="border-t border-zinc-200 dark:border-zinc-700">
                      <td className="px-3 py-2">
                        <input
                          value={d.customerName}
                          onChange={(e) =>
                            setDrafts((prev) => ({ ...prev, [u.id]: { ...d, customerName: e.target.value } }))
                          }
                          className="w-40 rounded border border-zinc-300 px-2 py-1 dark:border-zinc-600 dark:bg-zinc-700"
                        />
                      </td>
                      <td className="px-3 py-2">{u.nickname || u.displayName || '-'}</td>
                      <td className="px-3 py-2">{u.email || '-'}</td>
                      <td className="px-3 py-2 font-medium text-zinc-700 dark:text-zinc-200">{u.roundCount ?? 0}</td>
                      <td className="px-3 py-2">
                        <input
                          value={d.role}
                          onChange={(e) =>
                            setDrafts((prev) => ({ ...prev, [u.id]: { ...d, role: e.target.value } }))
                          }
                          className="w-28 rounded border border-zinc-300 px-2 py-1 dark:border-zinc-600 dark:bg-zinc-700"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={d.status}
                          onChange={(e) =>
                            setDrafts((prev) => ({
                              ...prev,
                              [u.id]: { ...d, status: e.target.value as UserStatus },
                            }))
                          }
                          className="rounded border border-zinc-300 px-2 py-1 dark:border-zinc-600 dark:bg-zinc-700"
                        >
                          {USER_STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {STATUS_LABEL[s]}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={d.defaultTee}
                          onChange={(e) =>
                            setDrafts((prev) => ({ ...prev, [u.id]: { ...d, defaultTee: e.target.value } }))
                          }
                          className="rounded border border-zinc-300 px-2 py-1 dark:border-zinc-600 dark:bg-zinc-700"
                        >
                          {['black', 'blue', 'white', 'red'].map((tee) => (
                            <option key={tee} value={tee}>
                              {tee}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2">{formatDate(u.lastLoginAt ?? u.updatedAt ?? u.createdAt)}</td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => handleSave(u.id)}
                          disabled={savingId === u.id}
                          className="rounded bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                        >
                          {savingId === u.id ? '저장중' : '저장'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
