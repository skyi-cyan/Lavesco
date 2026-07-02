import { Alert, Linking, PermissionsAndroid, Platform } from 'react-native';
import Geolocation from 'react-native-geolocation-service';

export type GpsPoint = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
};

function geolocationErrorMessage(code: number): string {
  switch (code) {
    case 1:
      return '위치 권한이 거부되었습니다.';
    case 2:
      return '위치를 사용할 수 없습니다. GPS를 켜 주세요.';
    case 3:
      return '위치 신호 수신 시간이 초과되었습니다. 다시 시도해 주세요.';
    default:
      return '위치를 가져오지 못했습니다.';
  }
}

export async function requestLocationPermission(): Promise<boolean> {
  if (Platform.OS === 'ios') {
    const status = await Geolocation.requestAuthorization('whenInUse');
    return status === 'granted';
  }

  const granted = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    {
      title: '위치 권한',
      message: '샷 시작점과 볼 위치를 측정하기 위해 위치 정보가 필요합니다.',
      buttonPositive: '허용',
      buttonNegative: '거부',
    }
  );
  return granted === PermissionsAndroid.RESULTS.GRANTED;
}

export function promptOpenSettings(): void {
  Alert.alert(
    '위치 권한 필요',
    '설정에서 위치 권한을 허용해 주세요.',
    [
      { text: '취소', style: 'cancel' },
      { text: '설정 열기', onPress: () => Linking.openSettings() },
    ]
  );
}

export async function getCurrentGpsPosition(): Promise<GpsPoint> {
  const permitted = await requestLocationPermission();
  if (!permitted) {
    throw new Error('LOCATION_PERMISSION_DENIED');
  }

  return new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy ?? null,
        });
      },
      (error) => {
        reject(new Error(geolocationErrorMessage(error.code)));
      },
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 0,
        forceRequestLocation: true,
        showLocationDialog: true,
      }
    );
  });
}
