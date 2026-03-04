import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  ListRenderItem,
  TextInput,
  ScrollView,
} from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { fetchGolfCourses } from '../../core/services/courseService';
import type { CourseStackParamList } from '../../app/CourseStack';
import type { GolfCourse } from '../../core/types/course';
import { REGION_GROUPS, matchRegionGroup } from '../../core/constants/regions';
import type { RegionGroupId } from '../../core/constants/regions';

const DEFAULT_REGION: RegionGroupId = '수도권';

type CourseListNav = NativeStackNavigationProp<CourseStackParamList, 'CourseList'>;

export function CourseListScreen(): React.JSX.Element {
  const navigation = useNavigation<CourseListNav>();
  const [list, setList] = useState<GolfCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [selectedRegionId, setSelectedRegionId] = useState<RegionGroupId>(DEFAULT_REGION);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const data = await fetchGolfCourses();
      setList(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : '목록을 불러올 수 없습니다.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(() => load(true), [load]);

  const filteredList = useMemo(() => {
    const q = (searchText ?? '').trim().toLowerCase();
    return list.filter((item) => {
      const name = (item.name ?? '').toLowerCase();
      const region = (item.region ?? '').toLowerCase();
      const address = (item.address ?? '').toLowerCase();
      const matchSearch = !q || name.includes(q) || region.includes(q) || address.includes(q);
      if (!matchSearch) return false;
      // 검색어가 있으면 전체에서 검색(권역 무시), 없으면 선택한 권역만
      if (q) return true;
      return matchRegionGroup(item.region ?? '', selectedRegionId);
    });
  }, [list, searchText, selectedRegionId]);

  const renderItem: ListRenderItem<GolfCourse> = useCallback(
    ({ item }) => (
      <TouchableOpacity
        style={styles.item}
        onPress={() =>
          navigation.navigate('CourseDetail', { courseId: item.id, courseName: item.name })
        }
        activeOpacity={0.7}
      >
        <Text style={styles.itemName}>{item.name}</Text>
        <View style={styles.itemRegionRow}>
          <Text style={styles.itemRegion}>{item.region}</Text>
          {item.address ? (
            <>
              <Text style={styles.itemRegionDot}> · </Text>
              <Text style={styles.itemAddress} numberOfLines={1}>{item.address}</Text>
            </>
          ) : null}
        </View>
      </TouchableOpacity>
    ),
    [navigation]
  );

  const keyExtractor = useCallback((item: GolfCourse) => item.id, []);

  const searchAndFilterHeader = (
    <View style={styles.header}>
      <View style={styles.searchBox}>
        <View style={styles.searchInputWrap}>
          <TextInput
            style={styles.searchInput}
            placeholder="골프장 이름, 지역, 주소 검색"
            placeholderTextColor="#999"
            value={searchText}
            onChangeText={setSearchText}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
          />
          {searchText.length > 0 ? (
            <TouchableOpacity
              style={styles.searchClear}
              onPress={() => setSearchText('')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              activeOpacity={0.7}
            >
              <Text style={styles.searchClearText}>×</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.regionRow}
        style={styles.regionScroll}
        keyboardShouldPersistTaps="handled"
      >
        {REGION_GROUPS.map((r) => (
          <TouchableOpacity
            key={r.id}
            style={[
              styles.regionChip,
              selectedRegionId === r.id && styles.regionChipSelected,
            ]}
            onPress={() => setSelectedRegionId(r.id)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.regionChipText,
                selectedRegionId === r.id && styles.regionChipTextSelected,
              ]}
            >
              {r.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  if (loading && list.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#0a0" />
        <Text style={styles.loadingText}>골프장 목록 불러오는 중...</Text>
      </View>
    );
  }

  if (error && list.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => load()}>
          <Text style={styles.retryText}>다시 시도</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {searchAndFilterHeader}
      <FlatList
        data={filteredList}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={
          filteredList.length === 0 ? styles.emptyList : styles.listContent
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0a0']} />
        }
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            {list.length === 0
              ? '등록된 골프장이 없습니다.\nadmin-web에서 골프장을 추가해 보세요.'
              : '검색·지역 조건에 맞는 골프장이 없습니다.'}
          </Text>
        }
        keyboardShouldPersistTaps="handled"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#f5f5f5',
    paddingTop: 8,
    paddingBottom: 4,
  },
  searchBox: {
    marginHorizontal: 16,
    marginBottom: 8,
  },
  searchInputWrap: {
    position: 'relative',
  },
  searchInput: {
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingRight: 40,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  searchClear: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 28,
  },
  searchClearText: {
    fontSize: 22,
    color: '#888',
    lineHeight: 22,
  },
  regionScroll: {
    maxHeight: 44,
    marginBottom: 8,
  },
  regionRow: {
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  regionChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    marginRight: 2,
  },
  regionChipSelected: {
    backgroundColor: '#0a0',
    borderColor: '#0a0',
  },
  regionChipText: {
    fontSize: 13,
    color: '#444',
    fontWeight: '500',
  },
  regionChipTextSelected: {
    color: '#fff',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  errorText: {
    fontSize: 14,
    color: '#c00',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#0a0',
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: {
    paddingVertical: 8,
    paddingBottom: 24,
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  item: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 4,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
    marginBottom: 4,
  },
  itemRegionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'nowrap',
  },
  itemRegion: {
    fontSize: 13,
    color: '#0a0',
    fontWeight: '500',
  },
  itemRegionDot: {
    fontSize: 13,
    color: '#888',
    fontWeight: '500',
  },
  itemAddress: {
    fontSize: 12,
    color: '#666',
    flex: 1,
  },
});
