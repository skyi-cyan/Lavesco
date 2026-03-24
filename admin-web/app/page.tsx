'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';

export default function Home() {
  const router = useRouter();
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    router.replace('/login');
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-800">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Lavesco 관리자
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-zinc-500 dark:text-zinc-400">
              {user?.email}
            </span>
            <button
              type="button"
              onClick={handleSignOut}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-zinc-200"
            >
              로그아웃
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        <h2 className="mb-6 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          대시보드
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Link
            href="/courses"
            className="flex items-center gap-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm transition-colors hover:border-emerald-200 hover:bg-emerald-50/50 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:border-emerald-800 dark:hover:bg-emerald-900/20"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-100 text-2xl dark:bg-emerald-900/50">
              ⛳
            </div>
            <div>
              <p className="font-medium text-zinc-900 dark:text-zinc-50">
                코스 관리
              </p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                골프장·코스 등록 및 수정
              </p>
            </div>
          </Link>
          <Link
            href="/course-requests"
            className="flex items-center gap-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm transition-colors hover:border-sky-200 hover:bg-sky-50/50 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:border-sky-800 dark:hover:bg-sky-900/20"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-sky-100 text-2xl dark:bg-sky-900/50">
              📬
            </div>
            <div>
              <p className="font-medium text-zinc-900 dark:text-zinc-50">
                코스 추가 요청
              </p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                앱 사용자 요청 조회·답변
              </p>
            </div>
          </Link>
          <Link
            href="/users"
            className="flex items-center gap-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm transition-colors hover:border-violet-200 hover:bg-violet-50/50 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:border-violet-800 dark:hover:bg-violet-900/20"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-violet-100 text-2xl dark:bg-violet-900/50">
              👥
            </div>
            <div>
              <p className="font-medium text-zinc-900 dark:text-zinc-50">
                사용자 관리
              </p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                사용자 목록 조회 및 계정 상태 관리
              </p>
            </div>
          </Link>
        </div>
      </main>
    </div>
  );
}
