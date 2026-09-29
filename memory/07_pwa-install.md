# 07. 앱 설치 (PWA) — 안드로이드 · 아이폰

> 2026-09-29 추가. 참고: `D:\01_WorkPlace\222_앱제작\church-store-app` (hana-store.com, 같은 PWA 방식)
> 앱스토어/플레이스토어 배포가 아니라 **웹앱을 홈 화면에 설치**하는 방식. 스토어 배포가 필요하면 Capacitor 래핑 필요
> (Google Play 개발자 등록 $25 1회, Apple Developer $99/년 + iOS 빌드용 Mac 필요).

## 구성 파일
| 파일 | 역할 |
|------|------|
| `app/public/manifest.webmanifest` | 앱 이름(말씀암송), 아이콘, `display: standalone`, 테마색 `#111319`, `start_url/scope: ./` |
| `app/public/icons/` | `icon.svg`(원본: 금색 펼친 책 + 별), `icon-192/512.png`, `apple-touch-icon.png`(180) — maskable 안전영역 안에 그림 배치 |
| `app/public/sw.js` | 서비스 워커 (오프라인) |
| `app/public/_headers` | Cloudflare Pages: `sw.js`, 매니페스트 `Cache-Control: no-cache` |
| `app/index.html` | manifest 링크, apple-touch-icon, `apple-mobile-web-app-*` 메타, `viewport-fit=cover` |
| `app/src/main.jsx` | **프로덕션 빌드에서만** SW 등록 (`import.meta.env.PROD`) |
| `app/src/pwa.js` | `beforeinstallprompt` 캡처, `useInstall()` 훅, 기기/인앱브라우저 판별, 외부 브라우저 열기 |
| `app/src/screens/InstallScreen.jsx` | 설치 안내 화면 |

## 서비스 워커 캐시 전략 (`sw.js`, 캐시 이름에 `VERSION` 포함)
- **페이지 이동**: 네트워크 우선 → 오프라인이면 캐시된 `./` (앱 셸)
- **Google Fonts**: 캐시 우선 (`font-v1`) → 한 번 받으면 오프라인에서도 폰트 유지
- **mp3**: 캐시 우선 (`audio-v1`) — 한 번 들은 구절은 오프라인 재생.
  Range 요청이면 캐시된 전체 파일에서 **206 부분 응답을 직접 생성** (iOS Safari는 200 전체 응답을 주면 오디오 재생/탐색 실패)
- **빌드 산출물**(해시 파일명 JS/CSS), 아이콘: 캐시 우선 (`app-v1`)
- 설치(install) 시 사전 캐시는 `addAll` 대신 **하나씩 fetch → put + allSettled**
  (서버가 `Vary` 헤더를 붙이면 addAll이 실패하고, 한 파일 실패로 SW 설치 전체가 취소되는 문제 회피)
- 캐시 구조를 바꾸면 `VERSION`을 올릴 것 → activate 때 옛 캐시 삭제

## 설치 화면 (InstallScreen) 동작
- 상태별 메인 영역: 이미 설치됨(standalone) → "이미 설치되어 있어요" / 인앱 브라우저(카카오톡·네이버·인스타·페북·라인) → 경고 + "크롬으로 열기"(카카오톡은 `kakaotalk://web/openExternal`, 그 외 안드로이드는 크롬 intent) / `beforeinstallprompt` 받음 → **"지금 설치하기"** 원클릭
- 안드로이드(크롬) · 아이폰(사파리 공유 → 홈 화면에 추가) 단계 안내, 내 기기 쪽을 위에 + "내 기기" 배지
- QR 코드(api.qrserver.com, 현재 origin), 링크 복사
- 홈 화면의 "앱 설치하기" 카드(점선 금테)로 진입, 설치된 상태면 카드 숨김

## 함께 바뀐 것
- **history 연동** (`App.jsx`): 화면 전환 시 `pushState`, `popstate`로 복원 → 휴대폰 뒤로가기가 앱 안에서 이전 화면으로 동작. 뒤로 버튼은 `history.back()`. 새로고침해도 `history.state`로 현재 화면 복원
- **safe-area**: iOS 상태바 `black-translucent`이므로 모든 상단바에 `env(safe-area-inset-top)`, 하단 플레이어/목록에 `env(safe-area-inset-bottom)`

## 검증 (2026-09-29, 헤드리스 Chrome + CDP)
- 매니페스트 오류 0, installability 오류 0, SW `activated` + 페이지 제어, 뒤로가기 정상
- 오프라인 전환 후 새로고침 → 암송 화면 표시, 캐시된 mp3 10초 지점 탐색 재생 OK
- 주의: 테스트용 Chrome 프로필을 Claude 스크래치패드(Temp\claude\...) 아래 두면 Cache.put 이 "Entry already exists"로 전부 실패함 (환경 문제). `%LOCALAPPDATA%` 아래 프로필은 정상
