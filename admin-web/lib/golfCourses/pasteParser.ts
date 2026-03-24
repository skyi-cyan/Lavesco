/**
 * 엑셀에서 복사한 텍스트 파싱 (탭/쉼표 구분)
 * 예상 열: CC, COURSE, HOLE, Black, Blue, White, Red, PAR, HDCP
 */

import type { GolfCourseHoleInput } from './types';

export interface ParsedRow {
  cc: string;
  course: string;
  hole: string;
  black: number;
  blue: number;
  white: number;
  red: number;
  par: number;
  hdcp: number;
}

function isHeaderRow(cells: string[]): boolean {
  if (cells.length < 3) return false;
  const first = (cells[0] ?? '').toLowerCase();
  const second = (cells[1] ?? '').toLowerCase();
  return first === 'cc' || first.includes('골프장') || second === 'course' || second.includes('코스');
}

function toNum(val: string): number {
  const n = parseInt(String(val).replace(/\s/g, ''), 10);
  return Number.isNaN(n) ? 0 : n;
}

/**
 * 엑셀/TSV 붙여넣기 텍스트 파싱
 * @param text 탭 또는 쉼표로 구분된 텍스트
 * @param currentGolfCourseName 현재 골프장명 (일치 여부 확인용, 없으면 빈 문자열)
 * @returns { rows, parseError, skipHeader }
 */
export function parsePastedText(
  text: string,
  currentGolfCourseName: string
): {
  rows: ParsedRow[];
  parseError: string | null;
} {
  const lines = text.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  if (lines.length === 0) {
    return { rows: [], parseError: '붙여넣은 내용이 비어 있습니다.' };
  }

  const rows: ParsedRow[] = [];
  let startIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const cells = line.split(/\t|,/).map((c) => c.trim());
    if (cells.length < 3) continue;

    if (i === 0 && isHeaderRow(cells)) {
      startIndex = 1;
      continue;
    }

    const cc = cells[0] ?? '';
    const course = cells[1] ?? '';
    const hole = String(cells[2] ?? '').replace(/\s/g, '');
    if (!course || !hole) continue;

    const black = toNum(cells[3]);
    const blue = toNum(cells[4]);
    const white = toNum(cells[5]);
    const red = toNum(cells[6]);
    const par = toNum(cells[7]) || 4;
    const hdcp = toNum(cells[8]);

    if (currentGolfCourseName && cc && cc !== currentGolfCourseName) {
      return {
        rows: [],
        parseError: `붙여넣은 데이터의 골프장(CC)이 "${cc}"(으)로, 현재 골프장 "${currentGolfCourseName}"와 다릅니다.`,
      };
    }

    rows.push({
      cc,
      course,
      hole,
      black,
      blue,
      white,
      red,
      par,
      hdcp,
    });
  }

  return { rows, parseError: null };
}

/**
 * 파싱된 행을 코스별 홀 데이터로 변환
 * courseName -> holeNo -> GolfCourseHoleInput
 */
export function rowsToHolesByCourse(rows: ParsedRow[]): Record<string, Record<string, GolfCourseHoleInput>> {
  const byCourse: Record<string, Record<string, GolfCourseHoleInput>> = {};
  for (const r of rows) {
    if (!byCourse[r.course]) {
      byCourse[r.course] = {};
    }
    byCourse[r.course][r.hole] = {
      par: r.par,
      handicapIndex: r.hdcp,
      order: parseInt(r.hole, 10) || 1,
      distances: {
        black: r.black,
        blue: r.blue,
        white: r.white,
        red: r.red,
      },
    };
  }
  return byCourse;
}
