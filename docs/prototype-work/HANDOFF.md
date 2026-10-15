# 식업 프로토타입 — 상태 (2026-10-13 완료)

**완료**: 9개 도메인 페이지 + 개요, 자동 클릭 흐름(`tools/flows/*.json`, hub 제외) 라이트·다크·390px 모두 통과(ERRORS는 파비콘 404뿐), 분석 문서 부록 A(38건) 추가, Artifact 게시 https://claude.ai/artifact/WcNnk7zXsAEJq6jwuhPjDd (비공개 — 공유는 페이지 Share 메뉴에서).
**다시 게시**: 아래 1·2번으로 서버·도구 준비 → 고친 뒤 흐름 전부 재실행 → `python -I docs/prototype-work/tools/build_publish.py` → 같은 URL로 publish.
**남은 개선 후보**: 분석 문서 부록 A-10(공통 자산). 이번엔 손대지 않음.
**2026-10-13 추가 반영(기획서·명세서·디자인 요청서 수정분)**: 상품 상세 설명 — 파트너 에디터(P-PRD-09: 이미지 일괄 업로드·자르기·기본 틀·서버 정화·버전·판매 중 수정 재검수), 고객 뷰어(U-PDP-07: 접힘·펼치기·확대·신고·이미지 실패), 본사 수정 검수(바뀐 부분 비교), 주문 상세 [주문할 때의 상품 정보 보기](order.html). `texts/`를 새 원본으로 다시 뽑아 **page-briefs.md의 줄 번호가 조금 어긋날 수 있음**. 흐름 34개(catalog-desc 추가) 모두 통과, 부록 A 40건(A-11 추가), Artifact v2 게시.
**2026-10-13 추가 반영(사업자가 결정 41-A · 42-C · 43-B)**: 원본 기획서·명세서·디자인 요청서·법률 자문 질문서(L-26)를 고친 뒤 `texts/` 다시 뽑음. 엔진에 `GC.price.bizTiers·pickTiers·bizOptionExtra·bizErrors·listPrice`와 정책값 `product.biz_price_rate_max` 추가(검사 23개 = 18 + TC-19~23). catalog: 파트너 가격·맞춤 단가에 사업자가 방식(없음/할인율/숫자, 바꾸면 확인 창 후 삭제), 고객 화면 사업자가·맞춤 사업자가·가격 종류별 할인 전 가격(화이트 수저집·업소용 물티슈 즉시 할인 10%)·디자인비 판정 미리보기. 새 흐름 `catalog-biz`(+`-dark`·`-narrow`) 포함 흐름 37개 통과, 부록 A 43건, Artifact v3 게시. 흐름 일괄 실행은 스크래치의 runall.sh와 같은 규칙(이름에 dark → 다크, narrow → 390px)으로 돌림.

**2026-10-14 S7(부록 B 반영)**: 원본 문서의 부록 B 63건·결정 D1~D19를 프로토타입에 맞춤(목록·결과는 `docs/revision-work/prototype-impact.md` 'S7 결과'). 엔진: 판비 공제 min(`designCancel`의 `plateCost`)·`designStage`(첫 시안 기록·확정 후 변경 건)·`bizInversion`·`GC.claim.*`·`GC.notice.elapsed`, 상태 머신 DESIGN(C-STATE-03대로, start_revision 없음)·ORDER_CUSTOM(EXCHANGED·RETURNED·restore)·CLAIM_RETURN·새 CLAIM_CANCEL·PRODUCT_REVISION, 정책값 새 묶음 '공통 · 영업일·배치'(문자열 값 키는 `text: true`, 보기만). 검사 33개, 흐름 63개(hub 제외). **흐름 일괄 실행**: `cd docs/prototype-work/tools && ls flows/*.json | xargs -P 4 -n 1 bash runone.sh`로 4개씩 병렬(서버는 먼저 띄움)(이름 규칙 그대로: dark → 다크, narrow → 390px, 첫 단어 = 페이지).

**2026-10-16 S9(S8 결정 D20~D35 반영, 재게시 전)**: 엔진에 판비 = 상품 금액(`instant.plate`·`platePaid`), 본사 쿠폰 두 자리(`hqCoupon` 상품 할인 + `designCoupon`, `includeDesignFee` 없앰), 추가 구성품(`addonOf`·`GC.order.addonCascade`), `GC.refund.partnerChange`, 클레임 완료 결과(`result`·`GC.claim.label`), 새 전이(수정본 DISCARDED·정산 보류 → 확정·출고 뒤 취소 이의·파트너 변경), 정책값 키 14개(새 묶음 '공통 · 보안'). 검사 40개. 페이지 10개 고침(MOVED 없앰, order에 '시작 장면' 고르기), 흐름 64 → 82개(hub 제외 81). 결과·판단·남은 확인 거리는 `docs/revision-work/prototype-impact.md` 맨 아래 'S9 결과'. **마무리(10-16)**: 흐름 81개 PASS·엔진 40개 → 같은 URL 재게시(버전 7, 개요 ‘근거’ 줄에 D20~D35). **새 세션에서 같은 URL로 올릴 때**: 게시 도구가 ‘읽지 않은 기존 파일’이라며 막으면 Artifact `read`의 `paths`로 12개를 받아 커밋본 `prototype/`과 해시(줄바꿈 무시)를 비교해 밖에서 바뀐 게 없는지 본 뒤 다시 publish. 이 세션엔 파일 수정 훅이 있어 publish의 `edits`가 막힘 → 소스를 고치고 `build_publish.py` 다시 → publish. 다음은 S10(`docs/revision-work/prototype-impact.md` 맨 아래 ‘S10 입력’).

**2026-10-16 S10(결정 D36~D45 반영, 재게시 끝)**: 엔진에 `partnerChange` 판비·정산 기준·붙은 구성품(`settle`·`addonRefund`, `hqAdjust` 없앰), `addonCascade` 남은 수량(`partialParents`), ORDER `parent_collected`·`partner_change_cancel`, 디자인비 쿠폰 묶음 안분(`couponAlloc`)·이용권과 같이 안 씀, `claim.label(…, claimType)` 유형별 진행 중 라벨·`claim.step`, `Policy.permRow(key)`(정책값 키별 권한 행), `price.optionExtraRange()`, 새 키 4개, 묶음 이름을 명세 영역 이름으로('주문·클레임·CS'·'디자인·파일'·'회원·혜택·알림'). 검사 41개. 페이지 9개 + index 고침, 흐름 82 → 92개(hub 제외 91 PASS). 결과는 `docs/revision-work/prototype-impact.md` ‘S10 결과’. 같은 URL 재게시(버전 8) — 이번엔 Artifact `read`의 `paths`로 게시본 13개를 받아 직전 커밋 `prototype/`과 해시(줄바꿈 무시, index는 게시 뼈대를 뺀 뒤)로 같음을 확인하고, 페이지를 `read`(path 없이) 한 번 한 뒤 publish하니 막히지 않음. **흐름 일괄 실행은 3개씩**(`xargs -P 3`) — 서브에이전트들이 동시에 서버를 쓰면 ERR_CONNECTION_REFUSED가 날 수 있어, 실패하면 그 흐름만 다시 돌려 봄. 다음은 S11(`prototype-impact.md` 맨 아래 ‘S11 입력’).

**2026-10-16 S11(결정 D46~D52 반영, 재게시 끝)**: 엔진에 디자인비 쿠폰 최소 주문 = 묶음의 맞춤 품목 금액·할인 큰 묶음(`designFees[].couponShort`), `partialCancel`이 디자인비 쿠폰을 원래 묶음에 최소 주문 없이 고정, ORDER `parent_printable`(맞춤 항목에 붙은 구성품은 본 항목 [인쇄 가능] 때 발주 확인), CLAIM_RETURN `EXCHANGE_REQUESTED`·`claim.step(…, claimType)`, `price.priceChangeAlert()`·`priceChangeCheck()`, 새 키 6개(입점 처리 목표 3·사업자 수동 검토·폐업 유예·가격 경고). 검사 43개. 공통 CSS `.rules .rule-row` 이름 칸 최소 5em. 페이지 9개 + index 고침, 흐름 92 → 104개(hub 제외 103 PASS). 결과는 `docs/revision-work/prototype-impact.md` ‘S11 결과’. 같은 URL 재게시(버전 9) — S10과 같은 방법(게시본 13개 해시 비교 → 페이지 `read` 한 번 → publish). **주의**: 서브에이전트가 메인 스크래치 폴더에 같은 이름의 스크립트를 덮어쓸 수 있으니, 메인 도구 파일 이름은 겹치지 않게(예: `main_*.py`). 페이지 에이전트는 흐름을 2개씩 돌림. 다음은 S12(`prototype-impact.md` 맨 아래 ‘S12 입력’).

---
아래는 일시 중지 시점(2026-10-13 새벽)의 원래 인수인계 기록입니다.

# (기록) 이어서 할 일

## 처음 요청
"식업 기획서 분석해봐. 각 도메인별로 프로토타입 간단하게 하나씩 만들어줘. html·js로만. 타업체 서비스 연동은 알럿만." + "frontend-design 스킬로 진행, 대표한테 보여줄 프로토타입"(`/bj-plan`으로 시작했지만 사용자가 "진행해줘"라고 해서 플랜 문서·컨펌 게이트 없이 바로 제작으로 갔음).

## 끝난 것
- 기획서 분석: `docs/analysis/2026-10-13_식업-기획서-분석.md` (부록 A는 아직 비어 있음 — 아래 4번)
- 공통 자산: `prototype/assets/gc.css`(디자인 시스템, 라이트·다크), `engine.js`(정책값·가격 6단계·부분 취소 환불·디자인 단계 취소·수수료·정산 차감·멤버십 환불·연락처 가림·상태 머신), `ui.js`(UI.mount 화면 틀: 상단 내비·시계·컬러칩·지금 차례·역할 탭·폰/데스크 프레임·작업 기록·외부 연동 안내 창·확인 창)
- 엔진 검사: `node --test prototype/tests/` → 18개 통과(명세서 예시 숫자 그대로)
- `prototype/index.html`(개요·12단계 여정 지도·도메인 목록·외부 서비스 표)
- `prototype/design.html`(맞춤 디자인 — 본보기 페이지): 결제 → 배정 → 시안 → 핀(연락처 가림) → 수정 → 확정 → 패키지 → 파트너 생산 → 배송 → 7일 자동 확정 → 정산 이벤트 → 재주문까지 자동 클릭 검증 통과. 자체 파일·템플릿 갈래, 무응답 3/14/30일, 확정 후 변경·취소(생산 보류 + 본사 중재), 인쇄 반려 포함.
- 결정: 외부 연동은 브라우저 `alert()` 대신 화면 안 안내 창(`app.ext`). 이유 — 디자인 요청서 08장 "브라우저 기본 경고창 쓰지 않음" 규칙, 공유 링크(Artifact)에서는 alert가 아예 안 뜸. 알림톡·푸시는 작업 기록 "알림"으로만.

## 남은 일 (순서대로)
1. **로컬 서버 띄우기**: `cd prototype && python -m http.server 8765 --bind 127.0.0.1` (백그라운드)
2. **검증 도구 설치(한 번)**: `cd docs/prototype-work/tools && npm i` (puppeteer-core 22.15.0, 설치된 Chrome 사용). 예: `node shoot.js design.html flows/design-flow.json light 1440`
3. **남은 8개 페이지 제작**: member · partner · catalog · order · room · settlement · benefit · system. 서브에이전트 8개(general-purpose)를 동시에 띄우고 각자 `docs/prototype-work/page-briefs.md`의 해당 절을 프롬프트로 준다(공통 지침 `agent-brief.md`). 지난 세션에선 에이전트들이 문서를 읽던 중에 멈춰서 만들다 만 파일은 없음.
4. 에이전트 보고 취합: 각자 찾은 "명세 모호·불일치"를 분석 문서 6장 아래 **부록 A**에 추가. 공통 자산 수정 제안이 있으면 메인 세션이 반영(에이전트는 공통 자산 수정 금지).
5. 페이지마다 스크린샷(라이트·다크·390px)으로 점검, 상단 내비가 9개 페이지 모두 연결되는지 확인.
6. **공유 링크로 게시**(대표 보고용): `python docs/prototype-work/tools/build_publish.py` → 출력된 files 맵으로 Artifact 게시(메인 파일 = `tools/publish/index.html`, 나머지 HTML·assets는 files). 제목 "식업 프로토타입", icon "map".
7. 사용자에게 마무리 보고: 링크, 파일 위치, 분석 요약, 남은 결정(Q6 PG 정산 방식 등)과 법률 자문 전 초안 상기.

## 참고 자료
- 원문 텍스트 추출본: `docs/prototype-work/texts/`(spec·plan·brief·legal-consult·pg-consult). 원본 HTML이 바뀌면 `tools/html2txt.py`로 다시 뽑기.
- 메모리 규칙: 금액·요율은 전부 관리자 설정값(임시 기본값), 일정·자금 조달·경쟁 분석은 다루지 않음, 법률 자문 전 초안 항목은 작업 때 상기.
