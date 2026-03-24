'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  fetchGolfCourse,
  updateGolfCourse,
  fetchCoursesUnderGolfCourse,
  createCourseUnderGolfCourse,
  updateCourseUnderGolfCourse,
  deleteCourseUnderGolfCourse,
  fetchHolesUnderCourse,
  saveAllHolesUnderCourse,
} from '@/lib/golfCourses/golfCourseService';
import { parsePastedText, rowsToHolesByCourse } from '@/lib/golfCourses/pasteParser';
import type {
  GolfCourse,
  GolfCourseCourse,
  GolfCourseHoleInput,
  DistanceUnit,
} from '@/lib/golfCourses/types';
import { TEE_KEYS, DISTANCE_UNITS } from '@/lib/golfCourses/types';

const HOLE_NUMBERS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
const TEE_LABELS: Record<string, string> = { black: 'Black', blue: 'Blue', white: 'White', red: 'Red' };

type UrlProtocol = 'https' | 'http';

const normalizeCourseUrl = (value: string, defaultProtocol: UrlProtocol = 'https') => {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith('//')) return `${defaultProtocol}:${trimmed}`;
  return `${defaultProtocol}://${trimmed}`;
};

const isValidCourseUrl = (value: string, defaultProtocol: UrlProtocol = 'https') => {
  const normalized = normalizeCourseUrl(value, defaultProtocol);
  if (!normalized) return true;
  try {
    const parsed = new URL(normalized);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

export default function CourseDetailPage() {
  const params = useParams();
  const golfCourseId = params.courseId as string;
  const [golfCourse, setGolfCourse] = useState<GolfCourse | null>(null);
  const [courses, setCourses] = useState<GolfCourseCourse[]>([]);
  const [holesByCourse, setHolesByCourse] = useState<Record<string, Record<string, GolfCourseHoleInput>>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [region, setRegion] = useState('');
  const [status, setStatus] = useState('ACTIVE');
  const [distanceUnit, setDistanceUnit] = useState<DistanceUnit>('METER');
  const [address, setAddress] = useState('');
  const [homepage, setHomepage] = useState('');
  const [defaultUrlProtocol, setDefaultUrlProtocol] = useState<UrlProtocol>('https');
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [newCourseName, setNewCourseName] = useState('');
  const [showAddCourse, setShowAddCourse] = useState(false);
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [pasteParseError, setPasteParseError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const gc = await fetchGolfCourse(golfCourseId);
      if (!gc) {
        setError('골프장을 찾을 수 없습니다.');
        setLoading(false);
        return;
      }
      setGolfCourse(gc);
      setName(gc.name);
      setRegion(gc.region);
      setStatus(gc.status);
      setDistanceUnit(gc.distanceUnit === 'YARD' ? 'YARD' : 'METER');
      setAddress(gc.address ?? '');
      setHomepage(gc.homepage ?? '');
      setAdditionalInfo(gc.additionalInfo ?? '');
      const courseList = await fetchCoursesUnderGolfCourse(golfCourseId);
      setCourses(courseList);
      const holesData: Record<string, Record<string, GolfCourseHoleInput>> = {};
      for (const c of courseList) {
        const holes = await fetchHolesUnderCourse(golfCourseId, c.id);
        const obj: Record<string, GolfCourseHoleInput> = {};
        HOLE_NUMBERS.forEach((no) => {
          obj[no] = holes.get(no) ?? {
            par: 4,
            handicapIndex: 0,
            order: parseInt(no, 10),
            distances: { black: 0, blue: 0, white: 0, red: 0 },
          };
        });
        holesData[c.id] = obj;
      }
      setHolesByCourse(holesData);
    } catch (e) {
      setError(e instanceof Error ? e.message : '불러오기 실패');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [golfCourseId]);

  const handleSaveBasic = async () => {
    if (!golfCourse) return;
    setSaving(true);
    setError('');
    try {
      const normalizedHomepage = normalizeCourseUrl(homepage, defaultUrlProtocol);
      setHomepage(normalizedHomepage);
      await updateGolfCourse(golfCourseId, {
        name,
        region,
        status,
        distanceUnit,
        address,
        homepage: normalizedHomepage,
        additionalInfo,
      });
      setGolfCourse((prev) =>
        prev ? { ...prev, name, region, status, distanceUnit, address, homepage: normalizedHomepage, additionalInfo } : null
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : '저장 실패');
    } finally {
      setSaving(false);
    }
  };

  const handleAddCourse = async () => {
    if (!newCourseName.trim()) return;
    setSaving(true);
    setError('');
    try {
      await createCourseUnderGolfCourse(golfCourseId, { name: newCourseName.trim(), holeCount: 9 });
      setNewCourseName('');
      setShowAddCourse(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : '코스 추가 실패');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCourse = async (courseId: string, courseName: string) => {
    if (!confirm(`"${courseName}" 코스를 삭제하시겠습니까?`)) return;
    setSaving(true);
    try {
      await deleteCourseUnderGolfCourse(golfCourseId, courseId);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : '삭제 실패');
    } finally {
      setSaving(false);
    }
  };

  const updateHole = (
    courseId: string,
    holeNo: string,
    field: keyof GolfCourseHoleInput,
    value: number | Record<string, number>
  ) => {
    setHolesByCourse((prev) => ({
      ...prev,
      [courseId]: {
        ...prev[courseId],
        [holeNo]: { ...prev[courseId]?.[holeNo], [field]: value },
      },
    }));
  };

  const handleSaveHoles = async (courseId: string) => {
    const holes = holesByCourse[courseId];
    if (!holes) return;
    const course = courses.find((c) => c.id === courseId);
    if (course && !isValidCourseUrl(course.courseUrl ?? '', defaultUrlProtocol)) {
      setError(`"${course.name}" 코스 URL 형식이 올바르지 않습니다. (http/https)`);
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (course) {
        await updateCourseUnderGolfCourse(golfCourseId, courseId, {
          courseUrl: normalizeCourseUrl(course.courseUrl ?? '', defaultUrlProtocol),
        });
      }
      await saveAllHolesUnderCourse(golfCourseId, courseId, holes);
    } catch (e) {
      setError(e instanceof Error ? e.message : '홀 저장 실패');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCourseUrl = async (courseId: string) => {
    const course = courses.find((c) => c.id === courseId);
    if (!course) return;
    if (!isValidCourseUrl(course.courseUrl ?? '', defaultUrlProtocol)) {
      setError(`"${course.name}" 코스 URL 형식이 올바르지 않습니다. (http/https)`);
      return;
    }
    setSaving(true);
    setError('');
    try {
      await updateCourseUnderGolfCourse(golfCourseId, courseId, {
        courseUrl: normalizeCourseUrl(course.courseUrl ?? '', defaultUrlProtocol),
      });
      setCourses((prev) =>
        prev.map((c) =>
          c.id === course.id
            ? { ...c, courseUrl: normalizeCourseUrl(c.courseUrl ?? '', defaultUrlProtocol) }
            : c
        )
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : '코스 URL 저장 실패');
    } finally {
      setSaving(false);
    }
  };

  const handlePasteApply = async () => {
    if (!golfCourse) return;
    setPasteParseError(null);
    const { rows, parseError } = parsePastedText(pasteText, name);
    if (parseError) {
      setPasteParseError(parseError);
      return;
    }
    if (rows.length === 0) {
      setPasteParseError('유효한 데이터 행이 없습니다. 열 순서: CC, COURSE, HOLE, Black, Blue, White, Red, PAR, HDCP');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const holesByCourseName = rowsToHolesByCourse(rows);
      const existingCourses = await fetchCoursesUnderGolfCourse(golfCourseId);
      const nameToId: Record<string, string> = {};
      existingCourses.forEach((c) => { nameToId[c.name] = c.id; });

      for (const courseName of Object.keys(holesByCourseName)) {
        let courseId = nameToId[courseName];
        if (!courseId) {
          courseId = await createCourseUnderGolfCourse(golfCourseId, { name: courseName, holeCount: 9 });
          nameToId[courseName] = courseId;
        }
        await saveAllHolesUnderCourse(golfCourseId, courseId, holesByCourseName[courseName]);
      }
      setShowPasteModal(false);
      setPasteText('');
      setPasteParseError(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : '붙여넣기 반영 실패');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  if (!golfCourse) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600 dark:text-red-400">{error || '골프장을 찾을 수 없습니다.'}</p>
        <Link href="/courses" className="mt-4 inline-block text-emerald-600 hover:underline">
          목록으로
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-800">
        <div className="mx-auto flex h-14 max-w-6xl items-center px-4">
          <Link href="/courses" className="text-zinc-600 hover:text-zinc-900 dark:hover:text-zinc-100">
            ← 코스 목록
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}

        {/* 골프장 기본 정보 */}
        <section className="mb-8 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-800">
          <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            골프장(CC) 정보
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm text-zinc-600 dark:text-zinc-400">골프장명</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-zinc-600 dark:text-zinc-400">지역</label>
              <input
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-zinc-600 dark:text-zinc-400">상태</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
              >
                <option value="ACTIVE">활성</option>
                <option value="INACTIVE">비활성</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm text-zinc-600 dark:text-zinc-400">거리 단위</label>
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
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm text-zinc-600 dark:text-zinc-400">주소 <span className="text-zinc-400">(선택)</span></label>
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
                placeholder="예: 경기도 양주시..."
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-zinc-600 dark:text-zinc-400">홈페이지 <span className="text-zinc-400">(선택)</span></label>
              <input
                type="url"
                value={homepage}
                onChange={(e) => setHomepage(e.target.value)}
                onBlur={() => setHomepage(normalizeCourseUrl(homepage, defaultUrlProtocol))}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
                placeholder="https://..."
              />
            </div>
            <div className="sm:col-span-3">
              <label className="mb-1 block text-sm text-zinc-600 dark:text-zinc-400">추가 정보 <span className="text-zinc-400">(선택)</span></label>
              <textarea
                value={additionalInfo}
                onChange={(e) => setAdditionalInfo(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
                placeholder="메모, 연락처 등"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={handleSaveBasic}
            disabled={saving}
            className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {saving ? '저장 중...' : '기본 정보 저장'}
          </button>
        </section>

        {/* 코스(황룡, 청룡 등) + 홀 테이블 */}
        <section className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-800">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                코스별 홀 (COURSE · HOLE · Black/Blue/White/Red · PAR · HDCP)
                <span className="ml-2 text-sm font-normal text-zinc-500 dark:text-zinc-400">
                  거리 단위: {distanceUnit === 'YARD' ? 'Yard (yd)' : 'Meter (m)'}
                </span>
              </h2>
              <div className="mt-1 flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
                <span>URL 자동완성 기본</span>
                <label className="flex items-center gap-1">
                  <input
                    type="radio"
                    name="defaultUrlProtocol"
                    checked={defaultUrlProtocol === 'https'}
                    onChange={() => setDefaultUrlProtocol('https')}
                  />
                  <span>https://</span>
                </label>
                <label className="flex items-center gap-1">
                  <input
                    type="radio"
                    name="defaultUrlProtocol"
                    checked={defaultUrlProtocol === 'http'}
                    onChange={() => setDefaultUrlProtocol('http')}
                  />
                  <span>http://</span>
                </label>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => { setShowPasteModal(true); setPasteParseError(null); setPasteText(''); }}
                className="rounded-lg border border-zinc-400 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-500 dark:text-zinc-300 dark:hover:bg-zinc-700"
              >
                엑셀에서 붙여넣기
              </button>
              {!showAddCourse ? (
                <button
                  type="button"
                  onClick={() => setShowAddCourse(true)}
                  className="rounded-lg border border-emerald-600 px-3 py-1.5 text-sm font-medium text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                >
                  + 코스 추가
                </button>
              ) : null}
            </div>
          </div>
          {showAddCourse ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newCourseName}
                  onChange={(e) => setNewCourseName(e.target.value)}
                  placeholder="예: 황룡, 청룡"
                  className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
                />
                <button
                  type="button"
                  onClick={handleAddCourse}
                  disabled={saving || !newCourseName.trim()}
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  추가
                </button>
                <button
                  type="button"
                  onClick={() => { setShowAddCourse(false); setNewCourseName(''); }}
                  className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-600 dark:text-zinc-400"
                >
                  취소
                </button>
              </div>
            ) : null}

          <div className="mb-4" />

          {courses.length === 0 ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              등록된 코스가 없습니다. 코스 추가 후 홀 정보를 입력하세요.
            </p>
          ) : (
            <div className="space-y-8">
              {courses.map((course) => (
                <div key={course.id} className="rounded-lg border border-zinc-200 dark:border-zinc-600">
                  <div className="flex items-center justify-between border-b border-zinc-200 bg-zinc-50 px-4 py-2 dark:border-zinc-600 dark:bg-zinc-800/50">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="shrink-0 font-medium text-zinc-900 dark:text-zinc-50">
                        {course.name}
                      </span>
                      <div className="flex w-[390px] max-w-full items-center gap-1">
                        <input
                          type="url"
                          value={course.courseUrl ?? ''}
                          onChange={(e) => {
                            const nextUrl = e.target.value;
                            setCourses((prev) =>
                              prev.map((c) => (c.id === course.id ? { ...c, courseUrl: nextUrl } : c))
                            );
                          }}
                          onBlur={() => {
                            setCourses((prev) =>
                              prev.map((c) =>
                                c.id === course.id
                                  ? { ...c, courseUrl: normalizeCourseUrl(c.courseUrl ?? '', defaultUrlProtocol) }
                                  : c
                              )
                            );
                          }}
                          placeholder="코스 URL 입력 (선택)"
                          className="w-full rounded border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
                        />
                        <a
                          href={
                            isValidCourseUrl(course.courseUrl ?? '', defaultUrlProtocol) &&
                            (course.courseUrl ?? '').trim()
                              ? normalizeCourseUrl(course.courseUrl ?? '', defaultUrlProtocol)
                              : undefined
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`${course.name} 코스 URL 열기`}
                          title="새 탭에서 열기"
                          className={`inline-flex h-7 w-7 items-center justify-center rounded border text-xs ${
                            isValidCourseUrl(course.courseUrl ?? '') && (course.courseUrl ?? '').trim()
                              ? 'border-zinc-300 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-700'
                              : 'cursor-not-allowed border-zinc-200 text-zinc-400 dark:border-zinc-700 dark:text-zinc-500'
                          }`}
                          onClick={(e) => {
                            if (
                              !isValidCourseUrl(course.courseUrl ?? '', defaultUrlProtocol) ||
                              !(course.courseUrl ?? '').trim()
                            ) {
                              e.preventDefault();
                            }
                          }}
                        >
                          <svg
                            viewBox="0 0 20 20"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-3.5 w-3.5"
                            aria-hidden="true"
                          >
                            <path
                              d="M11.25 3.75H16.25V8.75M16 4L9 11"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                            <path
                              d="M8.75 4.75H6.25C5.42157 4.75 4.75 5.42157 4.75 6.25V13.75C4.75 14.5784 5.42157 15.25 6.25 15.25H13.75C14.5784 15.25 15.25 14.5784 15.25 13.75V11.25"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </a>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleSaveCourseUrl(course.id)}
                        disabled={saving}
                        className="rounded border border-emerald-600 px-2 py-1 text-xs text-emerald-600 hover:bg-emerald-50 disabled:opacity-50 dark:hover:bg-emerald-900/20"
                      >
                        URL 저장
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveHoles(course.id)}
                        disabled={saving}
                        className="rounded bg-emerald-600 px-2 py-1 text-xs text-white hover:bg-emerald-700 disabled:opacity-50"
                      >
                        홀 저장
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCourse(course.id, course.name)}
                        disabled={saving}
                        className="text-xs text-red-600 hover:underline disabled:opacity-50"
                      >
                        코스 삭제
                      </button>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full table-fixed text-sm">
                      <colgroup>
                        <col className="w-14" />
                        {TEE_KEYS.map((k) => (
                          <col key={k} className="w-20" />
                        ))}
                        <col className="w-16" />
                        <col className="w-16" />
                      </colgroup>
                      <thead>
                        <tr className="border-b border-zinc-200 dark:border-zinc-600">
                          <th className="p-2 text-left font-medium text-zinc-700 dark:text-zinc-300">HOLE</th>
                          {TEE_KEYS.map((k) => (
                            <th key={k} className="p-2 text-right font-medium text-zinc-700 dark:text-zinc-300">
                              {TEE_LABELS[k]} ({distanceUnit === 'YARD' ? 'yd' : 'm'})
                            </th>
                          ))}
                          <th className="p-2 text-center font-medium text-zinc-700 dark:text-zinc-300">PAR</th>
                          <th className="p-2 text-center font-medium text-zinc-700 dark:text-zinc-300">HDCP</th>
                        </tr>
                      </thead>
                      <tbody>
                        {HOLE_NUMBERS.map((no) => {
                          const hole = holesByCourse[course.id]?.[no];
                          if (!hole) return null;
                          return (
                            <tr key={no} className="border-b border-zinc-100 dark:border-zinc-700">
                              <td className="p-2 text-left font-medium text-zinc-900 dark:text-zinc-100">{no}</td>
                              {TEE_KEYS.map((teeKey) => (
                                <td key={teeKey} className="p-2 text-right">
                                  <input
                                    type="number"
                                    min={0}
                                    value={hole.distances[teeKey] ? hole.distances[teeKey] : ''}
                                    onChange={(e) => {
                                      const next = { ...hole.distances, [teeKey]: e.target.value ? Number(e.target.value) : 0 };
                                      updateHole(course.id, no, 'distances', next);
                                    }}
                                    className="w-full rounded border border-zinc-300 px-2 py-0.5 text-right dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
                                  />
                                </td>
                              ))}
                              <td className="p-2 text-center">
                                <input
                                  type="number"
                                  min={3}
                                  max={5}
                                  value={hole.par ? hole.par : ''}
                                  onChange={(e) => updateHole(course.id, no, 'par', Number(e.target.value) || 4)}
                                  className="w-full rounded border border-zinc-300 px-1 py-0.5 text-center dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
                                />
                              </td>
                              <td className="p-2 text-center">
                                <input
                                  type="number"
                                  min={1}
                                  max={18}
                                  value={hole.handicapIndex ? hole.handicapIndex : ''}
                                  onChange={(e) =>
                                    updateHole(course.id, no, 'handicapIndex', e.target.value ? Number(e.target.value) : 0)
                                  }
                                  className="w-full rounded border border-zinc-300 px-1 py-0.5 text-center dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* 엑셀 붙여넣기 모달 */}
      {showPasteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-800">
            <div className="border-b border-zinc-200 p-4 dark:border-zinc-700">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                엑셀에서 코스 정보 붙여넣기
              </h3>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                엑셀에서 복사한 데이터를 그대로 붙여넣으세요. 열 순서: CC, COURSE, HOLE, Black, Blue, White, Red, PAR, HDCP (첫 줄은 헤더여도 됩니다)
              </p>
            </div>
            <div className="p-4">
              <textarea
                value={pasteText}
                onChange={(e) => { setPasteText(e.target.value); setPasteParseError(null); }}
                placeholder={'CC\tCOURSE\tHOLE\tBlack\tBlue\tWhite\tRed\tPAR\tHDCP\n천룡CC\t황룡\t1\t395\t385\t371\t309\t4\t6\n...'}
                rows={12}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 font-mono text-sm dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
              />
              {pasteParseError && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-400">{pasteParseError}</p>
              )}
            </div>
            <div className="flex justify-end gap-2 border-t border-zinc-200 p-4 dark:border-zinc-700">
              <button
                type="button"
                onClick={() => { setShowPasteModal(false); setPasteText(''); setPasteParseError(null); }}
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-700"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handlePasteApply}
                disabled={saving}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {saving ? '반영 중...' : '반영하기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
