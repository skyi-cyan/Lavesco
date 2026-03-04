/**
 * 골프장 지역 구분 — 목록 필터용 (전체 없음, 기본 진입은 수도권)
 * Firestore의 region 값이 권역 id 또는 아래 키워드에 포함되면 해당 그룹으로 매칭
 */
export const REGION_GROUPS = [
  { id: '수도권', label: '수도권', keywords: ['수도권', '서울', '경기', '인천'] },
  { id: '강원', label: '강원', keywords: ['강원'] },
  { id: '충청', label: '충청', keywords: ['충청', '충북', '충남', '대전', '세종'] },
  { id: '경상', label: '경상', keywords: ['경상', '경북', '경남', '대구', '부산', '울산'] },
  { id: '제주', label: '제주', keywords: ['제주'] },
  { id: '전라', label: '전라', keywords: ['전라', '전북', '전남', '광주'] },
] as const;

export type RegionGroupId = (typeof REGION_GROUPS)[number]['id'];

/** 코스 메뉴 진입 시 기본 선택 권역 */
export const DEFAULT_REGION_ID: RegionGroupId = '수도권';

/**
 * 선택한 지역 그룹에 해당하는지 여부
 */
export function matchRegionGroup(regionValue: string, groupId: RegionGroupId): boolean {
  const group = REGION_GROUPS.find((g) => g.id === groupId);
  if (!group || !('keywords' in group)) return true;
  const normalized = regionValue.trim();
  if (!normalized) return false;
  return group.keywords.some(
    (kw) => normalized.includes(kw) || (normalized.length <= kw.length && kw.includes(normalized))
  );
}
