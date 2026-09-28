import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ko } from './locales/ko';
import { en } from './locales/en';
import { ja } from './locales/ja';

export const SUPPORTED_LANGUAGES = ['ko', 'en', 'ja'] as const;
export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number];

const STORAGE_KEY = 'appLanguage';

const DATE_LOCALES: Record<AppLanguage, string> = {
  ko: 'ko-KR',
  en: 'en-US',
  ja: 'ja-JP',
};

function isAppLanguage(value: unknown): value is AppLanguage {
  return (SUPPORTED_LANGUAGES as readonly unknown[]).includes(value);
}

/** 기기 언어가 한국어·일본어면 해당 언어, 그 외에는 en */
function detectDeviceLanguage(): AppLanguage {
  try {
    const prefix = (Intl.DateTimeFormat().resolvedOptions().locale ?? '')
      .toLowerCase()
      .slice(0, 2);
    return isAppLanguage(prefix) ? prefix : 'en';
  } catch {
    return 'ko';
  }
}

i18n.use(initReactI18next).init({
  resources: {
    ko: { translation: ko },
    en: { translation: en },
    ja: { translation: ja },
  },
  lng: detectDeviceLanguage(),
  fallbackLng: 'ko',
  interpolation: { escapeValue: false },
  // 리소스를 코드에 포함하므로 첫 렌더 전에 번역이 준비되도록 동기 초기화
  initAsync: false,
});

/** 사용자가 MY 화면에서 고른 언어가 있으면 적용 (없으면 기기 언어 유지) */
export async function loadSavedLanguage(): Promise<void> {
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEY);
    if (isAppLanguage(saved) && saved !== i18n.language) {
      await i18n.changeLanguage(saved);
    }
  } catch {
    // 저장소를 읽지 못해도 기기 언어로 계속 동작
  }
}

export async function setAppLanguage(language: AppLanguage): Promise<void> {
  await i18n.changeLanguage(language);
  try {
    await AsyncStorage.setItem(STORAGE_KEY, language);
  } catch {
    // 저장 실패 시 이번 실행 동안만 적용
  }
}

export function getAppLanguage(): AppLanguage {
  return isAppLanguage(i18n.language) ? i18n.language : 'ko';
}

/** toLocaleString 등에 넘길 BCP 47 로캘 */
export function getDateLocale(): string {
  return DATE_LOCALES[getAppLanguage()];
}

export default i18n;
