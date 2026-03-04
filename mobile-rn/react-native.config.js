/**
 * React Native CLI config.
 * Android packageName을 명시하여 autolinking 생성 코드가 올바른 패키지를 참조하도록 합니다.
 */
module.exports = {
  project: {
    android: {
      packageName: 'com.lavesco.app',
    },
  },
};
