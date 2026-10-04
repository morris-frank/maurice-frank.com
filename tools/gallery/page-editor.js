/* Local-only in-place text editor. server.py injects this into pages it serves under /site/; it is never deployed. */
(() => {
    const norm = (s) => s.split(/\s+/).filter(Boolean).join(' ');
    const fields = [...document.querySelectorAll('[data-edit]')];
    const original = new Map(fields.map((el) => [el, norm(el.textContent)]));
    let file = decodeURIComponent(location.pathname.slice('/site/'.length));
    if (!file || file.endsWith('/')) file += 'index.html';
    let editing = false;
    const touched = new Set(); /* the page's own scripts rewrite some texts (audio durations), so only typed-in elements count */

    const style = document.createElement('style');
    style.textContent = `
        .page-editor { position: fixed; z-index: 2147483647; right: 16px; bottom: 16px; display: flex; gap: 10px; align-items: center;
            padding: 8px 12px; background: #2d2825; color: #f4f1ec; font: 13px/1.4 system-ui, sans-serif; }
        .page-editor a { color: inherit; }
        .page-editor button { font: inherit; }
        body.is-editing [data-edit] { outline: 1px dashed #d78a7a; outline-offset: 2px; cursor: text; }
        body.is-editing [data-edit].is-changed { outline: 2px solid #d78a7a; }`;
    const bar = document.createElement('div');
    bar.className = 'page-editor';
    bar.innerHTML = `<a href="/">Image order</a>
        <label><input type="checkbox"> Edit texts</label>
        <button type="button" disabled>Save &amp; commit</button>
        <span></span>`;
    const [toggle, saveBtn, statusEl] = bar.querySelectorAll('input, button, span');
    statusEl.textContent = sessionStorage.getItem('page-editor-status') || '';
    sessionStorage.removeItem('page-editor-status');
    document.head.appendChild(style);
    document.body.appendChild(bar);

    const changed = () => [...touched].filter((el) => norm(el.textContent) !== original.get(el));

    toggle.onchange = () => {
        editing = toggle.checked;
        document.body.classList.toggle('is-editing', editing);
        fields.forEach((el) => { el.contentEditable = editing ? 'plaintext-only' : 'false'; });
    };
    /* While editing, links and buttons on the page only place the caret. */
    document.addEventListener('click', (e) => {
        if (editing && !bar.contains(e.target) && e.target.closest('a, button')) {
            e.preventDefault();
            e.stopPropagation();
        }
    }, true);
    document.addEventListener('keydown', (e) => {
        if (editing && e.key === 'Enter' && e.target.closest?.('[data-edit]')) e.preventDefault();
    }, true);
    document.addEventListener('input', (e) => {
        const el = e.target.closest?.('[data-edit]');
        if (!el) return;
        touched.add(el);
        el.classList.toggle('is-changed', norm(el.textContent) !== original.get(el));
        const n = changed().length;
        saveBtn.disabled = !n;
        statusEl.textContent = n ? `${n} unsaved` : '';
    });
    window.addEventListener('beforeunload', (e) => { if (changed().length) e.preventDefault(); });

    saveBtn.onclick = async () => {
        const edits = changed().map((el) => ({ start: Number(el.dataset.edit), old: original.get(el), new: norm(el.textContent) }));
        if (edits.some((e) => !e.new)) {
            statusEl.textContent = 'A text cannot be empty';
            return;
        }
        const res = await fetch('/edits', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ file, edits }),
        });
        const body = await res.json();
        if (!res.ok) {
            statusEl.textContent = body.error;
            return;
        }
        fields.forEach((el) => original.set(el, norm(el.textContent)));
        sessionStorage.setItem('page-editor-status', `Committed ${edits.length} edit${edits.length > 1 ? 's' : ''} to ${file}`);
        location.reload();
    };
})();
