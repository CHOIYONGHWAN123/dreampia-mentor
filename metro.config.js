// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// 동의서/PPT/프로필 양식 다운로드용 정적 파일을 번들 에셋으로 포함시키기 위해 확장자를 추가한다.
config.resolver.assetExts.push('hwpx', 'hwp', 'pptx', 'docx');

module.exports = config;
