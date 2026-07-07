---
name: nhis-care-checkup-search
description: 국민건강보험공단 장기요양기관 검색 API를 k-skill-proxy 경유로 조회하고, 건강검진기관은 공식 검색/신규 API 확인 경로로 안내한다. 조회 전용.
license: MIT
metadata:
  category: healthcare
  locale: ko-KR
  phase: v1
---

# NHIS Care And Checkup Search

## What this skill does

국민건강보험공단 장기요양기관 검색서비스(data.go.kr `15059029`)를 `k-skill-proxy` 경유로 호출해 장기요양기관 후보를 조회한다.

건강검진기관 검색은 NHIS 공식 웹 검색면과 data.go.kr 신규 OpenAPI(`15154419`) 진입점을 기록한다. 단, 공개 HTML에서 operation별 URL/파라미터가 확인되지 않아 v1 helper route에는 포함하지 않는다. Swagger 명세와 live key로 확인되기 전까지 검진기관 API 호출을 추측 구현하지 않는다.

## When to use

- "서울 강남 장기요양기관 찾아줘"
- "요양원 후보와 주소/전화번호 확인해줘"
- "건강검진기관은 어디서 공식 조회해?"

## When not to use

- 의료 판단, 장기요양 등급 판정, 특정 기관 추천 보증
- 예약·신청·민감 의료정보 조회 자동화
- 건강검진기관 OpenAPI live 호출: operation 명세가 확인될 때까지 공식 웹 검색으로 안내한다.

## Prerequisites

- 인터넷 연결
- hosted/self-host `k-skill-proxy`의 `/v1/nhis/long-term-care` route 접근 가능

## Credential requirements

- 사용자 측 필수 시크릿 없음.
- `KSKILL_PROXY_BASE_URL` — self-host·별도 프록시를 쓸 때만 설정. 비우면 기본 hosted `https://k-skill-proxy.nomadamas.org` 를 사용한다.
- `DATA_GO_KR_API_KEY` 는 프록시 운영 서버 환경에만 둔다. 공공데이터포털 `국민건강보험공단_장기요양기관 검색 서비스`(15059029) 활용신청이 승인돼 있어야 한다.

키 발급:

- 장기요양기관 검색 서비스: <https://www.data.go.kr/data/15059029/openapi.do>
- 건강검진기관 검색 서비스: <https://www.data.go.kr/data/15154419/openapi.do>
- 공공데이터포털 이용 가이드: <https://www.data.go.kr/ugs/selectPublicDataUseGuideView.do>

## Inputs

장기요양기관 route:

- `q`, `query`, `name`, 또는 `adminNm`: 기관명 검색어
- `sido` 또는 `siDoCd`: 시도 코드
- `sigungu` 또는 `siGunGuCd`: 시군구 코드
- `service_kind` 또는 `serviceKind`: 급여/서비스 종류 코드
- `page` 또는 `pageNo`: 기본 1
- `limit` 또는 `numOfRows`: 기본 10, 최대 100

## Workflow

### 1. Decide the surface

장기요양기관이면 proxy route를 사용한다. 건강검진기관이면 공식 웹 검색 <https://www.nhis.or.kr/nhis/healthin/retrieveExmdAdminSearch.do> 또는 data.go.kr `15154419`의 Swagger 명세 확인이 필요하다고 알린다.

### 2. Query long-term care institutions through the proxy

```bash
BASE="${KSKILL_PROXY_BASE_URL:-https://k-skill-proxy.nomadamas.org}"
curl -fsS --get "$BASE/v1/nhis/long-term-care" \
  --data-urlencode "q=강남" \
  --data-urlencode "sido=11" \
  --data-urlencode "limit=10"
```

### 3. Summarize source fields

응답 XML의 `item` 필드에서 기관명, 주소, 전화번호, 급여종류, 정원/평가 등급처럼 upstream이 제공한 공개 항목만 요약한다. 사용자가 실제 이용·입소·검진 예약을 하려면 NHIS 또는 기관에 직접 확인하라고 안내한다.

## Failure modes

- `400 bad_request`: 검색어/지역/서비스 종류 중 하나도 없거나 코드/페이지 값이 잘못됨.
- `503 upstream_not_configured`: 프록시 서버에 `DATA_GO_KR_API_KEY` 가 없거나 15059029 활용신청이 승인되지 않음.
- `502 upstream_forbidden`: data.go.kr gateway가 키를 거부함.
- 빈 결과: 지역 코드나 기관명 표기를 완화해서 재검색한다.
- 건강검진기관 API: `15154419`의 public HTML에서 operation별 path/파라미터가 확인되지 않음. 추측 호출하지 말고 공식 웹 검색 또는 명세 확인 후 처리한다.

## Done when

- 장기요양기관 조회는 `k-skill-proxy` route로 수행했고 사용자에게 API key를 요구하지 않았다.
- 결과에는 기관명, 위치, 연락처, 원천 서비스와 조회 조건을 함께 적었다.
- 건강검진기관 요청은 공식 웹 검색 URL 또는 `15154419` 활용신청/명세 확인 경로를 안내했다.

## Maintainer review notes

키 없이 가능한 검증:

- `./scripts/validate-skills.sh`
- `node --test packages/k-skill-proxy/test/server.test.js`
- `curl -i --get "$KSKILL_PROXY_BASE_URL/v1/nhis/long-term-care" --data-urlencode "q=강남"` (키 미설정이면 503 확인)

Live smoke는 hosted/self-host proxy에 `DATA_GO_KR_API_KEY`가 설정되고 `15059029` 활용신청이 승인된 뒤 수행한다.

## Safety notes

- 조회 전용 스킬이다.
- 의료 판단, 장기요양 등급 판정, 예약/신청 자동화는 하지 않는다.
- 인증키는 프록시 서버에서만 다루며 repo/GitHub Actions/public docs에 저장하지 않는다.
