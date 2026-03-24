'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createGolfCourse } from '@/lib/golfCourses/golfCourseService';
import type { DistanceUnit } from '@/lib/golfCourses/types';
import { DISTANCE_UNITS } from '@/lib/golfCourses/types';

export default function NewCoursePage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [region, setRegion] = useState('');
  const [status, setStatus] = useState('ACTIVE');
  const [distanceUnit, setDistanceUnit] = useState<DistanceUnit>('METER');
  const [address, setAddress] = useState('');
  const [homepage, setHomepage] = useState('');
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const id = await createGolfCourse({
        name: name.trim(),
        region: region.trim(),
        status,
        distanceUnit,
        address: address.trim() || undefined,
        homepage: homepage.trim() || undefined,
        additionalInfo: additionalInfo.trim() || undefined,
      });
      router.replace(`/courses/${id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : '등록에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-800">
        <div className="mx-auto flex h-14 max-w-5xl items-center px-4">
          <Link
            href="/courses"
            className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            ← 코스 목록
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-xl px-4 py-8">
        <h1 className="mb-6 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          새 골프장(CC) 등록
        </h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </div>
          )}
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              골프장명(CC) *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
              placeholder="예: 천룡CC"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              지역 *
            </label>
            <input
              type="text"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              required
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
              placeholder="예: 경기"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              상태
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
            >
              <option value="ACTIVE">활성</option>
              <option value="INACTIVE">비활성</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              거리 단위
            </label>
            <div className="flex items-center gap-6 pt-2">
              {DISTANCE_UNITS.map((unit) => (
                <label key={unit} className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="distanceUnit"
                    checked={distanceUnit === unit}
                    onChange={() => setDistanceUnit(unit)}
                    className="h-4 w-4 border-zinc-300 text-emerald-600 focus:ring-emerald-500 dark:border-zinc-600"
                  />
                  <span className="text-sm text-zinc-700 dark:text-zinc-300">
                    {unit === 'METER' ? 'Meter (m)' : 'Yard (yd)'}
                  </span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              주소 <span className="text-zinc-400">(선택)</span>
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
              placeholder="예: 경기도 양주시..."
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              홈페이지 <span className="text-zinc-400">(선택)</span>
            </label>
            <input
              type="url"
              value={homepage}
              onChange={(e) => setHomepage(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
              placeholder="https://..."
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              추가 정보 <span className="text-zinc-400">(선택)</span>
            </label>
            <textarea
              value={additionalInfo}
              onChange={(e) => setAdditionalInfo(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
              placeholder="메모, 연락처 등"
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {loading ? '등록 중...' : '등록'}
            </button>
            <Link
              href="/courses"
              className="rounded-lg border border-zinc-300 px-4 py-2 font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              취소
            </Link>
          </div>
        </form>
      </main>
    </div>
  );
}
