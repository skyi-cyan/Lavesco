'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  fetchGolfCourses,
  deleteGolfCourse,
} from '@/lib/golfCourses/golfCourseService';
import type { GolfCourse } from '@/lib/golfCourses/types';

const PAGE_SIZE = 20;
const EMPTY_REGION_LABEL = '(지역 없음)';

function normalizeRegionLabel(region: string | undefined): string {
  const t = (region ?? '').trim();
  return t || EMPTY_REGION_LABEL;
}

export default function CoursesPage() {
  const [list, setList] = useState<GolfCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [regionModalOpen, setRegionModalOpen] = useState(false);
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [modalRegionQuery, setModalRegionQuery] = useState('');
  const [modalDraftRegions, setModalDraftRegions] = useState<string[]>([]);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchGolfCourses();
      setList(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : '목록을 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const uniqueRegions = useMemo(() => {
    const s = new Set<string>();
    list.forEach((c) => s.add(normalizeRegionLabel(c.region)));
    return [...s].sort((a, b) => a.localeCompare(b, 'ko'));
  }, [list]);

  const filteredList = useMemo(() => {
    if (selectedRegions.length === 0) return list;
    const set = new Set(selectedRegions);
    return list.filter((c) => set.has(normalizeRegionLabel(c.region)));
  }, [list, selectedRegions]);

  const totalPages = Math.max(1, Math.ceil(filteredList.length / PAGE_SIZE));

  const paginatedList = useMemo(() => {
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredList.slice(start, start + PAGE_SIZE);
  }, [filteredList, page, totalPages]);

  useEffect(() => {
    setPage((p) => Math.min(p, totalPages));
  }, [totalPages]);

  const openRegionModal = useCallback(() => {
    setModalRegionQuery('');
    setModalDraftRegions([...selectedRegions]);
    setRegionModalOpen(true);
  }, [selectedRegions]);

  useEffect(() => {
    if (!regionModalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setRegionModalOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [regionModalOpen]);

  const modalRegionsFiltered = useMemo(() => {
    const q = modalRegionQuery.trim().toLowerCase();
    if (!q) return uniqueRegions;
    return uniqueRegions.filter((r) => r.toLowerCase().includes(q));
  }, [uniqueRegions, modalRegionQuery]);

  const toggleDraftRegion = (label: string) => {
    setModalDraftRegions((prev) =>
      prev.includes(label) ? prev.filter((x) => x !== label) : [...prev, label]
    );
  };

  const applyRegionFilter = () => {
    setSelectedRegions(modalDraftRegions);
    setPage(1);
    setRegionModalOpen(false);
  };

  const clearRegionFilter = () => {
    setSelectedRegions([]);
    setPage(1);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`"${name}" 골프장을 삭제하시겠습니까? 하위 코스·홀 데이터가 모두 삭제됩니다.`))
      return;
    setDeletingId(id);
    try {
      await deleteGolfCourse(id);
      setList((prev) => prev.filter((c) => c.id !== id));
    } catch (e) {
      alert(e instanceof Error ? e.message : '삭제에 실패했습니다.');
    } finally {
      setDeletingId(null);
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
            코스 관리 (골프장 · 코스 · 홀)
          </h1>
          <Link
            href="/courses/new"
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            골프장 추가
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
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
          <div className="rounded-xl border border-zinc-200 bg-white p-12 text-center dark:border-zinc-700 dark:bg-zinc-800">
            <p className="text-zinc-500 dark:text-zinc-400">
              등록된 골프장이 없습니다.
            </p>
            <Link
              href="/courses/new"
              className="mt-4 inline-block rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              첫 골프장 추가
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={openRegionModal}
                  className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
                >
                  권역 검색
                </button>
                {selectedRegions.length > 0 && (
                  <button
                    type="button"
                    onClick={clearRegionFilter}
                    className="text-sm text-zinc-600 underline hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                  >
                    필터 초기화
                  </button>
                )}
              </div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                전체 {list.length}곳
                {selectedRegions.length > 0 && (
                  <span className="text-zinc-700 dark:text-zinc-300">
                    {' '}
                    · 표시 {filteredList.length}곳
                  </span>
                )}
              </p>
            </div>

            {selectedRegions.length > 0 && (
              <div className="mb-4 flex flex-wrap gap-2">
                {selectedRegions.map((r) => (
                  <span
                    key={r}
                    className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100"
                  >
                    {r === EMPTY_REGION_LABEL ? '지역 미입력' : r}
                  </span>
                ))}
              </div>
            )}

            {filteredList.length === 0 ? (
              <div className="rounded-xl border border-zinc-200 bg-white p-12 text-center dark:border-zinc-700 dark:bg-zinc-800">
                <p className="text-zinc-500 dark:text-zinc-400">
                  선택한 권역에 해당하는 골프장이 없습니다.
                </p>
                <button
                  type="button"
                  onClick={clearRegionFilter}
                  className="mt-4 text-sm font-medium text-emerald-600 hover:underline dark:text-emerald-400"
                >
                  필터 초기화
                </button>
              </div>
            ) : (
              <>
                <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-800">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/50">
                        <th className="px-4 py-3 text-left text-sm font-medium text-zinc-700 dark:text-zinc-300">
                          골프장(CC)
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-zinc-700 dark:text-zinc-300">
                          지역
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-zinc-700 dark:text-zinc-300">
                          상태
                        </th>
                        <th className="px-4 py-3 text-right text-sm font-medium text-zinc-700 dark:text-zinc-300">
                          작업
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedList.map((c) => (
                        <tr
                          key={c.id}
                          className="border-b border-zinc-100 dark:border-zinc-700"
                        >
                          <td className="px-4 py-3">
                            <Link
                              href={`/courses/${c.id}`}
                              className="font-medium text-emerald-600 hover:underline dark:text-emerald-400"
                            >
                              {c.name}
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                            {c.region?.trim() ? c.region : '—'}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={
                                c.status === 'ACTIVE'
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : 'text-zinc-500'
                              }
                            >
                              {c.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Link
                              href={`/courses/${c.id}`}
                              className="mr-2 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                            >
                              수정
                            </Link>
                            <button
                              type="button"
                              onClick={() => handleDelete(c.id, c.name)}
                              disabled={deletingId === c.id}
                              className="text-sm text-red-600 hover:text-red-700 disabled:opacity-50 dark:text-red-400"
                            >
                              {deletingId === c.id ? '삭제 중...' : '삭제'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {totalPages > 1 && (
                  <div className="mt-4 flex flex-col items-center justify-between gap-3 border-t border-zinc-200 pt-4 dark:border-zinc-700 sm:flex-row">
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      페이지 {Math.min(page, totalPages)} / {totalPages} ·{' '}
                      {filteredList.length}곳 중 {(Math.min(page, totalPages) - 1) * PAGE_SIZE + 1}–
                      {Math.min(Math.min(page, totalPages) * PAGE_SIZE, filteredList.length)}곳 표시
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={page <= 1}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-600 dark:text-zinc-100 dark:hover:bg-zinc-700"
                      >
                        이전
                      </button>
                      <button
                        type="button"
                        disabled={page >= totalPages}
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-600 dark:text-zinc-100 dark:hover:bg-zinc-700"
                      >
                        다음
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {regionModalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="region-modal-title"
          >
            <button
              type="button"
              className="absolute inset-0 bg-black/40"
              aria-label="닫기"
              onClick={() => setRegionModalOpen(false)}
            />
            <div className="relative z-10 w-full max-w-md rounded-xl border border-zinc-200 bg-white shadow-lg dark:border-zinc-600 dark:bg-zinc-800">
              <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-600">
                <h2
                  id="region-modal-title"
                  className="text-base font-semibold text-zinc-900 dark:text-zinc-50"
                >
                  권역 검색
                </h2>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  표시할 권역을 선택한 뒤 적용하세요. ESC로 닫을 수 있습니다.
                </p>
              </div>
              <div className="px-4 py-3">
                <input
                  type="search"
                  value={modalRegionQuery}
                  onChange={(e) => setModalRegionQuery(e.target.value)}
                  placeholder="권역 이름 검색"
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
                  autoFocus
                />
                <div className="mt-3 max-h-60 overflow-y-auto rounded-lg border border-zinc-200 dark:border-zinc-600">
                  {modalRegionsFiltered.length === 0 ? (
                    <p className="p-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
                      검색 결과가 없습니다.
                    </p>
                  ) : (
                    <ul className="divide-y divide-zinc-100 dark:divide-zinc-700">
                      {modalRegionsFiltered.map((r) => {
                        const checked = modalDraftRegions.includes(r);
                        const display = r === EMPTY_REGION_LABEL ? '지역 미입력' : r;
                        return (
                          <li key={r}>
                            <label className="flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-700/50">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleDraftRegion(r)}
                                className="h-4 w-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                              />
                              <span className="text-sm text-zinc-800 dark:text-zinc-100">
                                {display}
                              </span>
                            </label>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
                <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                  {modalDraftRegions.length}개 권역 선택됨
                </p>
              </div>
              <div className="flex justify-end gap-2 border-t border-zinc-200 px-4 py-3 dark:border-zinc-600">
                <button
                  type="button"
                  onClick={() => setRegionModalOpen(false)}
                  className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-700"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={applyRegionFilter}
                  className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                >
                  적용
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
