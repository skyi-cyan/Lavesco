import { Alert, Linking, PermissionsAndroid, Platform } from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import i18n from '../../i18n';

export type GpsPoint = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
};

function geolocationErrorMessage(code: number): string {
  switch (code) {
    case 1:
      return i18n.t('location.permissionDenied');
    case 2:
      return i18n.t('location.positionUnavailable');
    case 3:
      return i18n.t('location.timeout');
    default:
      return i18n.t('location.unavailable');
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
      title: i18n.t('location.permissionTitle'),
      message: i18n.t('location.permissionMessage'),
      buttonPositive: i18n.t('location.allow'),
      buttonNegative: i18n.t('location.deny'),
    }
  );
  return granted === PermissionsAndroid.RESULTS.GRANTED;
}

export function promptOpenSettings(): void {
  Alert.alert(
    i18n.t('location.permissionRequired'),
    i18n.t('location.openSettingsMessage'),
    [
      { text: i18n.t('common.cancel'), style: 'cancel' },
      { text: i18n.t('location.openSettings'), onPress: () => Linking.openSettings() },
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
