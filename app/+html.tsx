import { ScrollViewStyleReset } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

// 웹 빌드의 루트 HTML 문서를 커스터마이즈한다. 기본 문서는 lang 속성이 없어서
// 크롬이 페이지 언어를 잘못 추측해 "번역하시겠습니까?" 팝업을 계속 띄우는 문제가 있었다.
// lang="ko" + notranslate 메타로 이 팝업 자체를 막는다.
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="ko">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <meta name="google" content="notranslate" />
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
