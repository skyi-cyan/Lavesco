'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  fetchGolfCourses,
  deleteGolfCourse,
} from '@/lib/golfCourses/golfCourseService';
import type { GolfCourse } from '@/lib/golfCourses/types';

export default function CoursesPage() {
  const [list, setList] = useState<GolfCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
                {list.map((c) => (
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
                      {c.region}
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
        )}
      </main>
    </div>
  );
}
