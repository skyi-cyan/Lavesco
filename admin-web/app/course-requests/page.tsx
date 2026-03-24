'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  fetchCourseAddRequests,
  updateCourseAddRequest,
} from '@/lib/courseRequests/courseRequestService';
import type { CourseAddRequest } from '@/lib/courseRequests/types';
import {
  COURSE_ADD_REQUEST_STATUSES,
  type CourseAddRequestStatus,
} from '@/lib/courseRequests/types';

function formatDate(v: unknown): string {
  if (v == null) return '-';
  if (typeof (v as { toDate?: () => Date }).toDate === 'function') {
    const d = (v as { toDate: () => Date }).toDate();
    return d.toLocaleString('ko-KR');
  }
  return String(v);
}

const STATUS_LABEL: Record<CourseAddRequestStatus, string> = {
  PENDING: '대기',
  IN_PROGRESS: '처리중',
  COMPLETED: '등록 완료',
  REJECTED: '반려',
};

export default function CourseRequestsPage() {
  const [list, setList] = useState<CourseAddRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<
    Record<string, { status: CourseAddRequestStatus; adminReply: string; createdGolfCourseId: string }>
  >({});

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchCourseAddRequests();
      setList(data);
      const next: typeof drafts = {};
      data.forEach((r) => {
        next[r.id] = {
          status: r.status ?? 'PENDING',
          adminReply: r.adminReply ?? '',
          createdGolfCourseId: r.createdGolfCourseId ?? '',
        };
      });
      setDrafts(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : '목록을 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async (id: string) => {
    const d = drafts[id];
    if (!d) return;
    setSavingId(id);
    setError('');
    try {
      await updateCourseAddRequest(id, {
        status: d.status,
        adminReply: d.adminReply.trim(),
        createdGolfCourseId: d.createdGolfCourseId.trim() || undefined,
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : '저장에 실패했습니다.');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-800">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Link
            href="/"
            className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            ← 대시보드
          </Link>
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            코스 추가 요청
          </h1>
          <Link
            href="/courses/new"
            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
          >
            골프장 등록
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
          앱 사용자가 보낸 골프장 등록 요청입니다. 코스 관리에서 골프장을 추가한 뒤, 상태와 답변을 저장하면 사용자가 앱에서 확인할 수 있습니다.
        </p>
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
          </div>
        ) : list.length === 0 ? (
          <p className="rounded-xl border border-zinc-200 bg-white p-8 text-center text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800">
            요청이 없습니다.
          </p>
        ) : (
          <div className="space-y-4">
            {list.map((r) => {
              const d = drafts[r.id] ?? {
                status: (r.status ?? 'PENDING') as CourseAddRequestStatus,
                adminReply: r.adminReply ?? '',
                createdGolfCourseId: r.createdGolfCourseId ?? '',
              };
              return (
                <div
                  key={r.id}
                  className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-800"
                >
                  <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                        {r.golfCourseName}
                      </p>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        {formatDate(r.createdAt)} · {r.region || '지역 미입력'}
                      </p>
                      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                        요청자: {r.userNickname || r.userEmail || r.userId}
                        {r.userEmail ? ` (${r.userEmail})` : ''}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        r.status === 'COMPLETED'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200'
                          : r.status === 'REJECTED'
                            ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200'
                            : r.status === 'IN_PROGRESS'
                              ? 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200'
                              : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200'
                      }`}
                    >
                      {STATUS_LABEL[r.status ?? 'PENDING']}
                    </span>
                  </div>
                  {r.details ? (
                    <p className="mb-3 rounded-lg bg-zinc-50 p-3 text-sm text-zinc-700 dark:bg-zinc-900/50 dark:text-zinc-300">
                      {r.details}
                    </p>
                  ) : null}
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                        처리 상태
                      </label>
                      <select
                        value={d.status}
                        onChange={(e) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [r.id]: { ...d, status: e.target.value as CourseAddRequestStatus },
                          }))
                        }
                        className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
                      >
                        {COURSE_ADD_REQUEST_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {STATUS_LABEL[s]}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                        등록한 골프장 ID (선택)
                      </label>
                      <input
                        type="text"
                        value={d.createdGolfCourseId}
                        onChange={(e) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [r.id]: { ...d, createdGolfCourseId: e.target.value },
                          }))
                        }
                        placeholder="Firestore golfCourses 문서 ID"
                        className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
                      />
                      {d.createdGolfCourseId ? (
                        <Link
                          href={`/courses/${d.createdGolfCourseId}`}
                          className="mt-1 inline-block text-xs text-emerald-600 hover:underline"
                        >
                          코스 관리에서 열기 →
                        </Link>
                      ) : null}
                    </div>
                  </div>
                  <div className="mt-3">
                    <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                      사용자에게 보낼 답변 (등록 완료 안내 등)
                    </label>
                    <textarea
                      value={d.adminReply}
                      onChange={(e) =>
                        setDrafts((prev) => ({
                          ...prev,
                          [r.id]: { ...d, adminReply: e.target.value },
                        }))
                      }
                      rows={3}
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
                      placeholder="예: 요청하신 OOCC가 등록되었습니다. 코스 메뉴에서 확인해 주세요."
                    />
                  </div>
                  <div className="mt-4 flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleSave(r.id)}
                      disabled={savingId === r.id}
                      className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {savingId === r.id ? '저장 중...' : '저장'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
