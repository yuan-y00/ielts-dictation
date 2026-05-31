/**
 * IELTS Dictation Practice
 *
 * nice-pdf inspired layout:
 *   Essay block: badge → topic (h2) → topic CN → title line (small)
 *   Sentence row: en + cn + input (flush) | 🔊 ✏️
 *   Task2 → navy blue  |  Task1 → sage green
 */

const App = (() => {
    let data = null;
    let activeEid = null;
    let activeIdx = -1;
    let auto = false;
    let busy = false;

    const $ = (s) => document.querySelector(s);
    const $$ = (s) => document.querySelectorAll(s);
    let D = {};

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
            const r = await fetch('data/simon-writing.json');
            if (r.ok) data = await r.json();
        } catch (e) {
            D.cards.innerHTML = '<p style="padding:40px;text-align:center;color:#C5644A;">⚠️ Failed to load data. Run via local server.</p>';
            return;
        }

        renderTabs();
        renderInfo();
        renderAll();
        renderAutoBtn();
        bind();
        restorePos();

        const total = data.essays.reduce((n, e) => n + e.sentences.length, 0);
        console.log('[App]', data.essays.length, 'essays,', total, 'sentences');
    }

    // ======== Render ========

    function renderTabs() {
        D.tabs.innerHTML = `<button class="section-tab active">${data.icon} ${data.title}</button>`;
    }

    function renderInfo() {
        D.icon.textContent = data.icon;
        D.title.textContent = data.title;
        let all = 0, done = 0;
        for (const e of data.essays)
            for (let i = 0; i < e.sentences.length; i++) {
                all++;
                if (Storage.isCompleted(e.id, i)) done++;
            }
        D.pfill.style.width = all ? `${Math.round(done/all*100)}%` : '0%';
        D.ptext.textContent = `${done}/${all}`;
    }

    function renderAll() {
        D.cards.innerHTML = data.essays.map(renderEssay).join('');
    }

    // ======== Essay Block ========

    function renderEssay(essay) {
        const t2 = essay.taskType === 'task2';
        const cls = t2 ? 't2' : 't1';
        const typeLabel = t2 ? 'Task 2 · 大作文' : `Task 1 · 小作文 · ${essay.chartType || ''}`;

        return `
        <div class="essay-block ${cls}" id="essay-${essay.id}">
            <div class="essay-header">
                <div class="essay-topic">${esc(essay.topic)}</div>
                <div class="essay-topic-cn">${esc(essay.topicCn)}</div>
                <div class="essay-meta-line">
                    <span class="essay-meta-type">${typeLabel}</span>
                    <span class="essay-meta-title">${esc(essay.title)}</span>
                    <span class="essay-meta-title-cn">${esc(essay.titleCn)}</span>
                </div>
            </div>
            <div class="essay-body">
                ${essay.sentences.map((s, i) => renderRow(essay, i, s)).join('')}
            </div>
        </div>`;
    }

    // ======== Sentence Row ========

    function renderRow(essay, idx, sent) {
        const done = Storage.isCompleted(essay.id, idx);
        const act = essay.id === activeEid && idx === activeIdx;
        const cls = [done ? 'completed' : '', act ? 'active' : ''].filter(Boolean).join(' ');

        return `
        <div class="sentence-row ${cls}" id="row-${essay.id}-${idx}" data-essay="${essay.id}" data-idx="${idx}">
            <div class="sentence-main">
                <p class="sentence-en">${esc(sent.english)}</p>
                <p class="sentence-cn">${esc(sent.chinese)}</p>
                <textarea class="sentence-input"
                          id="inp-${essay.id}-${idx}"
                          data-essay="${essay.id}" data-idx="${idx}"
                          placeholder="Type here, press Enter…"
                          rows="1"
                          ${done ? 'disabled' : ''}
                >${done ? esc(sent.english) : ''}</textarea>
                <div class="sentence-cmp${done ? ' show ok' : ''}" id="cmp-${essay.id}-${idx}">
                    ${done ? '✓' : ''}
                </div>
            </div>
            <div class="sentence-actions">
                ${done
                    ? '<span class="done-mark">✓</span>'
                    : `<button class="btn-icon spk" data-essay="${essay.id}" data-idx="${idx}" title="Play">🔊</button>
                       <button class="btn-icon pen" data-essay="${essay.id}" data-idx="${idx}" title="Copy">✏️</button>`}
            </div>
        </div>`;
    }

    // ======== Events ========

    function bind() {
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

    function findE(eid) { return data?.essays.find(x => x.id === eid); }

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
            if (!e?.sentences[idx]) { busy = false; return; }
            const inp = $(`#inp-${eid}-${idx}`);
            if (!inp) { busy = false; return; }
            const val = inp.value.trim();
            if (!val) { moveNext(eid, idx); busy = false; return; }

            const exp = e.sentences[idx].english;
            if (compare(val, exp)) {
                Storage.markCompleted(e.id, idx);
                inp.classList.add('correct');
                inp.disabled = true;
                const row = $(`#row-${eid}-${idx}`);
                if (row) { row.classList.add('completed'); row.querySelector('.sentence-actions').innerHTML = '<span class="done-mark">✓</span>'; }
                const cmp = $(`#cmp-${eid}-${idx}`);
                if (cmp) { cmp.className = 'sentence-cmp show ok'; cmp.textContent = '✓ Perfect!'; }
                toast('✓ Perfect!', 'ok');
                renderInfo();
                setTimeout(() => moveNext(eid, idx), 180);
            } else {
                inp.classList.add('wrong');
                showDiff(eid, idx, val, exp);
                toast('Check differences below', 'info');
                setTimeout(() => inp.classList.remove('wrong'), 1500);
            }
        } finally { busy = false; }
    }

    function moveNext(eid, curIdx) {
        let e = findE(eid);
        // Next in same essay
        let ni = curIdx + 1;
        while (ni < e.sentences.length && Storage.isCompleted(e.id, ni)) ni++;
        if (ni < e.sentences.length) {
            setActive(eid, ni);
            focusScroll(eid, ni);
            // Always play the audio for the next sentence
            setTimeout(() => speaker(eid, ni), 200);
            return;
        }
        // Next essay
        const ei = data.essays.findIndex(x => x.id === eid);
        for (let j = ei + 1; j < data.essays.length; j++) {
            const ne = data.essays[j];
            for (let k = 0; k < ne.sentences.length; k++) {
                if (!Storage.isCompleted(ne.id, k)) {
                    setActive(ne.id, k);
                    focusScroll(ne.id, k);
                    setTimeout(() => speaker(ne.id, k), 200);
                    return;
                }
            }
        }
        // Done
        toast('🎉 All essays complete!', 'ok');
        activeEid = null; activeIdx = -1;
        renderAll(); renderInfo();
    }

    function replay() {
        if (!activeEid || activeIdx < 0) { toast('Click 🔊 or ✏️ first', 'info'); return; }
        speaker(activeEid, activeIdx);
    }

    function reset() {
        if (!confirm('Reset ALL progress?')) return;
        Storage.resetAll();
        activeEid = null; activeIdx = -1;
        renderAll(); renderInfo();
        toast('🔄 Progress reset', 'info');
    }

    function toggleAuto() {
        auto = !auto;
        Storage.saveSettings({ ...Storage.loadSettings(), autoMode: auto });
        renderAutoBtn();
        toast(auto ? '▶ Auto ON' : '⏸ Auto OFF', 'info');
    }

    // ======== Helpers ========

    function setActive(eid, idx) {
        if (activeEid && activeIdx >= 0) {
            const old = $(`#row-${activeEid}-${activeIdx}`);
            if (old) old.classList.remove('active');
        }
        activeEid = eid; activeIdx = idx;
        const row = $(`#row-${eid}-${idx}`);
        if (row) row.classList.add('active');
        Storage.saveSettings({ ...Storage.loadSettings(), lastEid: eid, lastIdx: idx });
    }

    function focusScroll(eid, idx) {
        const inp = $(`#inp-${eid}-${idx}`);
        if (inp && !inp.disabled) inp.focus();
        const row = $(`#row-${eid}-${idx}`);
        if (row) row.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    function restorePos() {
        const s = Storage.loadSettings();
        if (s.lastEid && s.lastIdx >= 0) {
            const e = findE(s.lastEid);
            if (e && s.lastIdx < e.sentences.length && !Storage.isCompleted(e.id, s.lastIdx)) {
                activeEid = s.lastEid; activeIdx = s.lastIdx;
                setTimeout(() => {
                    const row = $(`#row-${activeEid}-${activeIdx}`);
                    if (row) { row.classList.add('active'); row.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
                }, 500);
            }
        }
    }

    function normalize(s) {
        // lowercase, normalize whitespace, strip trailing punctuation
        // Also normalize spacing around punctuation: "word,word" → "word, word"
        return s.trim().toLowerCase()
            .replace(/[,;:]/g, ' $& ')    // pad commas/semicolons/colons with spaces
            .replace(/[.!?]+$/g, '')       // drop trailing .!?
            .replace(/\s+/g, ' ')          // collapse spaces
            .replace(/['']/g, "'")
            .replace(/[""]/g, '"')
            .trim();
    }

    function compare(a, b) {
        return normalize(a) === normalize(b);
    }

    // Split into tokens, keeping punctuation as separate tokens for comparison
    function tokenize(s) {
        return s.trim().toLowerCase()
            .replace(/([,;:.!?])/g, ' $1 ')  // split punctuation to own tokens
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
            const a = (uw[i] || '');
            const b = (ew[i] || '');
            if (i >= uw.length) h += ` <span class="diff-word" style="color:#E07A5F;">[缺]</span>`;
            else if (i >= ew.length) h += ` <span class="diff-word diff-bad">${esc(uw[i])}</span>`;
            else if (a === b) h += ` ${esc(uw[i])}`;
            else h += ` <span class="diff-word diff-ok" title="参考: ${esc(ew[i])}">${esc(uw[i])}</span>`;
        }
        cmp.innerHTML = `<strong>参考:</strong> ${esc(exp)}<br><strong>你写:</strong> ${h.trim()}`;
    }

    function renderAutoBtn() {
        D.bAuto.innerHTML = auto
            ? '<span style="font-size:0.9rem;">⏸</span><span>Auto: ON</span>'
            : '<span style="font-size:0.9rem;">▶</span><span>Auto Dictation</span>';
        D.bAuto.classList.toggle('active', auto);
    }

    function toast(msg, type) {
        const t = document.createElement('div');
        t.className = `toast ${type}`;
        t.textContent = msg;
        D.toast.appendChild(t);
        setTimeout(() => t.remove(), 2200);
    }

    function scrollWatch() {
        let b = $('.btn-scroll-top');
        if (window.scrollY > 500) {
            if (!b) {
                b = document.createElement('button');
                b.className = 'btn-scroll-top visible';
                b.textContent = '⬆';
                b.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
                document.body.appendChild(b);
            }
            b.classList.add('visible');
        } else if (b) { b.classList.remove('visible'); }
    }

    function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

    return { init };
})();

document.addEventListener('DOMContentLoaded', () => App.init());
