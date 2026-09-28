import i18n from '../../i18n';

/** Firestore에 저장되는 티타임 값 (언어와 무관하게 고정) */
export const TEE_TIME_OPTIONS = ['1부', '2부', '3부'] as const;

const TEE_TIME_KEYS = ['slot1', 'slot2', 'slot3'] as const;

export function formatTeeTime(value: string): string {
  const index = (TEE_TIME_OPTIONS as readonly string[]).indexOf(value);
  return index >= 0 ? i18n.t(`teeTime.${TEE_TIME_KEYS[index]}`) : value;
}
