import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../features/auth/presentation/pages/splash_page.dart';
import '../../features/auth/presentation/pages/login_page.dart';
import '../../features/auth/presentation/pages/signup_page.dart';
import '../../features/auth/presentation/pages/terms_page.dart';
import '../../features/home/presentation/pages/home_page.dart';
import '../../features/course/presentation/pages/golf_course_list_page.dart';
import '../../features/course/presentation/pages/golf_course_detail_page.dart';
import '../../features/course/presentation/pages/course_detail_page.dart';
import '../../features/round/presentation/pages/round_register_page.dart';
import '../../features/round/presentation/pages/round_list_page.dart';
import '../../features/round/presentation/pages/round_join_page.dart';
import '../../features/round/presentation/pages/round_select_course_page.dart';
import '../../features/round/presentation/pages/round_detail_page.dart';
import '../../features/profile/presentation/pages/profile_page.dart';
import '../auth/auth_state_provider.dart';
import 'routes.dart';
import 'main_shell.dart';

/// 앱 라우터 Provider (하단 네비: 홈 / 라운드 / 코스 / 프로필)
final appRouterProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authStateProvider);

  return GoRouter(
    initialLocation: AppRoutes.splash,
    redirect: (context, state) {
      final isAuthenticated = authState.value != null;
      final isAuthRoute = state.matchedLocation.startsWith('/auth');
      final isSplashRoute = state.matchedLocation == AppRoutes.splash;

      if (isSplashRoute) return null;
      if (!isAuthenticated && !isAuthRoute) return AppRoutes.login;
      if (isAuthenticated && isAuthRoute) return AppRoutes.home;
      if (state.matchedLocation == '/' && isAuthenticated) return AppRoutes.home;
      if (state.matchedLocation == '/' && !isAuthenticated) return AppRoutes.splash;
      return null;
    },
    routes: [
      GoRoute(
        path: AppRoutes.login,
        builder: (context, state) => const LoginPage(),
      ),
      GoRoute(
        path: AppRoutes.signup,
        builder: (context, state) => const SignUpPage(),
      ),
      GoRoute(
        path: AppRoutes.terms,
        builder: (context, state) => const TermsPage(),
      ),
      GoRoute(
        path: AppRoutes.splash,
        builder: (context, state) => const SplashPage(),
      ),
      GoRoute(
        path: '/',
        redirect: (context, state) => AppRoutes.home,
        routes: [
          StatefulShellRoute.indexedStack(
            builder: (context, state, navigationShell) =>
                MainScaffoldWithBottomNav(navigationShell: navigationShell),
            branches: [
              StatefulShellBranch(
                routes: [
                  GoRoute(
                    path: 'home',
                    builder: (context, state) => const HomePage(),
                  ),
                ],
              ),
              StatefulShellBranch(
                routes: [
                  GoRoute(
                    path: 'round',
                    builder: (context, state) => const RoundListPage(),
                    routes: [
                      GoRoute(
                        path: 'list',
                        builder: (context, state) => const RoundListPage(),
                      ),
                      GoRoute(
                        path: 'register',
                        builder: (context, state) => const RoundRegisterPage(),
                      ),
                      GoRoute(
                        path: 'join',
                        builder: (context, state) => const RoundJoinPage(),
                      ),
                      GoRoute(
                        path: 'select-course',
                        builder: (context, state) => const RoundSelectCoursePage(),
                      ),
                      GoRoute(
                        path: ':roundId',
                        builder: (context, state) {
                          final roundId = state.pathParameters['roundId']!;
                          return RoundDetailPage(roundId: roundId);
                        },
                      ),
                    ],
                  ),
                ],
              ),
              StatefulShellBranch(
                routes: [
                  GoRoute(
                    path: 'course',
                    builder: (context, state) => const GolfCourseListPage(),
                    routes: [
                      GoRoute(
                        path: ':golfCourseId',
                        builder: (context, state) {
                          final golfCourseId = state.pathParameters['golfCourseId']!;
                          return GolfCourseDetailPage(golfCourseId: golfCourseId);
                        },
                        routes: [
                          GoRoute(
                            path: ':courseId',
                            builder: (context, state) {
                              final golfCourseId = state.pathParameters['golfCourseId']!;
                              final courseId = state.pathParameters['courseId']!;
                              return CourseDetailPage(courseId: '${golfCourseId}__$courseId');
                            },
                          ),
                        ],
                      ),
                    ],
                  ),
                ],
              ),
              StatefulShellBranch(
                routes: [
                  GoRoute(
                    path: 'profile',
                    builder: (context, state) => const ProfilePage(),
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
    ],
  );
});
