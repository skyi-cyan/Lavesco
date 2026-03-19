/**
 * @format
 */

import { AppRegistry } from 'react-native';
// Firebase Storage 네임스페이스 등록 — getApp().storage() / profile 업로드 전에 반드시 로드
import '@react-native-firebase/storage';
import App from './src/app/App';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);
