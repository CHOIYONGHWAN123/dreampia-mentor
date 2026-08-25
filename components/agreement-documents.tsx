import { useState } from "react";
import {
  Image,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { SignaturePad } from "@/components/signature-pad";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { supabase } from "@/lib/supabase";

export type ConsentDocKey =
  | "criminalRecordConsent"
  | "adminInfoConsent"
  | "contract";

// 페이지 이미지는 실제 서식 PDF를 미리 렌더링해 번들에 넣어둔 것이다(플랫폼별 PDF 뷰어
// 의존성 없이 웹/iOS/Android 모두 동일하게 보여주기 위함). 서식이 바뀌면 이 이미지도 새로
// 렌더링해서 교체해야 한다.
const DOCUMENTS: { key: ConsentDocKey; title: string; images: number[] }[] = [
  {
    key: "criminalRecordConsent",
    title: "성범죄 및 아동학대관련범죄 전력 조회 동의서",
    images: [
      require("@/assets/templates/preview/criminal-record-consent-1.png"),
    ],
  },
  {
    key: "adminInfoConsent",
    title: "행정정보 공동이용 사전동의서",
    images: [require("@/assets/templates/preview/admin-info-consent-1.png")],
  },
  {
    key: "contract",
    title: "강사계약서",
    images: [
      require("@/assets/templates/preview/contract-1.png"),
      require("@/assets/templates/preview/contract-2.png"),
      require("@/assets/templates/preview/contract-3.png"),
      require("@/assets/templates/preview/contract-4.png"),
    ],
  },
];

export function AgreementDocuments({
  signature,
  onChange,
  existingFileUrls = null,
}: {
  signature: string | null;
  onChange: (signature: string | null) => void;
  existingFileUrls?: Partial<Record<ConsentDocKey, string | null>> | null;
}) {
  const [previewKey, setPreviewKey] = useState<ConsentDocKey | null>(null);
  const [viewingKey, setViewingKey] = useState<ConsentDocKey | null>(null);
  const previewDoc = DOCUMENTS.find((d) => d.key === previewKey) ?? null;
  const hasAnyExisting = DOCUMENTS.some((d) => existingFileUrls?.[d.key]);

  const handleViewExisting = async (key: ConsentDocKey) => {
    const path = existingFileUrls?.[key];
    if (!path) return;
    setViewingKey(key);
    try {
      const { data, error } = await supabase.storage
        .from("consent-file")
        .createSignedUrl(path, 60 * 5);
      if (error || !data) return;
      Linking.openURL(data.signedUrl);
    } finally {
      setViewingKey(null);
    }
  };

  return (
    <ThemedView style={styles.container}>
      {DOCUMENTS.map((doc) => (
        <ThemedView key={doc.key} style={styles.docRow}>
          <ThemedText style={styles.docTitle}>{doc.title}</ThemedText>
          <ThemedView style={styles.docActions}>
            <TouchableOpacity
              onPress={() => setPreviewKey(doc.key)}
              hitSlop={8}
            >
              <ThemedText type="link" style={styles.actionText}>
                미리보기
              </ThemedText>
            </TouchableOpacity>
            {!!existingFileUrls?.[doc.key] && (
              <TouchableOpacity
                onPress={() => handleViewExisting(doc.key)}
                hitSlop={8}
                disabled={viewingKey === doc.key}
              >
                <ThemedText type="link" style={styles.actionText}>
                  {viewingKey === doc.key ? "불러오는 중…" : "제출된 서류 보기"}
                </ThemedText>
              </TouchableOpacity>
            )}
          </ThemedView>
        </ThemedView>
      ))}

      <ThemedText style={styles.label}>
        {hasAnyExisting
          ? "다시 서명하려면 위 서류 내용을 확인 후 아래에 서명해주세요"
          : "위 서류 3종 내용에 모두 동의하면 아래에 서명해주세요"}
      </ThemedText>
      <SignaturePad onChange={onChange} />

      <Modal
        visible={previewDoc !== null}
        animationType="slide"
        onRequestClose={() => setPreviewKey(null)}
      >
        <SafeAreaView style={styles.modalSafeArea}>
          <View style={styles.modalHeader}>
            <ThemedText
              type="subtitle"
              style={styles.modalTitle}
              numberOfLines={1}
            >
              {previewDoc?.title}
            </ThemedText>
            <TouchableOpacity onPress={() => setPreviewKey(null)} hitSlop={8}>
              <ThemedText type="link">닫기</ThemedText>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalScroll}>
            {previewDoc?.images.map((src, i) => (
              <View key={i} style={styles.pageWrap}>
                <Image
                  source={src}
                  style={styles.pageImage}
                  resizeMode="contain"
                />
              </View>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  docRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  docTitle: {
    flex: 1,
    fontSize: 13,
  },
  docActions: {
    flexDirection: "row",
    gap: 12,
  },
  actionText: {
    fontSize: 12,
  },
  label: {
    fontSize: 12,
    opacity: 0.6,
  },
  modalSafeArea: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  modalTitle: {
    flex: 1,
    marginRight: 12,
  },
  modalScroll: {
    padding: 12,
    gap: 12,
  },
  pageWrap: {
    width: "100%",
    aspectRatio: 210 / 297,
    marginBottom: 12,
  },
  pageImage: {
    width: "100%",
    height: "100%",
  },
});
