import i18n from '../../i18n';

/** 이메일 형식 검사 */
export function validateEmail(value: string): string | null {
  if (!value?.trim()) return i18n.t('validation.emailRequired');
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!re.test(value.trim())) return i18n.t('validation.emailInvalid');
  return null;
}

/** 비밀번호 최소 6자 */
export function validatePassword(value: string): string | null {
  if (!value) return i18n.t('validation.passwordRequired');
  if (value.length < 6) return i18n.t('validation.passwordMin');
  return null;
}

/** 비밀번호 확인 */
export function validateConfirmPassword(password: string, confirm: string): string | null {
  if (!confirm) return i18n.t('validation.confirmPasswordRequired');
  if (password !== confirm) return i18n.t('validation.passwordMismatch');
  return null;
}

/** 닉네임 (필수) */
export function validateNickname(value: string): string | null {
  if (!value?.trim()) return i18n.t('validation.nicknameRequired');
  return null;
}
