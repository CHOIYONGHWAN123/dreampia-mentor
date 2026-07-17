@AGENTS.md

# Dreampia 멘토 앱 claude.md

## 프로젝트 개요
드림피아(Dreampia) 멘토 앱은 진로 수업을 진행하는 강사(멘토)들이 사용하는 모바일 앱이다.
**관리자 웹(admin)과 동일한 Supabase 프로젝트를 공유**하며, 강사 입장에서 아래 두 가지를 처리하는 것이 핵심 목적이다.
1. 관리자가 보낸 "강사 섭외 초대"를 푸시 알림으로 받고 수락/거절한다.
2. (추후) 본인 프로필/일정 조회, 수업 관련 정보 확인 등.

## 이 저장소와 admin 저장소의 관계 (중요)
- admin 저장소 경로: `/Users/kimtaeyeong/Documents/project/dreampia/admin`
- **DB 스키마의 단일 진실 공급원(source of truth)은 admin 저장소**다. 새 테이블/컬럼/RLS/함수가 필요하면 이 저장소가 아니라 admin 저장소의 `supabase/migrations/`에 마이그레이션을 추가하고 `supabase db push --linked`로 적용한다. 이 저장소에서 별도로 마이그레이션을 만들지 않는다 (같은 프로젝트에 대해 두 군데서 마이그레이션 이력을 관리하면 충돌한다).
- 이 저장소는 스키마가 바뀌면 `supabase gen types typescript --linked`로 타입만 재생성해서 받아쓴다.
- **작업 중 스키마/비즈니스 로직이 헷갈리면 admin 저장소를 직접 열어서 확인한다.** 특히 아래 파일이 유용하다:
  - `admin/CLAUDE.md` — 전체 ERD, 비즈니스 로직 핵심 규칙(재고 차감, 강사료 입금자 로직 등)
  - `admin/supabase/migrations/` — 실제 적용된 스키마 변경 이력 (특히 `20260714000000_invitations.sql` 이후 파일들이 강사 섭외 관련)
  - `admin/app/(dashboard)/events/[id]/recruiting/actions.ts`, `admin/components/features/events/EventRecruitingClient.tsx` — 관리자가 초대를 어떻게 만드는지(모든수락/부분수락 흐름)
  - `admin/types/supabase.ts` — 참고용 타입 정의 (이 저장소에서는 직접 gen types로 재생성해서 쓸 것)
- 두 프로젝트가 같은 Supabase 프로젝트를 공유하므로(`project-ref: ftgvbgqgvaajpxverlhj`), 여기서 만드는 화면은 admin 쪽 RLS 정책과 반드시 맞물려 동작한다는 점을 항상 염두에 둔다.
- admin 웹에서 "관리자 페이지에서는 이렇게 되어 있는데, 멘토 앱도 동일하게 갈까요?" 같은 판단이 필요하면, 추측하지 말고 admin 저장소 코드를 실제로 읽어서 확인한 뒤 답한다.

## 기술 스택
| 항목 | 기술 |
|---|---|
| Framework | Expo (React Native), Expo Router |
| Language | TypeScript |
| Database | Supabase (PostgreSQL) — admin과 동일 프로젝트 공유 |
| DB 클라이언트 | `@supabase/supabase-js` |
| 인증 | Supabase Auth |
| 푸시 알림 | FCM (Firebase Cloud Messaging) — Android/iOS 공용 |

## 인증
- 멘토는 Supabase Auth로 로그인한다.
- admin과 동일한 컨벤션: **`mentors.id` == `auth.uid()`**. 즉 멘토 회원가입 시 발급되는 auth user id를 그대로 `mentors.id`로 사용한다 (admin 저장소의 `is_authenticated_admin_or_mentor()` 등 RLS 헬퍼 함수가 이 전제로 짜여있다).
- 멘토는 `mentors.is_authenticated = true`가 되어야 정상 이용 가능하다 (관리자가 승인).

## 핵심 도메인 요약 (admin 저장소 CLAUDE.md 발췌 — 전체는 admin/CLAUDE.md 참고)

### mentors
강사 정보. `available_areas`, `is_available`, `score`(강사등급용 점수) 등을 가진다.

### events / event_rows
- `events`: 하나의 행사(학교/기관 방문 일정 묶음).
- `event_rows`: 교시별 실제 수업 단위. `occupation_program_unit_id`(무슨 프로그램인지), `start_time`/`end_time`, `mentor_id`(배정된 강사) 등을 가진다.
- **`event_rows.mentor_id`는 오직 아래 invitations 흐름을 통해서만 채워진다.** admin의 행사 등록/수정 화면에서는 강사를 배정하지 않는다.

### 강사 섭외 (invitations) — 이 앱의 핵심 도메인
- `invitations`: 초대 헤더. `is_all_approval_required`(모든수락 여부, 기본 false=부분수락), `status`(발송중/마감/만료/취소), `expires_at`(기본 24시간).
- `invitation_event_rows`: 이 초대에 포함된 event_row 목록 (event_row 삭제 시 `event_row_id`가 null로 남아 이력은 보존됨).
- `invitation_mentors`: 이 초대를 받은 멘토와 응답 상태(대기/수락/거절/마감/만료). **멘토 앱 로그인 사용자 기준으로 `mentor_id = auth.uid()`인 행만 RLS로 조회 가능.**
- `invitation_row_responses`: 멘토가 실제로 수락한 event_row 개별 기록 (부분수락 시 여러 개 중 일부만 있을 수 있음).

**부분수락 vs 모든수락**
- 부분수락(기본값): 멘토는 초대받은 event_row 중 원하는 것만 개별 수락 가능.
- 모든수락: 초대에 포함된 모든 event_row를 한 번에 수락해야 함 (일부만 선택 불가). 같은 강사가 여러 회차를 이어서 진행해 강의 품질을 맞추려는 목적.
- 배정은 "가장 먼저 수락한 멘토"가 선점하는 방식이며, 동시성/시간 충돌 처리는 전부 DB 함수 안에서 이뤄진다.

**멘토 앱에서 직접 호출할 RPC (이미 `authenticated` role에 grant되어 있음, 클라이언트에서 `supabase.rpc(...)`로 바로 호출)**
- `accept_invitation_event_row(p_invitation_mentor_id, p_event_row_id)` — 부분수락 단건 수락
- `accept_invitation_all(p_invitation_mentor_id)` — 모든수락 전체 수락
- `decline_invitation(p_invitation_mentor_id)` — 거절

이 함수들은 SECURITY DEFINER로 동작하며 내부에서 시간 충돌 검사, 선점 여부 확인, 원자적 배정을 전부 처리한다. **멘토 앱에서는 절대 `event_rows.mentor_id`나 `invitation_mentors.status`를 직접 update하지 않는다** — RLS가 막아뒀고, 위 RPC를 거쳐야만 정상 반영된다.

## 푸시 알림 (설계 완료, 스키마/발송 로직은 아직 미구현 — admin 저장소에 마이그레이션으로 추가 예정)

아직 admin 저장소에 아래 테이블이 만들어지지 않았다. 이 앱에서 푸시 관련 코드를 짜기 전에 admin 쪽에 먼저 마이그레이션이 들어갔는지 확인할 것.

- `mentor_devices`: 멘토별 FCM 디바이스 토큰 저장 (여러 기기 지원, `mentor_id = auth.uid()` 기준 RLS). 앱은 로그인 후 FCM 토큰을 발급받아 이 테이블에 upsert한다.
- `push_notifications`: 발송 로그 (감사/재시도용). 멘토 앱에서 직접 쓰지 않고 서버(admin 서버 액션 또는 Edge Function)에서만 기록한다.

**흐름**: admin이 `createInvitation()`으로 초대를 만들면 → 서버 쪽에서 대상 멘토의 `mentor_devices`를 조회해 FCM으로 푸시 발송 → 멘토 앱은 알림 수신 시 `data.invitation_mentor_id`로 섭외 상세 화면에 딥링크 → 위 RPC로 수락/거절.

## 코딩 컨벤션 (admin과 통일)
- 주석은 한글로 작성한다.
- 커밋 메시지는 한글로 작성한다.
- DB 컬럼명은 snake_case, TS 변수/함수는 camelCase.
- Supabase 테이블 타입은 `supabase gen types typescript --linked`로 생성하며, 직접 손으로 수정하지 않는다.
- 새 테이블이 필요하면 이 저장소가 아니라 admin 저장소에 RLS까지 포함한 마이그레이션으로 추가한다.

## 미결 사항
- `mentor_devices` / `push_notifications` 테이블 마이그레이션 (admin 저장소에 추가 예정)
- 실제 FCM 연동 (Firebase 프로젝트 생성, 서비스 계정 키 관리 위치 결정)
- 로그인/온보딩 화면, 섭외 목록/상세 화면 구현
