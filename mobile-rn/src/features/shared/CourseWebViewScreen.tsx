import React, { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Linking,
  Platform,
  TurboModuleRegistry,
} from 'react-native';
import type { ComponentType } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Ionicons from 'react-native-vector-icons/Ionicons';

/** 모바일 리다이렉트(예: /Mobile)를 피하기 위한 데스크톱 Chrome UA */
export const DESKTOP_BROWSER_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36';

export function normalizeExternalUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith('//')) return `https:${trimmed}`;
  return `https://${trimmed}`;
}

export type CourseWebViewParams = {
  url: string;
  title?: string;
};

type Props = NativeStackScreenProps<
  { CourseWebView: CourseWebViewParams },
  'CourseWebView'
>;

type WebViewProps = {
  source: { uri: string };
  style?: object;
  userAgent?: string;
  originWhitelist?: string[];
  javaScriptEnabled?: boolean;
  domStorageEnabled?: boolean;
  sharedCookiesEnabled?: boolean;
  thirdPartyCookiesEnabled?: boolean;
  setSupportMultipleWindows?: boolean;
  onShouldStartLoadWithRequest?: (req: { url: string }) => boolean;
  onLoadStart?: () => void;
  onLoadEnd?: () => void;
  onError?: () => void;
  onHttpError?: (e: { nativeEvent: { statusCode: number } }) => void;
  allowsBackForwardNavigationGestures?: boolean;
};

function isNativeWebViewLinked(): boolean {
  try {
    return TurboModuleRegistry.get('RNCWebViewModule') != null;
  } catch {
    return false;
  }
}

function loadWebViewComponent(): ComponentType<WebViewProps> | null {
  if (!isNativeWebViewLinked()) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('react-native-webview') as {
      default?: ComponentType<WebViewProps>;
      WebView?: ComponentType<WebViewProps>;
    };
    return mod.default ?? mod.WebView ?? null;
  } catch {
    return null;
  }
}

/**
 * 코스 공략도 등 외부 URL을 인앱 WebView(데스크톱 UA)로 표시.
 * 네이티브 모듈이 없으면(재빌드 전) 외부 브라우저로 폴백합니다.
 */
export function CourseWebViewScreen({ route, navigation }: Props): React.JSX.Element {
  const rawUrl = route.params.url ?? '';
  const title = route.params.title?.trim() || '코스 보기';
  const uri = useMemo(() => normalizeExternalUrl(rawUrl), [rawUrl]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [WebViewComp] = useState(() => loadWebViewComponent());

  useLayoutEffect(() => {
    navigation.setOptions({
      title,
      headerRight: () =>
        uri ? (
          <TouchableOpacity
            onPress={() => {
              void Linking.openURL(uri);
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.headerBtn}
            accessibilityLabel="외부 브라우저에서 열기"
          >
            <Ionicons name="open-outline" size={22} color="#1565c0" />
          </TouchableOpacity>
        ) : null,
    });
  }, [navigation, title, uri]);

  useEffect(() => {
    if (!uri || WebViewComp) return;
    // 네이티브 WebView 미포함 빌드 → 즉시 외부 브라우저
    void Linking.openURL(uri);
  }, [uri, WebViewComp]);

  if (!uri) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>유효한 URL이 없습니다.</Text>
      </View>
    );
  }

  if (!WebViewComp) {
    return (
      <View style={styles.centered}>
        <Text style={styles.infoText}>
          인앱 코스 보기를 쓰려면 앱을 다시 설치해야 합니다.{'\n'}
          (react-native-webview 네이티브 모듈)
        </Text>
        <Text style={styles.subText}>지금은 외부 브라우저로 열었습니다.</Text>
        <TouchableOpacity
          style={styles.retryBtn}
          onPress={() => {
            void Linking.openURL(uri);
          }}
        >
          <Text style={styles.retryText}>다시 열기</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.externalBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.externalText}>뒤로</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.retryBtn}
          onPress={() => {
            setError(null);
            setLoading(true);
          }}
        >
          <Text style={styles.retryText}>다시 시도</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.externalBtn}
          onPress={() => {
            void Linking.openURL(uri);
          }}
        >
          <Text style={styles.externalText}>외부 브라우저에서 열기</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const WebView = WebViewComp;

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.loadingOverlay} pointerEvents="none">
          <ActivityIndicator size="large" color="#059669" />
        </View>
      ) : null}
      <WebView
        source={{ uri }}
        style={styles.webview}
        userAgent={DESKTOP_BROWSER_USER_AGENT}
        originWhitelist={['http://*', 'https://*']}
        javaScriptEnabled
        domStorageEnabled
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        setSupportMultipleWindows={false}
        onShouldStartLoadWithRequest={(req) => {
          const u = req.url ?? '';
          if (u.startsWith('http://') || u.startsWith('https://') || u === 'about:blank') {
            return true;
          }
          return false;
        }}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        onError={() => {
          setLoading(false);
          setError('페이지를 불러오지 못했습니다.');
        }}
        onHttpError={(e) => {
          if (e.nativeEvent.statusCode >= 500) {
            setLoading(false);
            setError(`페이지 오류 (${e.nativeEvent.statusCode})`);
          }
        }}
        allowsBackForwardNavigationGestures={Platform.OS === 'ios'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  webview: { flex: 1 },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  errorText: { fontSize: 14, color: '#b91c1c', textAlign: 'center' },
  infoText: { fontSize: 14, color: '#334155', textAlign: 'center', lineHeight: 22 },
  subText: { marginTop: 8, fontSize: 13, color: '#64748b', textAlign: 'center' },
  retryBtn: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#059669',
  },
  retryText: { color: '#fff', fontWeight: '600' },
  externalBtn: { marginTop: 12, padding: 8 },
  externalText: { color: '#1565c0', fontSize: 14, fontWeight: '600' },
  headerBtn: { marginRight: 4, padding: 4 },
});
