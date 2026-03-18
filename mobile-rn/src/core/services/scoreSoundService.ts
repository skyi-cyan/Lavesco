/**
 * 홀 스코어 저장 시 재생할 사운드 결정 및 재생
 * - 기본: 이글, 버디, 파, 보기, 더블보기, 트리플보기, 양파
 * - 연속 파: 3연속 '3연속 파 세이브', 4연속 '아우디 파', 5연속 '올림픽 파', 6연속 '실력파 파'
 * - 연속 버디: '버디 버디'
 * - 파3·파4·파5 연속 홀에서 버디: '사이클 버디'
 * - MP3 파일이 없거나 재생 실패 시 짧은 진동으로 저장 완료 피드백
 */
import { Platform, Vibration } from 'react-native';
import type { HoleScoreData } from '../types/round';

const SAVE_FEEDBACK_VIBRATION_MS = 50;

const ALL_HOLE_NUMBERS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18'];

/**
 * 실제 타수(그로스). 파를 toPar 0으로 두고 저장할 때 레거시로 strokes=0 이 들어간 경우 해당 홀 par로 간주.
 */
export function grossStrokesForHole(strokes: number | undefined | null, par: number): number {
  if (typeof strokes === 'number' && strokes >= 1) return strokes;
  return par;
}

export type ScoreType = 'eagle' | 'birdie' | 'par' | 'bogey' | 'double' | 'triple' | 'yangpa';

export function getScoreType(strokes: number, par: number): ScoreType | null {
  if (strokes <= 0 || par <= 0) return null;
  const diff = strokes - par;
  if (diff <= -2) return 'eagle';
  if (diff === -1) return 'birdie';
  if (diff === 0) return 'par';
  if (diff === 1) return 'bogey';
  if (diff === 2) return 'double';
  if (diff === 3) return 'triple';
  if (diff >= 4 || strokes >= par * 2) return 'yangpa';
  return null;
}

/** 현재 홀 포함 뒤로 연속 파 개수 */
export function getConsecutivePars(
  holes: Record<string, HoleScoreData>,
  currentHoleNo: string,
  getParForHoleNo: (no: string) => number
): number {
  const idx = ALL_HOLE_NUMBERS.indexOf(currentHoleNo);
  if (idx < 0) return 0;
  let count = 0;
  for (let i = idx; i >= 0; i--) {
    const no = ALL_HOLE_NUMBERS[i];
    const par = getParForHoleNo(no);
    const strokes = grossStrokesForHole(holes[no]?.strokes, par);
    if (strokes === par) count++;
    else break;
  }
  return count;
}

/** 현재 홀 포함 뒤로 연속 버디 개수 */
export function getConsecutiveBirdies(
  holes: Record<string, HoleScoreData>,
  currentHoleNo: string,
  getParForHoleNo: (no: string) => number
): number {
  const idx = ALL_HOLE_NUMBERS.indexOf(currentHoleNo);
  if (idx < 0) return 0;
  let count = 0;
  for (let i = idx; i >= 0; i--) {
    const no = ALL_HOLE_NUMBERS[i];
    const par = getParForHoleNo(no);
    const strokes = grossStrokesForHole(holes[no]?.strokes, par);
    if (strokes === par - 1) count++;
    else break;
  }
  return count;
}

/** 파3·파4·파5 연속 홀에서 각각 버디인지 (현재 홀이 그 3홀 중 하나로 끝나는 경우) */
export function isCycleBirdie(
  holes: Record<string, HoleScoreData>,
  currentHoleNo: string,
  getParForHoleNo: (no: string) => number
): boolean {
  const idx = ALL_HOLE_NUMBERS.indexOf(currentHoleNo);
  if (idx < 2) return false;
  const no1 = ALL_HOLE_NUMBERS[idx - 2];
  const no2 = ALL_HOLE_NUMBERS[idx - 1];
  const no3 = ALL_HOLE_NUMBERS[idx];
  const par1 = getParForHoleNo(no1);
  const par2 = getParForHoleNo(no2);
  const par3 = getParForHoleNo(no3);
  const set = new Set([par1, par2, par3]);
  if (set.size !== 3 || !set.has(3) || !set.has(4) || !set.has(5)) return false;
  const s1 = grossStrokesForHole(holes[no1]?.strokes, par1);
  const s2 = grossStrokesForHole(holes[no2]?.strokes, par2);
  const s3 = grossStrokesForHole(holes[no3]?.strokes, par3);
  return s1 === par1 - 1 && s2 === par2 - 1 && s3 === par3 - 1;
}

/** 재생할 사운드 키 (우선순위: 특수 연속 → 기본 스코어) */
export function getScoreSoundKey(
  holes: Record<string, HoleScoreData>,
  currentHoleNo: string,
  strokes: number,
  getParForHoleNo: (no: string) => number
): string | null {
  const par = getParForHoleNo(currentHoleNo);
  const scoreType = getScoreType(strokes, par);
  if (!scoreType) return null;

  if (scoreType === 'birdie') {
    if (isCycleBirdie(holes, currentHoleNo, getParForHoleNo)) return 'cycle_birdie';
    const birdieCount = getConsecutiveBirdies(holes, currentHoleNo, getParForHoleNo);
    if (birdieCount >= 2) return 'birdie_birdie';
  }

  if (scoreType === 'par') {
    const parCount = getConsecutivePars(holes, currentHoleNo, getParForHoleNo);
    if (parCount >= 6) return 'par_6';
    if (parCount >= 5) return 'par_5';
    if (parCount >= 4) return 'par_4';
    if (parCount >= 3) return 'par_3';
  }

  return scoreType;
}

/** 사운드 키 → Android res/raw 파일명 (소문자, 확장자 제외 시 .mp3 사용) */
const SOUND_FILE_NAMES: Record<string, string> = {
  eagle: 'eagle',
  birdie: 'birdie',
  par: 'par',
  bogey: 'bogey',
  double: 'double_bogey',
  triple: 'triple_bogey',
  yangpa: 'yangpa',
  par_3: 'par_3_streak',
  par_4: 'par_4_audi',
  par_5: 'par_5_olympic',
  par_6: 'par_6_skilled',
  birdie_birdie: 'birdie_birdie',
  cycle_birdie: 'cycle_birdie',
};

let SoundModule: typeof import('react-native-sound') | null = null;
try {
  SoundModule = require('react-native-sound');
} catch {
  // react-native-sound not linked or not installed
}

/**
 * 스코어 저장 성공 후 호출. 결정된 사운드가 있으면 재생, 없거나 실패 시 짧은 진동
 */
export function playScoreSound(
  holes: Record<string, HoleScoreData>,
  currentHoleNo: string,
  strokes: number,
  getParForHoleNo: (no: string) => number
): void {
  const vibrate = () => {
    try {
      Vibration.vibrate(SAVE_FEEDBACK_VIBRATION_MS);
    } catch {
      // 진동 권한 없거나 미지원 시 무시
    }
  };

  try {
    const key = getScoreSoundKey(holes, currentHoleNo, strokes, getParForHoleNo);
    if (!key) {
      vibrate();
      return;
    }
    const fileName = SOUND_FILE_NAMES[key] ?? key;
    if (!SoundModule) {
      vibrate();
      return;
    }

    const Sound = SoundModule.default;
    Sound.setCategory('Playback', true);

    // Android: res/raw/ 아래에 {fileName}.mp3 배치. 리소스 ID는 확장자 제외(소문자).
    // iOS: {fileName}.mp3 를 Xcode Copy Bundle Resources에 추가.
    const isAndroid = Platform.OS === 'android';
    const path = isAndroid ? fileName : `${fileName}.mp3`;
    const basePath = isAndroid ? '' : Sound.MAIN_BUNDLE;

    const tryPlayDefault = () => {
      try {
        const defaultName = 'beep';
        const defaultPath = isAndroid ? defaultName : `${defaultName}.mp3`;
        const defaultSound = new Sound(defaultPath, basePath, (e: Error | null) => {
          if (!e) defaultSound.play(() => defaultSound.release());
          else {
            defaultSound.release();
            vibrate();
          }
        });
      } catch {
        vibrate();
      }
    };

    const sound = new Sound(path, basePath, (err: Error | null) => {
      if (!err) {
        sound.play(() => sound.release());
      } else {
        sound.release();
        tryPlayDefault();
      }
    });
  } catch {
    vibrate();
  }
}
