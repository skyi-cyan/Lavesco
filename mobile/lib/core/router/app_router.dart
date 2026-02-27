import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../features/auth/presentation/pages/splash_page.dart';
import '../../features/auth/presentation/pages/login_page.dart';
import '../../features/auth/presentation/pages/signup_page.dart';
import '../../features/auth/presentation/pages/terms_page.dart';
import '../../features/home/presentation/pages/home_page.dart';
import '../../features/course/presentation/pages/course_list_page.dart';
import '../../features/course/presentation/pages/course_detail_page.dart';
import '../auth/auth_state_provider.dart';
import 'routes.dart';

/// 앱 라우터 Provider
final appRouterProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authStateProvider);

  return GoRouter(
    initialLocation: AppRoutes.splash,
    redirect: (context, state) {
      final isAuthenticated = authState.value != null;
      final isAuthRoute = state.matchedLocation.startsWith('/auth');
      final isSplashRoute = state.matchedLocation == AppRoutes.splash;

      // 스플래시 화면은 항상 허용
      if (isSplashRoute) {
        return null;
      }

      // 로그인되지 않았고 인증 화면이 아니면 로그인으로
      if (!isAuthenticated && !isAuthRoute) {
        return AppRoutes.login;
      }

      // 로그인되었고 인증 화면이면 홈으로
      if (isAuthenticated && isAuthRoute) {
        return AppRoutes.home;
      }

      return null;
    },
    routes: [
      GoRoute(
        path: AppRoutes.splash,
        builder: (context, state) => const SplashPage(),
      ),
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
        path: AppRoutes.home,
        builder: (context, state) => const HomePage(),
      ),
      GoRoute(
        path: AppRoutes.course,
        builder: (context, state) => const CourseListPage(),
        routes: [
          GoRoute(
            path: ':courseId',
            builder: (context, state) {
              final courseId = state.pathParameters['courseId']!;
              return CourseDetailPage(courseId: courseId);
            },
          ),
        ],
      ),
    ],
  );
});
