/* 식업 프로토타입 — 공통 화면 틀
   모든 도메인 페이지가 UI.mount()로 같은 구조를 씁니다:
   상단 바(도메인 이동·시뮬레이션 시계) / 머리말 / 상태 흐름 컬러칩 / [지금 차례 | 역할별 화면 | 작업 기록]
   외부 서비스 연동은 브라우저 기본 경고창 대신 화면 안 안내 창(app.ext)으로 띄웁니다. */
(function () {
  'use strict';
  const GC = window.GC;

  const DOMAINS = [
    { key: 'index', name: '개요', href: 'index.html' },
    { key: 'member', name: '회원·인증', href: 'member.html' },
    { key: 'partner', name: '파트너 입점', href: 'partner.html' },
    { key: 'catalog', name: '상품·검색', href: 'catalog.html' },
    { key: 'order', name: '주문·결제', href: 'order.html' },
    { key: 'design', name: '맞춤 디자인', href: 'design.html' },
    { key: 'room', name: '협의 룸', href: 'room.html' },
    { key: 'settlement', name: '정산', href: 'settlement.html' },
    { key: 'benefit', name: '쿠폰·멤버십', href: 'benefit.html' },
    { key: 'system', name: '운영 설정', href: 'system.html' },
  ];

  /* 등장인물 기본값. 페이지에서 { id:'partner', nav:[...] } 처럼 덮어씁니다. */
  const ACTORS = {
    customer: { name: '고객', ink: 'c', device: 'phone', place: '고객 앱 · 웹과 앱이 같은 화면', title: '식업' },
    design: { name: '디자인팀', ink: 'm', device: 'desk', place: '디자인 스튜디오 · 통합 관리자 안', url: 'admin.sikup.co.kr/studio', app: '디자인 스튜디오', nav: ['요청 큐', '작업 공간', '템플릿'] },
    partner: { name: '파트너', ink: 'y', device: 'desk', place: '파트너 센터 · 제조사·인쇄소', url: 'partner.sikup.co.kr', app: '파트너 센터', nav: ['주문', '맞춤 제작', '상품', '정산'] },
    hq: { name: '본사 운영', ink: 'k', device: 'desk', place: '통합 관리자 · 운영·MD·CS·정산', url: 'admin.sikup.co.kr', app: '통합 관리자', nav: ['대시보드', '주문', '파트너', '정산'] },
    system: { name: '시스템', ink: 'sys', device: 'desk', place: '배치·알림·외부 연동 · 사람이 누르지 않음', url: 'batch · 외부 접속 없음', app: '시스템 작업', nav: ['배치', '알림', '외부 연동'] },
  };

  const LOG_KIND = { state: '상태', noti: '알림', ext: '외부', money: '금액', rule: '규칙', warn: '주의', user: '조작' };

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function fmtPolicy(key) {
    const m = GC.Policy.meta(key);
    const v = GC.Policy.get(key);
    if (!m || typeof v === 'string') return esc(v);
    if (m.unit === '원') return GC.won(v);
    if (m.unit === '원/월') return GC.won(v) + '/월';
    return `${GC.num(v)}${m.unit}`;
  }
  /** 관리자 설정값 표시: 점선 밑줄 + 툴팁 */
  function pv(key, text) {
    const m = GC.Policy.meta(key);
    const label = m ? m.label : key;
    return `<span class="pv" title="관리자 설정값 · ${esc(label)} (${esc(key)}) — 운영 설정 화면에서 바꿀 수 있어요">${text != null ? text : fmtPolicy(key)}</span>`;
  }

  function el(html) { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; }

  /** data-act="이름" 클릭을 한곳에서 받기 */
  function bind(root, map) {
    root.addEventListener('click', (e) => {
      const t = e.target.closest('[data-act]');
      if (!t || !root.contains(t) || t.disabled || t.getAttribute('aria-disabled') === 'true') return;
      const fn = map[t.dataset.act];
      if (fn) { e.preventDefault(); fn(t, e); }
    });
    root.addEventListener('change', (e) => {
      const t = e.target.closest('[data-change]');
      if (!t || !root.contains(t)) return;
      const fn = map[t.dataset.change];
      if (fn) fn(t, e);
    });
    root.addEventListener('input', (e) => {
      const t = e.target.closest('[data-input]');
      if (!t || !root.contains(t)) return;
      const fn = map[t.dataset.input];
      if (fn) fn(t, e);
    });
  }

  function mount(cfg) {
    const START = cfg.clock && cfg.clock.start ? new Date(cfg.clock.start) : new Date(2026, 9, 12, 9, 0); // 2026-10-12(월) 09:00
    const actors = (cfg.actors || ['customer']).map((a) => {
      const id = typeof a === 'string' ? a : a.id;
      return { id, ...(ACTORS[id] || {}), ...(typeof a === 'string' ? {} : a) };
    });
    const app = {
      S: {},
      actors,
      current: cfg.start || actors[0].id,
      strips: {},
      turnInfo: null,
      now: new Date(START),
      advanceHooks: [],
    };

    /* ── 뼈대 ── */
    document.title = cfg.docTitle || `${cfg.title} · 식업 프로토타입`;
    const root = document.getElementById('app') || document.body.appendChild(document.createElement('div'));
    root.innerHTML = `
      <header class="topbar"><div class="topbar-inner">
        <a class="brand" href="index.html" aria-label="식업 프로토타입 개요로">
          <span class="brand-mark" aria-hidden="true">식</span>
          <span><span class="brand-name">식업</span><br><span class="brand-sub">프로세스 프로토타입</span></span>
        </a>
        <span class="colorbar" title="등장인물 색: 고객(C) · 디자인팀(M) · 파트너(Y) · 본사(K) · 지금 단계(가게 그린)" aria-hidden="true"><i class="cb-c"></i><i class="cb-m"></i><i class="cb-y"></i><i class="cb-k"></i><i class="cb-s"></i></span>
        <nav class="domain-nav" aria-label="도메인">${DOMAINS.map((d) => `<a href="${d.href}"${d.key === cfg.domain ? ' aria-current="page"' : ''}>${d.name}</a>`).join('')}</nav>
        <div class="clockbox">
          ${cfg.clock === false ? '' : `<span class="clock-now" id="gc-clock" title="프로토타입 안의 시각">${GC.fmtDate(app.now)}</span>
          <button class="btn btn-sm" data-adv="3600000" title="시간을 1시간 보냅니다">+1시간</button>
          <button class="btn btn-sm" data-adv="86400000" title="시간을 하루 보냅니다">+1일</button>
          <button class="btn btn-sm" data-adv="604800000" title="시간을 7일 보냅니다">+7일</button>`}
          <button class="btn btn-sm btn-ghost" id="gc-reset" title="이 페이지를 처음 상태로">처음부터</button>
        </div>
      </div></header>
      <main class="page">
        <div class="page-head">
          <h1>${esc(cfg.title)}</h1>
          ${cfg.lede ? `<p class="lede">${cfg.lede}</p>` : ''}
          ${cfg.meta ? `<p class="meta">${cfg.meta}</p>` : ''}
        </div>
        <section class="strips" id="gc-strips" aria-label="상태 흐름"></section>
        <div class="work">
          <aside class="turn-col" aria-label="지금 차례">
            <section class="panel" id="gc-turn"></section>
            <section class="panel" id="gc-rules" hidden><div class="panel-h"><h2>이 단계의 규칙</h2><a class="pv-link" href="system.html">설정값 바꾸기</a></div><div class="panel-b rules"></div></section>
            <div id="gc-aside"></div>
          </aside>
          <section class="stage-col" aria-label="화면">
            <div class="roles" role="tablist" id="gc-roles"></div>
            <div class="stage"><p class="stage-cap" id="gc-cap"></p><div id="gc-device" style="width:100%;display:grid;grid-template-columns:minmax(0,1fr);justify-items:center"></div></div>
          </section>
          <aside class="log-col" aria-label="작업 기록">
            <section class="panel"><div class="panel-h"><h2>작업 기록</h2><span class="xsmall faint">최신이 위</span></div><ol class="log-list" id="gc-log"></ol></section>
            <div class="legend">${Object.entries(LOG_KIND).map(([k, v]) => `<span><i class="ltag ltag-${k}">${v}</i></span>`).join('')}</div>
          </aside>
        </div>
        <footer class="foot">
          ${cfg.foot ? `<p>${cfg.foot}</p>` : ''}
          <p>화면의 금액·요율·기한은 모두 관리자가 바꾸는 설정값이고, 지금 숫자는 기획서의 임시 기본값입니다. 점선 밑줄이 있는 값이 설정값이에요.</p>
          <p>외부 서비스(결제·본인인증·국세청·알림톡·택배·세금계산서·전자계약 등)는 실제로 연결하지 않고 안내 창으로 대신합니다.</p>
        </footer>
      </main>
      <div class="toast-zone" id="gc-toasts" aria-live="polite"></div>
      <dialog class="gc-dialog" id="gc-dialog"></dialog>`;

    const $ = (s) => root.querySelector(s);
    const logEl = $('#gc-log');

    /* ── 시계 ── */
    app.clock = {
      now: () => new Date(app.now),
      set: (d) => { app.now = new Date(d); paintClock(); },
      /** 기록 없이 시간을 흘림(사람이 일하는 데 걸린 시간 표현용). 자동 처리 훅은 돌아감 */
      pass(ms) {
        const prev = new Date(app.now);
        app.now = new Date(app.now.getTime() + ms);
        paintClock();
        app.advanceHooks.forEach((fn) => fn(prev, new Date(app.now)));
      },
      advance(ms, label) {
        const prev = new Date(app.now);
        app.now = new Date(app.now.getTime() + ms);
        paintClock();
        app.log('user', label || `시간을 ${ms >= GC.DAY ? Math.round(ms / GC.DAY) + '일' : Math.round(ms / GC.HOUR) + '시간'} 보냈어요 → ${GC.fmtDate(app.now)}`);
        app.advanceHooks.forEach((fn) => fn(prev, new Date(app.now)));
        app.refresh();
      },
    };
    function paintClock() { const c = $('#gc-clock'); if (c) c.textContent = GC.fmtDate(app.now); }
    app.onAdvance = (fn) => { app.advanceHooks.push(fn); };
    root.querySelectorAll('[data-adv]').forEach((b) => b.addEventListener('click', () => app.clock.advance(Number(b.dataset.adv))));
    $('#gc-reset').addEventListener('click', () => app.reset());

    /* ── 작업 기록 ── */
    app.log = (kind, html) => {
      const empty = logEl.querySelector('.log-empty'); if (empty) empty.remove();
      const li = el(`<li class="log-new"><time>${app.now.getMonth() + 1}/${app.now.getDate()}<br>${GC.fmtTime(app.now)}</time><i class="ltag ltag-${kind}">${LOG_KIND[kind] || kind}</i><span>${html}</span></li>`);
      logEl.prepend(li);
    };
    function clearLog() { logEl.innerHTML = '<li class="log-empty">아직 기록이 없어요. 왼쪽 "지금 차례"를 따라 눌러 보세요.</li>'; }
    clearLog();

    /* ── 알림·외부 연동·확인 창·토스트 ── */
    app.notify = (code, to, channels, text) => {
      app.log('noti', `${esc(channels.join('·'))} → ${esc(to)}: ${text} <span class="faint xsmall">${esc(code)}</span>`);
    };
    const dlg = $('#gc-dialog');
    app.ext = ({ service, what, lines = [], result = '성공한 것으로 처리해요' }) => new Promise((resolve) => {
      dlg.className = 'gc-dialog dlg-ext';
      dlg.innerHTML = `<div class="dlg-in">
        <p class="dlg-eyebrow"><span class="tag">외부 연동</span>${esc(service)}</p>
        <h2 class="dlg-title">${esc(what)}</h2>
        <div class="dlg-body">${lines.length ? `<ul>${lines.map((l) => `<li>${l}</li>`).join('')}</ul>` : ''}
          <p>실제 서비스에서는 이 단계에서 <b>${esc(service)}</b>를 호출합니다. 프로토타입에서는 ${esc(result)}.</p></div>
        <div class="dlg-actions"><button class="btn btn-ink" value="ok">확인</button></div></div>`;
      dlg.querySelector('button').addEventListener('click', () => dlg.close());
      dlg.onclose = () => { app.log('ext', `${esc(service)} · ${esc(what)}`); resolve(true); };
      dlg.showModal();
      dlg.querySelector('button').focus();
    });
    app.confirm = ({ title, body = '', ok = '확인', cancel = '취소', danger = false }) => new Promise((resolve) => {
      dlg.className = 'gc-dialog';
      dlg.innerHTML = `<form method="dialog" class="dlg-in">
        <h2 class="dlg-title">${esc(title)}</h2><div class="dlg-body">${body}</div>
        <div class="dlg-actions"><button class="btn" value="no">${esc(cancel)}</button><button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" value="yes">${esc(ok)}</button></div></form>`;
      dlg.onclose = () => resolve(dlg.returnValue === 'yes');
      dlg.returnValue = '';
      dlg.showModal();
    });
    app.toast = (text) => {
      const t = el(`<div class="toast">${esc(text)}</div>`);
      $('#gc-toasts').append(t);
      setTimeout(() => t.remove(), 2600);
    };

    /* ── 상태 흐름(컬러칩) ── */
    (cfg.strips || []).forEach((s) => { app.strips[s.id] = { ...s, current: s.initial || null }; });
    app.state = (id) => app.strips[id].current;
    /** 상태를 직접 지정(로그 남김 선택) */
    app.setState = (id, code, opts = {}) => {
      const s = app.strips[id]; const from = s.current;
      s.current = code;
      if (opts.log !== false && from !== code) {
        const m = s.machine;
        app.log('state', `${esc(s.label)}: ${from ? `${esc(GC.sm.stateName(m, from))} → ` : ''}<b>${esc(GC.sm.stateName(m, code))}</b>${opts.by ? ` <span class="faint">(${esc(opts.by)})</span>` : ''}`);
      }
    };
    /** 상태 머신 이벤트로 이동. 표에 없는 이동이면 막고 알려줌 */
    app.go = (id, event, opts = {}) => {
      const s = app.strips[id];
      try {
        const t = GC.sm.eventsFrom(s.machine, s.current).find((x) => x.event === event);
        const to = GC.sm.next(s.machine, s.current, event);
        app.setState(id, to, { by: opts.by || (t && t.label) });
        return to;
      } catch (e) {
        app.log('warn', `${esc(s.label)}: 지금 상태(${esc(GC.sm.stateName(s.machine, s.current))})에서는 할 수 없는 동작이라 서버가 막아요`);
        app.toast('지금 상태에서는 할 수 없는 동작이에요');
        return null;
      }
    };
    function paintStrips() {
      const box = $('#gc-strips');
      const list = Object.values(app.strips).filter((s) => !s.hidden);
      box.hidden = list.length === 0;
      box.innerHTML = list.map((s) => {
        const m = GC.sm.machine(s.machine);
        const main = s.main || m.main;
        const branch = s.branch || m.branch;
        const cur = s.current;
        const inMain = main.indexOf(cur);
        const lastMain = inMain >= 0 ? inMain : (s.lastMainIdx != null ? s.lastMainIdx : -1);
        if (inMain >= 0) s.lastMainIdx = inMain;
        const chip = (code, cls) => {
          const st = m.states[code] || { name: code };
          return `<div class="chip ${cls}" title="${esc(code)}"><div class="sw"></div><div class="nm">${esc(st.name)}</div><div class="cd">${esc(code)}</div></div>`;
        };
        const mainHtml = main.map((c, i) => chip(c, i === inMain ? 'is-now' : (i < (inMain >= 0 ? inMain : lastMain + 1) ? 'is-done' : 'is-todo'))).join('');
        const brHtml = branch.length ? `<div class="strip-branch"><span class="tilde">곁가지</span>${branch.map((c) => chip(c, 'is-mini ' + (c === cur ? 'is-branch-now' + ((m.stop || []).includes(c) ? ' is-stop' : '') : 'is-todo'))).join('')}</div>` : '';
        return `<div class="strip-block"><div class="strip-label"><b>${esc(s.label)}</b><span>${esc(s.note || m.name)}</span></div><div class="strip">${mainHtml}</div>${brHtml}</div>`;
      }).join('');
    }

    /* ── 지금 차례 ── */
    /** app.turn('design', '배정 대기 카드에서 담당 디자이너를 고르세요', { rules:[{k, v} | {k, policy:'design.fee'}] }) */
    app.turn = (actorId, what, opts = {}) => { app.turnInfo = { actorId, what, ...opts }; };
    app.done = (what, opts = {}) => { app.turnInfo = { done: true, what, ...opts }; };
    function paintTurn() {
      const t = app.turnInfo; const box = $('#gc-turn');
      if (!t) { box.innerHTML = ''; return; }
      if (t.done) {
        box.innerHTML = `<div class="panel-h"><h2>지금 차례</h2></div><div class="panel-b"><p class="turn-done">${t.what}</p>${t.next ? `<p class="small muted" style="margin-top:8px">${t.next}</p>` : ''}</div>`;
      } else {
        const a = actors.find((x) => x.id === t.actorId) || ACTORS[t.actorId] || { name: t.actorId, ink: 'k' };
        box.innerHTML = `<div class="panel-h"><h2>지금 차례</h2><span class="xsmall faint">다음에 움직일 사람</span></div>
          <div class="panel-b"><div class="turn-who"><i class="ink ink-${a.ink}"></i><div><div class="turn-name">${esc(a.name)}</div><div class="turn-place">${esc(a.place || '')}</div></div></div>
          <p class="turn-what">${t.what}</p>
          ${t.actorId !== app.current ? `<button class="btn btn-ink btn-block turn-go" id="gc-turn-go">${esc(a.name)} 화면 보기</button>` : ''}
          ${t.hint ? `<p class="small muted" style="margin-top:10px">${t.hint}</p>` : ''}</div>`;
        const go = box.querySelector('#gc-turn-go'); if (go) go.addEventListener('click', () => app.show(t.actorId));
      }
      const rules = t.rules || [];
      const rb = $('#gc-rules');
      rb.hidden = rules.length === 0;
      rb.querySelector('.rules').innerHTML = rules.map((r) => `<div class="rule-row"><span class="k">${r.k}</span><span class="v">${r.policy ? pv(r.policy, r.v) : (r.v || '')}</span></div>`).join('');
    }

    /* ── 역할 탭 ── */
    function paintRoles() {
      const box = $('#gc-roles');
      box.innerHTML = actors.map((a) => `<button class="role${app.turnInfo && !app.turnInfo.done && app.turnInfo.actorId === a.id ? ' has-turn' : ''}" role="tab" aria-selected="${a.id === app.current}" data-role="${a.id}"><i class="ink ink-${a.ink}"></i>${esc(a.name)}<span class="turn-dot" aria-label="지금 차례"></span></button>`).join('');
      box.querySelectorAll('[data-role]').forEach((b) => b.addEventListener('click', () => app.show(b.dataset.role)));
    }
    app.show = (id) => { app.current = id; app.refresh(); };

    /* ── 기기 프레임 + 화면 그리기 ── */
    const scrollMemo = {};
    function paintDevice() {
      const a = actors.find((x) => x.id === app.current);
      const host = $('#gc-device');
      const prevScroller = host.querySelector('.phone-screen, .desk-main');
      if (prevScroller && host.dataset.actor) scrollMemo[host.dataset.actor] = prevScroller.scrollTop;
      const f = { title: a.title || '식업', tab: a.tab || null, nav: a.navOn || (a.nav ? a.nav[0] : null), url: a.url, badges: {}, back: false, bottom: null };
      const body = document.createElement('div');
      if (a.device !== 'phone') body.className = 'stack-lg';
      const api = {
        body,
        title(t) { f.title = t; }, tab(t) { f.tab = t; }, nav(n) { f.nav = n; }, url(u) { f.url = u; }, back(b = true) { f.back = b; },
        badge(tab, n) { f.badges[tab] = n; }, bottom(html) { f.bottom = html; },
      };
      if (cfg.render) cfg.render(app.current, api, app);
      $('#gc-cap').textContent = `${a.name} · ${a.place || ''}`;
      let frame;
      if (a.device === 'phone') {
        const tabs = ['홈', '카테고리', '다시 사기', '디자인', '마이'];
        frame = el(`<div class="phone">
          <div class="phone-head"><div class="phone-status"><span>${GC.fmtTime(app.now)}</span><span>LTE ▮▮▮</span></div>
          <div class="phone-top">${f.back ? '<button class="back" aria-label="뒤로">‹</button>' : '<span class="brand-mark" style="width:24px;height:24px;font-size:13px;border-radius:6px">식</span>'}<div class="ttl">${esc(f.title)}</div><span class="xsmall faint">알림 · 장바구니</span></div></div>
          <div class="phone-screen"></div>
          <div class="phone-foot">${f.bottom ? `<div class="app-bottom">${f.bottom}</div>` : ''}<nav class="phone-tabbar" aria-label="앱 하단 탭">${tabs.map((t) => `<span class="${t === f.tab ? 'on' : ''}">${t}${f.badges[t] ? `<b class="tbadge">${f.badges[t]}</b>` : ''}</span>`).join('')}</nav></div>
        </div>`);
        frame.querySelector('.phone-screen').append(body);
      } else {
        frame = el(`<div class="desk">
          <div class="desk-bar"><span class="dots" aria-hidden="true"><i></i><i></i><i></i></span><span class="url">${esc(f.url || '')}</span></div>
          <div class="desk-app"><nav class="desk-side" aria-label="${esc(a.app || '')} 메뉴"><div class="app-name"><span class="brand-mark" style="width:22px;height:22px;font-size:12px;border-radius:5px">식</span>${esc(a.app || '')}</div>${(a.nav || []).map((n) => `<div class="nav-i${n === f.nav ? ' on' : ''}">${esc(n)}</div>`).join('')}</nav><div class="desk-main"></div></div>
        </div>`);
        frame.querySelector('.desk-main').append(body);
      }
      host.innerHTML = ''; host.append(frame); host.dataset.actor = a.id;
      const sc = frame.querySelector('.phone-screen, .desk-main');
      if (sc && scrollMemo[a.id]) sc.scrollTop = scrollMemo[a.id];
      app.lastFrame = frame;
    }
    /** 화면(본문·하단 고정 영역)의 data-act / data-change / data-input 핸들러 등록 */
    app.actions = (map) => { app._bottomMap = { ...(app._bottomMap || {}), ...map }; };

    app.refresh = () => { paintStrips(); paintRoles(); paintTurn(); paintDevice(); };
    app.reset = () => {
      Object.values(app.strips).forEach((s) => { s.current = s.initial || null; s.lastMainIdx = null; });
      app.now = new Date(START); paintClock();
      app.S = {}; app.turnInfo = null; app.current = cfg.start || actors[0].id;
      clearLog();
      if (cfg.onReset) cfg.onReset(app);
      app.refresh();
    };
    if (cfg.aside) cfg.aside($('#gc-aside'), app);

    // 화면 본문 클릭은 기기 영역 한곳에서 받음
    const deviceHost = $('#gc-device');
    bind(deviceHost, new Proxy({}, { get: (_, k) => (app._bottomMap ? app._bottomMap[k] : undefined) }));

    setTimeout(() => app.reset(), 0);
    return app;
  }

  window.UI = { mount, esc, pv, fmtPolicy, bind, el, DOMAINS, ACTORS };
})();
