import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../../core/models/golf_course.dart';
import '../../../../core/models/course.dart';
import '../../../../core/services/course_provider.dart';
import '../../../../core/services/round_provider.dart';
import '../../../../core/router/routes.dart';

/// 라운드 등록 화면 (3단계: 티타임·티 선택 + 등록 API 연동)
class RoundRegisterPage extends ConsumerStatefulWidget {
  const RoundRegisterPage({super.key});

  @override
  ConsumerState<RoundRegisterPage> createState() => _RoundRegisterPageState();
}

class _RoundRegisterPageState extends ConsumerState<RoundRegisterPage> {
  GolfCourse? _selectedGolfCourse;
  List<Course> _courses = [];
  Course? _frontCourse;
  Course? _backCourse;
  DateTime? _teeTime;
  String? _tee;
  bool _submitting = false;

  final _golfCourseController = TextEditingController();
  bool _loadingCourses = false;

  static const List<String> _teeOptions = ['Black', 'Blue', 'White', 'Red'];
  static final DateFormat _teeTimeDisplayFormat = DateFormat('yyyy년 M월 d일 HH:mm');
  static final DateFormat _teeTimeStorageFormat = DateFormat('yyyy-MM-dd HH:mm');

  Future<void> _pickTeeTime() async {
    final now = DateTime.now();
    final initial = _teeTime ?? now;
    final result = await showModalBottomSheet<DateTime>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (ctx) => _TeeTimePickerSheet(initial: initial),
    );
    if (result != null && mounted) setState(() => _teeTime = result);
  }

  Future<void> _submit() async {
    if (_selectedGolfCourse == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('골프장을 선택하세요.')),
      );
      return;
    }
    if (_frontCourse == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('전반코스를 선택하세요.')),
      );
      return;
    }
    if (_teeTime == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('티타임을 선택하세요.')),
      );
      return;
    }
    if (_tee == null || _tee!.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('티를 선택하세요.')),
      );
      return;
    }

    setState(() => _submitting = true);
    try {
      final service = ref.read(roundServiceProvider);
      final back = _backCourse;
      final holesCount = (back != null && back.id != _frontCourse!.id)
          ? 18
          : _frontCourse!.holesCount;
      final courseName = back != null
          ? '${_frontCourse!.name} / ${back.name}'
          : _frontCourse!.name;

      final result = await service.createRound(
        courseId: _frontCourse!.id,
        courseName: courseName,
        region: _selectedGolfCourse!.region,
        holesCount: holesCount,
        date: _teeTime,
        teeTime: _teeTimeStorageFormat.format(_teeTime!),
        tee: _tee,
        backCourseId: back?.id,
        backCourseName: back?.name,
        golfCourseName: _selectedGolfCourse!.name,
      );
      if (!mounted) return;
      ref.invalidate(myRoundsProvider);
      context.go(AppRoutes.roundList);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('라운드가 등록되었습니다. 라운드 번호: ${result.roundNo}')),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString().replaceAll('Exception: ', ''))),
      );
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  void _openGolfCoursePicker() {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (ctx) => _GolfCoursePickerSheet(
        onSelect: (gc) {
          Navigator.pop(ctx);
          _selectGolfCourse(gc);
        },
      ),
    );
  }

  Future<void> _selectGolfCourse(GolfCourse gc) async {
    final courseService = ref.read(courseServiceProvider);
    final golfCourseId = gc.id;

    setState(() {
      _selectedGolfCourse = gc;
      _courses = [];
      _frontCourse = null;
      _backCourse = null;
      _loadingCourses = true;
    });

    GolfCourse? fullGc;
    try {
      fullGc = await courseService.getGolfCourse(golfCourseId);
    } catch (_) {
      fullGc = gc;
    }
    if (!mounted) return;

    List<Course> list;
    try {
      list = await courseService.getCoursesUnderGolfCourse(golfCourseId);
    } catch (_) {
      list = [];
    }
    if (!mounted) return;

    final resolvedGc = fullGc ?? gc;
    _golfCourseController.text = resolvedGc.name;
    setState(() {
      _selectedGolfCourse = resolvedGc;
      _courses = list;
      _loadingCourses = false;
    });
  }

  @override
  void dispose() {
    _golfCourseController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('라운드 등록'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.go(AppRoutes.home),
        ),
        actions: [
          TextButton(
            onPressed: () => context.go(AppRoutes.roundList),
            child: const Text('라운드 목록'),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              '골프장을 선택하세요.',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    color: Theme.of(context).colorScheme.primary,
                    fontWeight: FontWeight.w600,
                  ),
            ),
            const SizedBox(height: 24),
            // 골프장명* — 탭 시 바텀시트에서 검색·선택
            InkWell(
              onTap: _openGolfCoursePicker,
              borderRadius: BorderRadius.circular(12),
              child: InputDecorator(
                decoration: InputDecoration(
                  labelText: '골프장명 *',
                  hintText: '탭하여 골프장 선택',
                  prefixIcon: const Icon(Icons.search),
                  suffixIcon: _selectedGolfCourse != null
                      ? IconButton(
                          icon: const Icon(Icons.clear),
                          onPressed: () {
                            setState(() {
                              _selectedGolfCourse = null;
                              _golfCourseController.clear();
                              _courses = [];
                              _frontCourse = null;
                              _backCourse = null;
                            });
                          },
                        )
                      : null,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: Text(
                  _golfCourseController.text.isEmpty
                      ? ''
                      : _golfCourseController.text,
                  style: TextStyle(
                    color: _golfCourseController.text.isEmpty
                        ? Theme.of(context).colorScheme.onSurfaceVariant
                        : Theme.of(context).colorScheme.onSurface,
                  ),
                ),
              ),
            ),
            const SizedBox(height: 20),
            // 전반코스*
            DropdownButtonFormField<Course?>(
              value: _frontCourse,
              decoration: InputDecoration(
                labelText: '전반코스 *',
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              hint: Text(
                _loadingCourses ? '불러오는 중...' : '선택',
                style: TextStyle(
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
              ),
              items: [
                DropdownMenuItem<Course?>(
                  value: null,
                  child: Text(
                    '선택',
                    style: TextStyle(
                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                    ),
                  ),
                ),
                ..._courses.map((c) => DropdownMenuItem<Course?>(
                      value: c,
                      child: Text(
                        c.name,
                        style: TextStyle(
                          color: Theme.of(context).colorScheme.onSurface,
                        ),
                      ),
                    )),
              ],
              onChanged: _courses.isEmpty
                  ? null
                  : (v) => setState(() {
                        _frontCourse = v;
                        if (_backCourse == v) _backCourse = null;
                      }),
            ),
            const SizedBox(height: 20),
            // 후반코스*
            DropdownButtonFormField<Course?>(
              value: _backCourse,
              decoration: InputDecoration(
                labelText: '후반코스 *',
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              hint: Text(
                '선택 (18홀 시 후반 코스)',
                style: TextStyle(
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
              ),
              items: [
                const DropdownMenuItem<Course?>(
                  value: null,
                  child: Text('없음 (9홀)'),
                ),
                ..._courses
                    .where((c) => c.id != _frontCourse?.id)
                    .map((c) => DropdownMenuItem<Course?>(
                          value: c,
                          child: Text(
                            c.name,
                            style: TextStyle(
                              color: Theme.of(context).colorScheme.onSurface,
                            ),
                          ),
                        )),
              ],
              onChanged: _courses.isEmpty ? null : (v) => setState(() => _backCourse = v),
            ),
            const SizedBox(height: 20),
            // 티타임* (날짜·시간 선택)
            InkWell(
              onTap: _pickTeeTime,
              borderRadius: BorderRadius.circular(12),
              child: InputDecorator(
                decoration: InputDecoration(
                  labelText: '티타임 *',
                  hintText: '날짜·시간 선택',
                  prefixIcon: const Icon(Icons.calendar_today),
                  suffixIcon: _teeTime != null
                      ? IconButton(
                          icon: const Icon(Icons.clear),
                          onPressed: () => setState(() => _teeTime = null),
                        )
                      : const Icon(Icons.chevron_right),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: Text(
                  _teeTime != null
                      ? _teeTimeDisplayFormat.format(_teeTime!)
                      : '',
                  style: TextStyle(
                    color: _teeTime != null
                        ? Theme.of(context).colorScheme.onSurface
                        : Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
                ),
              ),
            ),
            const SizedBox(height: 20),
            // 티*
            DropdownButtonFormField<String>(
              value: _tee,
              decoration: InputDecoration(
                labelText: '티 *',
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              hint: Text(
                '선택',
                style: TextStyle(
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
              ),
              items: _teeOptions
                  .map((t) => DropdownMenuItem(
                        value: t,
                        child: Text(
                          t,
                          style: TextStyle(
                            color: Theme.of(context).colorScheme.onSurface,
                          ),
                        ),
                      ))
                  .toList(),
              onChanged: (v) => setState(() => _tee = v),
            ),
            const SizedBox(height: 32),
            FilledButton(
              onPressed: _submitting ? null : _submit,
              style: FilledButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 16),
              ),
              child: _submitting
                  ? const SizedBox(
                      height: 24,
                      width: 24,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Text('등록하기'),
            ),
          ],
        ),
      ),
    );
  }
}

/// 골프장 선택 바텀시트 (검색 + 목록)
class _GolfCoursePickerSheet extends ConsumerStatefulWidget {
  final void Function(GolfCourse) onSelect;

  const _GolfCoursePickerSheet({required this.onSelect});

  @override
  ConsumerState<_GolfCoursePickerSheet> createState() => _GolfCoursePickerSheetState();
}

class _GolfCoursePickerSheetState extends ConsumerState<_GolfCoursePickerSheet> {
  final _searchController = TextEditingController();
  List<GolfCourse> _list = [];
  bool _searching = false;
  Timer? _debounce;
  static const _debounceDuration = Duration(milliseconds: 350);

  @override
  void initState() {
    super.initState();
    _load(null);
    _searchController.addListener(_onSearchChanged);
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _searchController.dispose();
    super.dispose();
  }

  void _onSearchChanged() {
    _debounce?.cancel();
    _debounce = Timer(_debounceDuration, () {
      _load(_searchController.text.trim());
    });
  }

  Future<void> _load(String? nameQuery) async {
    setState(() => _searching = true);
    final courseService = ref.read(courseServiceProvider);
    final list = await courseService.getGolfCourses(nameQuery: nameQuery);
    if (!mounted) return;
    setState(() {
      _list = list;
      _searching = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      initialChildSize: 0.6,
      minChildSize: 0.4,
      maxChildSize: 0.9,
      expand: false,
      builder: (context, scrollController) {
        return Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
              child: Row(
                children: [
                  Text(
                    '골프장 선택',
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          color: Theme.of(context).colorScheme.primary,
                          fontWeight: FontWeight.w600,
                        ),
                  ),
                  const Spacer(),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: TextField(
                controller: _searchController,
                decoration: InputDecoration(
                  hintText: '골프장명 또는 지역으로 검색',
                  prefixIcon: const Icon(Icons.search),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 8),
            Expanded(
              child: _searching
                  ? const Center(child: CircularProgressIndicator())
                  : _list.isEmpty
                      ? Center(
                          child: Text(
                            '검색 결과가 없습니다.',
                            style: TextStyle(
                              color: Theme.of(context).colorScheme.onSurfaceVariant,
                            ),
                          ),
                        )
                      : ListView.builder(
                          controller: scrollController,
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                          itemCount: _list.length,
                          itemBuilder: (context, index) {
                            final gc = _list[index];
                            return ListTile(
                              leading: Icon(
                                Icons.golf_course,
                                color: Theme.of(context).colorScheme.primary,
                              ),
                              title: Text(gc.name),
                              subtitle: gc.region.isNotEmpty ? Text(gc.region) : null,
                              onTap: () => widget.onSelect(gc),
                            );
                          },
                        ),
            ),
          ],
        );
      },
    );
  }
}

/// 티타임 한 화면 선택 (날짜 + 시간)
class _TeeTimePickerSheet extends StatefulWidget {
  final DateTime initial;

  const _TeeTimePickerSheet({required this.initial});

  @override
  State<_TeeTimePickerSheet> createState() => _TeeTimePickerSheetState();
}

class _TeeTimePickerSheetState extends State<_TeeTimePickerSheet> {
  late DateTime _selectedDate;
  late int _hour;
  late int _minute;

  static const _minYear = 2024;
  static const _maxYear = 2028;
  static const _minHour = 5;
  static const _maxHour = 20;

  @override
  void initState() {
    super.initState();
    _selectedDate = DateTime(widget.initial.year, widget.initial.month, widget.initial.day);
    _hour = widget.initial.hour.clamp(_minHour, _maxHour);
    _minute = widget.initial.minute.clamp(0, 59);
  }

  DateTime get _result =>
      DateTime(_selectedDate.year, _selectedDate.month, _selectedDate.day, _hour, _minute);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
      ),
      child: SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
              child: Row(
                children: [
                  Text(
                    '티타임 선택',
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          color: Theme.of(context).colorScheme.primary,
                          fontWeight: FontWeight.w600,
                        ),
                  ),
                  const Spacer(),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
            ),
            const Divider(height: 1),
            Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(
                    '날짜',
                    style: Theme.of(context).textTheme.titleSmall?.copyWith(
                          color: Theme.of(context).colorScheme.primary,
                        ),
                  ),
                  const SizedBox(height: 8),
                  CalendarDatePicker(
                    initialDate: _selectedDate,
                    firstDate: DateTime(_minYear, 1, 1),
                    lastDate: DateTime(_maxYear, 12, 31),
                    currentDate: DateTime.now(),
                    onDateChanged: (date) => setState(() => _selectedDate = date),
                  ),
                  const SizedBox(height: 20),
                  Text(
                    '시간',
                    style: Theme.of(context).textTheme.titleSmall?.copyWith(
                          color: Theme.of(context).colorScheme.primary,
                        ),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(
                        child: DropdownButtonFormField<int>(
                          value: _hour,
                          decoration: const InputDecoration(
                            labelText: '시',
                            border: OutlineInputBorder(),
                          ),
                          items: List.generate(
                            _maxHour - _minHour + 1,
                            (i) => DropdownMenuItem(
                              value: _minHour + i,
                              child: Text(
                                '${_minHour + i}시',
                              ),
                            ),
                          ),
                          onChanged: (v) {
                            if (v != null) setState(() => _hour = v);
                          },
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: DropdownButtonFormField<int>(
                          value: _minute,
                          decoration: const InputDecoration(
                            labelText: '분',
                            border: OutlineInputBorder(),
                          ),
                          items: List.generate(
                            60,
                            (i) => DropdownMenuItem(
                              value: i,
                              child: Text('${i.toString().padLeft(2, '0')}분'),
                            ),
                          ),
                          onChanged: (v) {
                            if (v != null) setState(() => _minute = v);
                          },
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton(
                          onPressed: () => Navigator.pop(context),
                          child: const Text('취소'),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: FilledButton(
                          onPressed: () => Navigator.pop(context, _result),
                          child: const Text('확인'),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
