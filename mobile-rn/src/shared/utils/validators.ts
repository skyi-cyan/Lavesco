/** 이메일 형식 검사 */
export function validateEmail(value: string): string | null {
  if (!value?.trim()) return '이메일을 입력해주세요.';
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!re.test(value.trim())) return '올바른 이메일 형식이 아닙니다.';
  return null;
}

/** 비밀번호 최소 6자 */
export function validatePassword(value: string): string | null {
  if (!value) return '비밀번호를 입력해주세요.';
  if (value.length < 6) return '비밀번호는 최소 6자 이상이어야 합니다.';
  return null;
}

/** 비밀번호 확인 */
export function validateConfirmPassword(password: string, confirm: string): string | null {
  if (!confirm) return '비밀번호 확인을 입력해주세요.';
  if (password !== confirm) return '비밀번호가 일치하지 않습니다.';
  return null;
}

/** 닉네임 (필수) */
export function validateNickname(value: string): string | null {
  if (!value?.trim()) return '닉네임을 입력해주세요.';
  return null;
}
