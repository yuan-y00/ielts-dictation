/**
 * IELTS Dictation Practice
 * Supports multiple learning sections and dialogue role labels.
 */

const App = (() => {
    const DATA_SOURCES = [
        'data/jabx-interview.json',
        'data/simon-writing.json',
    ];

    let sections = [];
    let currentSectionIndex = 0;
    let activeEid = null;
    let activeIdx = -1;
    let auto = false;
    let busy = false;

    const $ = (s) => document.querySelector(s);
    let D = {};

    const currentData = () => sections[currentSectionIndex];

    // ======== Init ========
    async function init() {
        D.tabs = $('#section-tabs');
        D.icon = $('#section-icon');
        D.title = $('#section-title');
        D.pfill = $('#progress-fill');
        D.ptext = $('#progress-text');
        D.cards = $('#cards-container');
        D.bAuto = $('#btn-auto');
        D.bReplay = $('#btn-replay');
        D.bReset = $('#btn-reset');
        D.toast = $('#toast-container');

        const s = Storage.loadSettings();
        auto = s.autoMode || false;

        try {
            sections = await loadSections();
        } catch (e) {
            console.warn('[App] Failed to load data:', e);
            D.cards.innerHTML = '<p class="load-error">Failed to load data. Run via local server.</p>';
            return;
        }

        const savedIndex = sections.findIndex(section => section.id === s.lastSectionId);
        currentSectionIndex = savedIndex >= 0 ? savedIndex : 0;

        renderTabs();
        renderInfo();
        renderAll();
        renderAutoBtn();
        bind();
        restorePos();

        const total = sections.reduce((n, section) =>
            n + section.essays.reduce((m, e) => m + e.sentences.length, 0), 0);
        console.log('[App]', sections.length, 'sections,', total, 'sentences');
    }

    async function loadSections() {
        const loaded = await Promise.all(DATA_SOURCES.map(async (url) => {
            const r = await fetch(url);
            if (!r.ok) throw new Error(`Could not load ${url}`);
            return r.json();
        }));
        return loaded;
    }

    // ======== Render ========

    function renderTabs() {
        D.tabs.innerHTML = sections.map((section, index) => `
            <button class="section-tab ${index === currentSectionIndex ? 'active' : ''}"
                    data-section="${index}">
                <span class="tab-icon">${esc(section.icon || '')}</span>
                <span>${esc(section.title)}</span>
            </button>
        `).join('');
    }

    function renderInfo() {
        const data = currentData();
        D.icon.textContent = data.icon || '';
        D.title.textContent = data.title;
        let all = 0, done = 0;
        for (const e of data.essays) {
            for (let i = 0; i < e.sentences.length; i++) {
                all++;
                if (Storage.isCompleted(e.id, i)) done++;
            }
        }
        D.pfill.style.width = all ? `${Math.round(done / all * 100)}%` : '0%';
        D.ptext.textContent = `${done}/${all}`;
    }

    function renderAll() {
        D.cards.innerHTML = currentData().essays.map(renderEssay).join('');
    }

    // ======== Lesson Block ========

    function renderEssay(essay) {
        const cls = lessonClass(essay);
        const typeLabel = lessonLabel(essay);
        const topicCn = essay.topicCn ? `<div class="essay-topic-cn">${esc(essay.topicCn)}</div>` : '';
        const metaTitle = essay.title ? `<span class="essay-meta-title">${esc(essay.title)}</span>` : '';
        const metaTitleCn = essay.titleCn ? `<span class="essay-meta-title-cn">${esc(essay.titleCn)}</span>` : '';

        return `
        <div class="essay-block ${cls}" id="essay-${essay.id}">
            <div class="essay-header">
                <div class="essay-topic">${esc(essay.topic || essay.title)}</div>
                ${topicCn}
                <div class="essay-meta-line">
                    <span class="essay-meta-type">${esc(typeLabel)}</span>
                    ${metaTitle}
                    ${metaTitleCn}
                </div>
            </div>
            <div class="essay-body">
                ${essay.sentences.map((s, i) => renderRow(essay, i, s)).join('')}
            </div>
        </div>`;
    }

    function lessonClass(essay) {
        if (essay.taskType === 'task2') return 't2';
        if (essay.taskType === 'task1') return 't1';
        return 'dialogue';
    }

    function lessonLabel(essay) {
        if (essay.taskType === 'task2') return 'Task 2';
        if (essay.taskType === 'task1') return `Task 1${essay.chartType ? ` - ${essay.chartType}` : ''}`;
        if (essay.taskType === 'dialogue') return 'Dialogue Practice';
        return 'Practice';
    }

    // ======== Sentence Row ========

    function renderRow(essay, idx, sent) {
        const done = Storage.isCompleted(essay.id, idx);
        const act = essay.id === activeEid && idx === activeIdx;
        const rowClasses = [
            done ? 'completed' : '',
            act ? 'active' : '',
            sent.role ? `role-${sent.role.toLowerCase()}` : '',
        ].filter(Boolean).join(' ');
        const roleBadge = sent.role
            ? `<span class="role-badge">${esc(sent.role)}</span>`
            : '';
        const chinese = sent.chinese
            ? `<p class="sentence-cn">${esc(sent.chinese)}</p>`
            : '';

        return `
        <div class="sentence-row ${rowClasses}" id="row-${essay.id}-${idx}" data-essay="${essay.id}" data-idx="${idx}">
            <div class="sentence-main">
                ${roleBadge}
                <p class="sentence-en">${esc(sent.english)}</p>
                ${chinese}
                ${done
                    ? ''
                    : `<textarea class="sentence-input"
                          id="inp-${essay.id}-${idx}"
                          data-essay="${essay.id}" data-idx="${idx}"
                          placeholder="Type here, press Enter"
                          rows="1"
                    ></textarea>
                    <div class="sentence-cmp" id="cmp-${essay.id}-${idx}"></div>`}
            </div>
            <div class="sentence-actions">
                <button class="btn-icon spk" data-essay="${essay.id}" data-idx="${idx}" title="Play">▶</button>
                ${done
                    ? '<span class="done-mark">✓</span>'
                    : `<button class="btn-icon pen" data-essay="${essay.id}" data-idx="${idx}" title="Copy">✎</button>`}
            </div>
        </div>`;
    }

    // ======== Events ========

    function bind() {
        D.tabs.addEventListener('click', e => {
            const tab = e.target.closest('.section-tab');
            if (!tab) return;
            switchSection(+tab.dataset.section);
        });

        D.cards.addEventListener('click', e => {
            const spk = e.target.closest('.btn-icon.spk');
            if (spk) { speaker(spk.dataset.essay, +spk.dataset.idx); return; }
            const pen = e.target.closest('.btn-icon.pen');
            if (pen) { copyStart(pen.dataset.essay, +pen.dataset.idx); return; }
        });

        D.cards.addEventListener('keydown', e => {
            if (e.key === 'Enter' && !e.shiftKey) {
                const inp = e.target.closest('.sentence-input');
                if (!inp) return;
                e.preventDefault();
                onEnter(inp.dataset.essay, +inp.dataset.idx);
            }
        });

        D.bAuto.addEventListener('click', toggleAuto);
        D.bReplay.addEventListener('click', replay);
        D.bReset.addEventListener('click', reset);
        window.addEventListener('scroll', scrollWatch);
    }

    // ======== Handlers ========

    function switchSection(index) {
        if (index === currentSectionIndex || !sections[index]) return;
        currentSectionIndex = index;
        activeEid = null;
        activeIdx = -1;
        Storage.saveSettings({
            ...Storage.loadSettings(),
            lastSectionId: currentData().id,
            lastEid: null,
            lastIdx: -1,
        });
        renderTabs();
        renderInfo();
        renderAll();
        restorePos();
    }

    function findE(eid) {
        return currentData()?.essays.find(x => x.id === eid);
    }

    async function speaker(eid, idx) {
        const e = findE(eid);
        if (!e?.sentences[idx]) return;
        setActive(eid, idx);
        const btn = document.querySelector(`.btn-icon.spk[data-essay="${eid}"][data-idx="${idx}"]`);
        if (btn) btn.classList.add('playing');
        await TTS.speak(e.sentences[idx].english, { rate: 0.82 });
        if (btn) btn.classList.remove('playing');
    }

    async function copyStart(eid, idx) {
        const e = findE(eid);
        if (!e?.sentences[idx]) return;
        setActive(eid, idx);
        const inp = $(`#inp-${eid}-${idx}`);
        if (inp) { inp.focus(); inp.select(); }
        const btn = document.querySelector(`.btn-icon.spk[data-essay="${eid}"][data-idx="${idx}"]`);
        if (btn) btn.classList.add('playing');
        await TTS.speak(e.sentences[idx].english, { rate: 0.82 });
        if (btn) btn.classList.remove('playing');
    }

    async function onEnter(eid, idx) {
        if (busy) return;
        busy = true;
        try {
            const e = findE(eid);
            if (!e?.sentences[idx]) return;
            const inp = $(`#inp-${eid}-${idx}`);
            if (!inp) return;
            const val = inp.value.trim();
            if (!val) { moveNext(eid, idx); return; }

            const exp = e.sentences[idx].english;
            if (compare(val, exp)) {
                Storage.markCompleted(e.id, idx);
                const row = $(`#row-${eid}-${idx}`);
                if (row) {
                    row.classList.add('completed');
                    const inpEl = row.querySelector('.sentence-input');
                    const cmpEl = row.querySelector('.sentence-cmp');
                    if (inpEl) inpEl.remove();
                    if (cmpEl) cmpEl.remove();
                    const penBtn = row.querySelector('.btn-icon.pen');
                    if (penBtn) {
                        const done = document.createElement('span');
                        done.className = 'done-mark';
                        done.textContent = '✓';
                        penBtn.replaceWith(done);
                    }
                }
                toast('Perfect!', 'ok');
                renderInfo();
                setTimeout(() => moveNext(eid, idx), 180);
            } else {
                inp.classList.add('wrong');
                showDiff(eid, idx, val, exp);
                toast('Check differences below', 'info');
                setTimeout(() => inp.classList.remove('wrong'), 1500);
            }
        } finally {
            busy = false;
        }
    }

    function moveNext(eid, curIdx) {
        const e = findE(eid);
        if (!e) return;

        let ni = curIdx + 1;
        while (ni < e.sentences.length && Storage.isCompleted(e.id, ni)) ni++;
        if (ni < e.sentences.length) {
            setActive(eid, ni);
            focusScroll(eid, ni);
            setTimeout(() => speaker(eid, ni), 200);
            return;
        }

        const essays = currentData().essays;
        const ei = essays.findIndex(x => x.id === eid);
        for (let j = ei + 1; j < essays.length; j++) {
            const ne = essays[j];
            for (let k = 0; k < ne.sentences.length; k++) {
                if (!Storage.isCompleted(ne.id, k)) {
                    setActive(ne.id, k);
                    focusScroll(ne.id, k);
                    setTimeout(() => speaker(ne.id, k), 200);
                    return;
                }
            }
        }

        toast('Current section complete!', 'ok');
        activeEid = null;
        activeIdx = -1;
        renderAll();
        renderInfo();
    }

    function replay() {
        if (!activeEid || activeIdx < 0) { toast('Click play or copy first', 'info'); return; }
        speaker(activeEid, activeIdx);
    }

    function reset() {
        const data = currentData();
        if (!confirm(`Reset progress for "${data.title}"?`)) return;
        for (const essay of data.essays) Storage.resetSection(essay.id);
        activeEid = null;
        activeIdx = -1;
        renderAll();
        renderInfo();
        toast('Progress reset', 'info');
    }

    function toggleAuto() {
        auto = !auto;
        Storage.saveSettings({ ...Storage.loadSettings(), autoMode: auto });
        renderAutoBtn();
        toast(auto ? 'Auto ON' : 'Auto OFF', 'info');
    }

    // ======== Helpers ========

    function setActive(eid, idx) {
        if (activeEid && activeIdx >= 0) {
            const old = $(`#row-${activeEid}-${activeIdx}`);
            if (old) old.classList.remove('active');
        }
        activeEid = eid;
        activeIdx = idx;
        const row = $(`#row-${eid}-${idx}`);
        if (row) row.classList.add('active');
        Storage.saveSettings({
            ...Storage.loadSettings(),
            lastSectionId: currentData().id,
            lastEid: eid,
            lastIdx: idx,
        });
    }

    function focusScroll(eid, idx) {
        const inp = $(`#inp-${eid}-${idx}`);
        if (inp && !inp.disabled) inp.focus();
        const row = $(`#row-${eid}-${idx}`);
        if (row) row.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    function restorePos() {
        const s = Storage.loadSettings();
        if (s.lastSectionId !== currentData().id) return;
        if (s.lastEid && s.lastIdx >= 0) {
            const e = findE(s.lastEid);
            if (e && s.lastIdx < e.sentences.length && !Storage.isCompleted(e.id, s.lastIdx)) {
                activeEid = s.lastEid;
                activeIdx = s.lastIdx;
                setTimeout(() => {
                    const row = $(`#row-${activeEid}-${activeIdx}`);
                    if (row) {
                        row.classList.add('active');
                        row.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                }, 500);
            }
        }
    }

    function normalize(s) {
        return s.trim().toLowerCase()
            .replace(/[,;:]/g, ' $& ')
            .replace(/[.!?]+$/g, '')
            .replace(/\s+/g, ' ')
            .replace(/['']/g, "'")
            .replace(/[""]/g, '"')
            .trim();
    }

    function compare(a, b) {
        return normalize(a) === normalize(b);
    }

    function tokenize(s) {
        return s.trim().toLowerCase()
            .replace(/([,;:.!?])/g, ' $1 ')
            .replace(/\s+/g, ' ')
            .trim()
            .split(' ');
    }

    function showDiff(eid, idx, user, exp) {
        const cmp = $(`#cmp-${eid}-${idx}`);
        if (!cmp) return;
        cmp.className = 'sentence-cmp show err';
        const uw = tokenize(user);
        const ew = tokenize(exp);
        const max = Math.max(uw.length, ew.length);
        let h = '';
        for (let i = 0; i < max; i++) {
            const a = uw[i] || '';
            const b = ew[i] || '';
            if (i >= uw.length) h += ` <span class="diff-word" style="color:#E07A5F;">[missing]</span>`;
            else if (i >= ew.length) h += ` <span class="diff-word diff-bad">${esc(uw[i])}</span>`;
            else if (a === b) h += ` ${esc(uw[i])}`;
            else h += ` <span class="diff-word diff-ok" title="Expected: ${esc(ew[i])}">${esc(uw[i])}</span>`;
        }
        cmp.innerHTML = `<strong>Expected:</strong> ${esc(exp)}<br><strong>You typed:</strong> ${h.trim()}`;
    }

    function renderAutoBtn() {
        D.bAuto.innerHTML = auto
            ? '<span class="btn-icon-text">Pause</span><span>Auto: ON</span>'
            : '<span class="btn-icon-text">Play</span><span>Auto Dictation</span>';
        D.bAuto.classList.toggle('active', auto);
    }

    function toast(msg, type) {
        const t = document.createElement('div');
        t.className = `toast ${type}`;
        t.textContent = msg;
        D.toast.appendChild(t);
        setTimeout(() => t.remove(), 2200);
    }

    function jumpToFirstUndone() {
        const data = currentData();
        if (!data) return;
        for (const essay of data.essays) {
            for (let i = 0; i < essay.sentences.length; i++) {
                if (!Storage.isCompleted(essay.id, i)) {
                    const row = $(`#row-${essay.id}-${i}`);
                    if (row) row.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    return;
                }
            }
        }
        toast('Current section complete!', 'ok');
    }

    function scrollWatch() {
        let nav = $('.float-nav');
        if (window.scrollY > 400) {
            if (!nav) {
                nav = document.createElement('div');
                nav.className = 'float-nav visible';
                nav.innerHTML = `
                    <button class="nav-half" title="Jump to first unfinished">⌖</button>
                    <div class="nav-divider"></div>
                    <button class="nav-half" title="Back to top">↑</button>`;
                nav.children[0].addEventListener('click', jumpToFirstUndone);
                nav.children[2].addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
                document.body.appendChild(nav);
            }
            nav.classList.add('visible');
        } else if (nav) {
            nav.classList.remove('visible');
        }
    }

    function esc(s) {
        const d = document.createElement('div');
        d.textContent = s == null ? '' : String(s);
        return d.innerHTML;
    }

    return { init };
})();

document.addEventListener('DOMContentLoaded', () => App.init());
