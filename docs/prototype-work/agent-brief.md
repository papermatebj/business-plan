# 식업 도메인 프로토타입 — 공통 작업 지침 (모든 페이지 에이전트 공통)

## 무엇을 만드나
- 식업 = 외식업 사장님용 소모품 B2B 오픈마켓 + 본사 디자인팀이 중계하는 맞춤 인쇄(수저집·컵 로고). 1인 개발 기획 단계.
- 대표(CEO)에게 보여줄 **도메인별 프로세스 프로토타입**. "간단하게"지만 보고용이라 화면 품질이 중요하다.
- 순수 HTML + JS. 프레임워크·빌드·npm 설치 금지. 외부 서비스 연동은 실제로 하지 않고 **화면 안 안내 창(app.ext)** 으로 대신한다.
  - 브라우저 기본 `alert()` · `confirm()` · `prompt()` 는 절대 쓰지 않는다(디자인 요청서 규칙 + 공유 환경에서 막힘). 확인이 필요하면 `app.confirm()`.

## 파일 위치와 규칙
- 이 문서의 경로는 모두 저장소 루트(이 프로젝트를 받은 폴더) 기준이다. 명령도 저장소 루트에서 실행한다.
- 프로젝트: `prototype/`
- 공통 자산(수정 금지, 읽기만): `assets/gc.css`(디자인 시스템), `assets/engine.js`(규칙 엔진 `window.GC`), `assets/ui.js`(화면 틀 `window.UI`)
- **본보기 페이지: `design.html` — 반드시 처음부터 끝까지 읽고 같은 구조·패턴으로 만든다.**
- 내 담당 파일 하나만 만든다: `prototype/<page>.html`. 페이지 전용 CSS는 그 파일의 `<style>` 안에. 다른 페이지·공통 자산은 건드리지 않는다.
- 엔진에 없는 상태 머신은 내 페이지 안에서 `GC.sm.define('<PAGE>_<NAME>', {...})`로 정의(형식은 engine.js의 define 예시와 같게, states에 name 필수, main/branch/stop 배열, transitions).
- 엔진에 없는 정책값은 페이지 안 상수로 두고 `<span class="pv" title="관리자 설정값(임시 기본값)">…</span>`처럼 점선 표시. 최종 보고에 목록을 적는다(engine.js는 수정하지 말 것).

## 근거 문서 (텍스트 추출본, 줄 번호로 읽기)
- 기능 명세서: `docs/prototype-work/texts/spec.txt` (4008줄)
- 기획서: 같은 폴더 `plan.txt` (1489줄) · 디자인 요청서(고객 화면 규칙·문구·라벨): 같은 폴더 `brief.txt` (638줄)
- 원본 HTML이 바뀌었으면 `python -I docs/prototype-work/tools/html2txt.py <원본.html> <출력.txt>`로 다시 뽑는다(줄 번호가 달라질 수 있음).
- 문서끼리 다르면 명세서가 기준. 미결정·초안 항목은 화면에 `<span class="tag tag-phase">법률 자문 전 초안</span>` 같은 표시를 붙인다. 2차·3차 기능은 `tag-phase`로 "2차" 표시.

## 페이지 구조 (design.html과 동일하게)
```html
<!doctype html><html lang="ko"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>도메인 이름 · 식업 프로토타입</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Hahmlet:wght@600;700;800&family=IBM+Plex+Sans+KR:wght@400;500;600;700&display=swap">
<link rel="stylesheet" href="assets/gc.css"><style>/* 페이지 전용 */</style></head>
<body><div id="app"></div>
<script src="assets/engine.js"></script><script src="assets/ui.js"></script>
<script>(function(){ 'use strict'; const app = UI.mount({...}); ... })();</script></body></html>
```
- `UI.mount({ domain, title, lede, meta, actors, strips, render:(actor,f)=>VIEWS[actor](f), onReset:init, foot })`
  - domain 키: member · partner · catalog · order · design · room · settlement · benefit · system (상단 내비 활성 표시)
  - actors: `'customer'`(폰 프레임) · `'design'` · `'partner'` · `'hq'` · `'system'`(데스크 프레임). 객체로 덮어쓰기 가능: `{ id:'hq', nav:['…','…'], navOn:'…', url:'admin.sikup.co.kr/…', place:'…' }`
  - strips: `[{ id, machine, label, note }]` — 상태 흐름 컬러칩. `app.go(id, event, {by})`로 상태 머신 이동(표에 없는 이동은 자동으로 막고 기록), `app.setState(id, code, {by})`로 직접 지정, `app.state(id)`로 조회. 칩 순서를 바꾸려면 `app.strips[id].main = [...]`.
- `f`(화면 API): `f.body`(innerHTML 채우기), `f.title(t)`, `f.tab('홈'|'카테고리'|'다시 사기'|'디자인'|'마이')`, `f.back()`, `f.bottom(html)`(폰 하단 고정 버튼), `f.badge(tab,n)`, `f.nav(label)`(데스크 왼쪽 메뉴 활성), `f.url(u)`
- 클릭: 요소에 `data-act="이름"` → `app.actions({ 이름(el, ev){…} })` 한 번 등록. 체크박스·셀렉트는 `data-change`, 입력은 `data-input`.
- 진행 안내: 모든 동작 뒤 `guide()`에서 `app.turn(actorId, '다음에 할 일', { rules:[{k:'규칙', policy:'정책값키'} | {k, v}], hint })` 또는 `app.done('끝 문구', {next})`를 정하고 `app.refresh()`. (design.html의 `refresh()` 패턴)
- 기록: `app.log(kind, html)` kind = state·noti·ext·money·rule·warn·user. 알림은 `app.notify('NOTI_코드', '받는 사람', ['알림톡','푸시'], '내용')` (코드는 명세서 C-NOTI-01, spec.txt 3686~3818줄).
- 외부 연동: `await app.ext({ service:'토스페이먼츠', what:'결제창 호출', lines:['…'], result:'승인된 것으로 처리해요' })`.
  외부 서비스 예: 토스페이먼츠(결제·지급대행·빌링키), PASS·NICE(휴대폰 본인인증), 국세청 API(사업자 진위·상태), 쿠콘(계좌 예금주 확인), 모두싸인(전자계약), 카카오·애플(소셜 로그인), AWS S3·GuardDuty(파일·악성코드 검사), 팝빌(세금계산서), 스윗트래커(배송 조회), 채널톡(상담), AWS SES(이메일). 알림톡·푸시 같은 정보성 알림은 안내 창 말고 `app.notify`로 기록만.
- 확인 창: `if (await app.confirm({ title, body, ok:'…', danger:true })) {…}` · 토스트: `app.toast('…')`
- 시간: `app.clock.now()`, `app.clock.pass(ms)`(기록 없이 작업 시간 흘리기), 상단 +1시간/+1일/+7일 버튼 → `app.onAdvance((prev, now)=>{…})` 훅에서 자동 처리(자동 확정·기한 만료·리마인드 등). 시작 시각은 2026-10-12(월) 09:00.
- 금액·요율·기한: 하드코딩 금지 → `GC.Policy.get(key)`, 화면 표시는 `UI.pv(key)`(점선 밑줄 + 툴팁). 계산은 엔진 사용: `GC.price.calcOrder`, `GC.price.tierPrice/nextTier`, `GC.refund.partialCancel/designCancel`, `GC.settle.finalRate/commission/confirmEvent/payout`, `GC.membership.annualRefund`, `GC.mask(text, 'chat'|'print_text'|'ref_link')`, `GC.won`, `GC.fmtDate`, `GC.addBusinessDays/Hours`, `GC.vatSplit`. 엔진 테스트(prototype/tests/engine.test.js)에 명세서 예시 숫자가 있으니 참고.

## 화면 원칙 (대표 보고용)
- 고객 화면(폰): 디자인 요청서(brief.txt)의 문구·라벨을 따른다. 해요체, 숫자로 구체적으로("2박스 더 담으면 박스당 2,000원 할인"), 오류는 원인 + 다음 행동. 고객에게 내부 상태 코드(PAID 등)를 그대로 보이지 않는다(엔진 states의 customer 라벨 사용). 하단 탭 이름: 홈·카테고리·다시 사기·디자인·마이.
- 파트너 센터·관리자(데스크): Tabler 같은 실무형 — `h3` 제목, `.tbl` 표, `.kv` 목록, `.btn` 버튼, `.note` 안내, `.st` 상태, `.panel`. 데스크 본문은 자동으로 세로 간격(stack)이 붙는다.
- 각 페이지 필수: ① 역할 탭 2개 이상 ② 상태 흐름 칩 1줄 이상 ③ 처음부터 끝까지 눌러 갈 수 있는 기본 흐름 ④ 명세서의 예외·실패 갈래 2개 이상 ⑤ 모든 단계에서 "지금 차례"와 "이 단계의 규칙"이 맞게 바뀜 ⑥ 시간이 걸리는 규칙(기한·자동 처리)이 있으면 시계로 체험 가능.
- 금지: 이모지, 버튼 문구 끝 화살표(→), 영문 대문자 라벨, 의미 없는 번호 매기기(실제 순서일 때만 번호), 카드마다 똑같은 그림자 장식. 공통 CSS 컴포넌트를 재사용하고 새 색은 만들지 않는다(토큰만 사용 — 다크 모드도 자동으로 맞음).
- 분량: 페이지당 대략 600~1,000줄. 지나치게 넓히지 말고 핵심 흐름을 확실히.

## 검증 (반드시)
1. 인라인 스크립트 문법 검사: 파이썬으로 마지막 `<script>` 내용을 임시 파일로 빼서 `node --check`.
2. 자동 클릭: 로컬 서버 `http://127.0.0.1:8765/`가 prototype 폴더를 서비스 중이어야 한다(메인 세션이 띄움: `cd prototype && python -m http.server 8765 --bind 127.0.0.1`, 끄지 말 것).
   `node docs/prototype-work/tools/shoot.js <page>.html <steps.json 경로> light 1440` (처음 한 번 tools 폴더에서 `npm i` 필요 — puppeteer-core, 설치된 Chrome 사용. Chrome이 기본 위치에 없으면 `CHROME_PATH` 환경변수로 지정)
   - steps.json은 `docs/prototype-work/tools/flows/<page>-flow.json`에 직접 작성. 예시: `flows/design-flow.json`. 단계 문법(배열):
     `{"role":"partner"}` 역할 탭 · `{"act":"이름"}` data-act 클릭(`"attr":"data-x=\"y\""`로 좁히기, `"idx":1` n번째, `"at":[0.3,0.5]` 요소 안 비율 위치 클릭) · `{"check":"data-k값"}` 체크박스 클릭 · `{"type":{"sel":"#id","text":"…"}}` · `{"adv":"86400000"}` 시간 보내기 · `{"click":"CSS선택자"}` · `{"eval":"JS식"}` · `{"wait":300}` · 아무 단계에 `"shot":"파일이름"`(스크린샷 → docs/prototype-work/shots/), `"after":ms`
   - 안내 창·확인 창은 단계마다 자동으로 "확인/예"를 누른다.
   - 출력의 `ERRORS:`가 none(파비콘 404 콘솔 오류는 무시)이고 마지막 `TURN:`·`NOW:`가 기대대로일 때까지 고친다. 단계를 못 찾으면 "없음 …"으로 나온다.
3. 스크린샷을 Read로 직접 보고 겹침·잘림·빈 화면을 고친다. 다크(`dark` 인자)와 좁은 폭(`light 390`)도 한 번씩 찍어 `HSCROLL: false`인지 확인.

## 최종 보고 (250단어 이내, 한국어)
- 담당 페이지가 보여주는 흐름과 근거 기능 ID, 넣은 예외 갈래
- 페이지 안에 따로 둔 정책값 상수(엔진에 없던 것)
- 명세서끼리 어긋나거나 모호했던 점(기능 ID와 함께) — 대표 보고·기획 보완에 쓸 것
- 공통 자산(gc.css·ui.js·engine.js)에 있으면 좋겠다고 느낀 수정(직접 고치지 말고 제안만)
- 검증 결과(마지막 TURN/NOW, ERRORS)
