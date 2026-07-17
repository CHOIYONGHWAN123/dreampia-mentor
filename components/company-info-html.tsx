import { createElement, useCallback, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, useColorScheme } from 'react-native';
import WebView from 'react-native-webview';

import { ThemedView } from '@/components/themed-view';

function buildHtmlDocument(contentHtml: string, isDark: boolean) {
  const textColor = isDark ? '#ECEDEE' : '#11181C';
  const linkColor = isDark ? '#A1CEDC' : '#1D3D47';

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <style>
          * { box-sizing: border-box; }
          body {
            margin: 0;
            padding: 0;
            color: ${textColor};
            font-family: -apple-system, Roboto, sans-serif;
            font-size: 16px;
            line-height: 1.6;
            word-break: break-word;
          }
          img { max-width: 100%; height: auto; }
          a { color: ${linkColor}; }
        </style>
      </head>
      <body id="content-body">
        ${contentHtml}
        <script>
          function postHeight() {
            var height = document.getElementById('content-body').scrollHeight;
            window.ReactNativeWebView.postMessage(String(height));
          }
          window.onload = postHeight;
          window.addEventListener('resize', postHeight);
          setTimeout(postHeight, 300);
        </script>
      </body>
    </html>
  `;
}

export function CompanyInfoHtml({ contentHtml }: { contentHtml: string }) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [height, setHeight] = useState(0);

  const handleMessage = useCallback((event: { nativeEvent: { data: string } }) => {
    const nextHeight = Number(event.nativeEvent.data);
    if (!Number.isNaN(nextHeight) && nextHeight > 0) {
      setHeight(nextHeight);
    }
  }, []);

  if (Platform.OS === 'web') {
    return (
      <ThemedView style={styles.container}>
        {createElement('div', { dangerouslySetInnerHTML: { __html: contentHtml } })}
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      {height === 0 && (
        <ActivityIndicator style={styles.loading} />
      )}
      <WebView
        originWhitelist={['*']}
        source={{ html: buildHtmlDocument(contentHtml, isDark) }}
        onMessage={handleMessage}
        style={[styles.webview, { height, backgroundColor: 'transparent' }]}
        scrollEnabled={false}
        nestedScrollEnabled={false}
        androidLayerType="software"
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 40,
  },
  webview: {
    width: '100%',
  },
  loading: {
    marginVertical: 16,
  },
});
