/**
 * 앱 라우트 상수 (Flutter AppRoutes와 동일 구조)
 */
export const AppRoutes = {
  splash: '/splash',
  login: '/auth/login',
  signup: '/auth/signup',
  terms: '/auth/terms',
  home: '/home',
  round: '/round',
  roundList: '/round/list',
  roundRegister: '/round/register',
  roundJoin: '/round/join',
  roundSelectCourse: '/round/select-course',
  course: '/course',
  profile: '/profile',
} as const;
