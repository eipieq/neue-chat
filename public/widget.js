(function () {
  'use strict';

  // ── Config ─────────────────────────────────────────────────────────────────
  const _s = document.currentScript;
  const API = (_s && _s.getAttribute('data-api')) ||
    (_s && _s.src ? new URL(_s.src).origin : window.location.origin);

  const SESSION_ID = 'nw-' + Math.random().toString(36).slice(2, 9);
  const TOKEN_LIMIT = 4000; // tokens per session (≈ 4 chars each)
  const C = {
    bg:       '#111111',
    surface:  '#1a1a1a',
    border:   '#262626',
    text:     '#e8e8e8',
    muted:    '#666',
    accent:   '#d4ff58',
    accentFg: '#0e0e0e',
    emerald:  '#34d399',
  };

  let messages   = [];
  let streaming  = false;
  let panelOpen  = false;
  let sessionChars = 0;

  // ── Inject styles ──────────────────────────────────────────────────────────
  const style = document.createElement('style');
  style.textContent = `
    #nw-messages::-webkit-scrollbar{width:4px}
    #nw-messages::-webkit-scrollbar-track{background:transparent}
    #nw-messages::-webkit-scrollbar-thumb{background:#333;border-radius:4px}
    @keyframes nw-bounce{0%,80%,100%{transform:scale(.8);opacity:.4}40%{transform:scale(1);opacity:1}}
    #nw-close:hover{background:rgba(255,255,255,.06)!important}
    .nw-chip:hover{border-color:#444!important;color:#e8e8e8!important}
    @media(max-width:440px){#nw-panel{width:calc(100vw - 24px)!important;right:12px!important;left:12px!important}}
  `;
  document.head.appendChild(style);

  // ── Floating button ────────────────────────────────────────────────────────
  const btn = document.createElement('button');
  Object.assign(btn.style, {
    position:'fixed', bottom:'24px', right:'24px',
    width:'52px', height:'52px', borderRadius:'50%',
    background:C.accent, border:'none', cursor:'pointer',
    display:'flex', alignItems:'center', justifyContent:'center',
    zIndex:'2147483646',
    boxShadow:'0 4px 20px rgba(0,0,0,.45)',
    transition:'transform .18s',
  });
  btn.setAttribute('aria-label', 'Open Neue World chat');
  setIcon(btn, 'chat');
  btn.onmouseenter = () => btn.style.transform = 'scale(1.06)';
  btn.onmouseleave = () => btn.style.transform = 'scale(1)';

  // ── Panel ──────────────────────────────────────────────────────────────────
  const panel = document.createElement('div');
  panel.id = 'nw-panel';
  Object.assign(panel.style, {
    position:'fixed', bottom:'88px', right:'24px',
    width:'360px', height:'520px',
    background:C.bg, border:`1px solid ${C.border}`, borderRadius:'16px',
    display:'flex', flexDirection:'column',
    zIndex:'2147483645',
    overflow:'hidden',
    boxShadow:'0 12px 48px rgba(0,0,0,.6)',
    opacity:'0', transform:'translateY(14px) scale(.97)',
    pointerEvents:'none',
    transition:'opacity .2s, transform .2s',
    fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif',
    fontSize:'14px', color:C.text, lineHeight:'1.5',
    boxSizing:'border-box',
  });

  // Header
  const header = document.createElement('div');
  Object.assign(header.style, {
    display:'flex', alignItems:'center', gap:'10px',
    padding:'14px 16px', borderBottom:`1px solid ${C.border}`, flexShrink:'0',
  });
  header.innerHTML = `
    <div style="width:30px;height:30px;border-radius:50%;background:${C.accent};display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;color:${C.accentFg};flex-shrink:0">N</div>
    <div style="flex:1;min-width:0">
      <div style="font-size:13px;font-weight:600;color:${C.text}">Neue World</div>
      <div style="font-size:11px;color:${C.muted};display:flex;align-items:center;gap:5px">
        <span style="width:5px;height:5px;border-radius:50%;background:${C.emerald};display:inline-block"></span>Online
      </div>
    </div>
    <button id="nw-close" style="background:none;border:none;cursor:pointer;color:${C.muted};padding:5px;border-radius:6px;display:flex;align-items:center;line-height:0;transition:background .15s">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </button>`;

  // Messages
  const feed = document.createElement('div');
  feed.id = 'nw-messages';
  Object.assign(feed.style, {
    flex:'1', overflowY:'auto', padding:'16px',
    display:'flex', flexDirection:'column', gap:'12px',
  });

  // Empty state
  const empty = document.createElement('div');
  Object.assign(empty.style, {
    display:'flex', flexDirection:'column', alignItems:'center',
    justifyContent:'center', height:'100%', gap:'12px', textAlign:'center',
  });
  empty.innerHTML = `
    <div style="font-size:18px;font-weight:600;letter-spacing:-.5px">neue world</div>
    <div style="font-size:12px;color:${C.muted};max-width:200px;line-height:1.6">Ask about our services, team, or how to get started.</div>
    <div style="display:flex;flex-wrap:wrap;gap:6px;justify-content:center">
      ${['What services do you offer?','How much does it cost?','Show me past work','How do I get started?'].map(q =>
        `<button class="nw-chip" data-q="${q}" style="font-size:11px;padding:5px 11px;border-radius:20px;border:1px solid ${C.border};background:none;color:${C.muted};cursor:pointer;transition:all .15s;font-family:inherit">${q}</button>`
      ).join('')}
    </div>`;

  // Input area
  const inputWrap = document.createElement('div');
  Object.assign(inputWrap.style, {
    padding:'12px', borderTop:`1px solid ${C.border}`,
    display:'flex', gap:'8px', flexShrink:'0',
  });

  const inp = document.createElement('input');
  inp.placeholder = 'Ask anything…';
  Object.assign(inp.style, {
    flex:'1', background:C.surface, border:`1px solid ${C.border}`,
    borderRadius:'10px', color:C.text, fontSize:'13px',
    padding:'10px 12px', outline:'none', fontFamily:'inherit',
    transition:'border-color .15s',
  });
  inp.onfocus = () => inp.style.borderColor = '#444';
  inp.onblur  = () => inp.style.borderColor = C.border;

  const sendBtn = document.createElement('button');
  Object.assign(sendBtn.style, {
    width:'38px', height:'38px', background:C.accent, border:'none',
    borderRadius:'10px', cursor:'pointer', display:'flex',
    alignItems:'center', justifyContent:'center', flexShrink:'0',
    transition:'opacity .15s',
  });
  sendBtn.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="${C.accentFg}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`;

  inputWrap.append(inp, sendBtn);
  panel.append(header, feed, inputWrap);
  feed.appendChild(empty);
  document.body.append(btn, panel);

  // ── Icon helpers ───────────────────────────────────────────────────────────
  function setIcon(el, type) {
    el.innerHTML = type === 'chat'
      ? `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="${C.accentFg}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`
      : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${C.accentFg}" stroke-width="2.2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
  }

  // ── Panel open/close ───────────────────────────────────────────────────────
  function open() {
    panelOpen = true;
    Object.assign(panel.style, { opacity:'1', transform:'translateY(0) scale(1)', pointerEvents:'auto' });
    setIcon(btn, 'close');
    inp.focus();
  }
  function close() {
    panelOpen = false;
    Object.assign(panel.style, { opacity:'0', transform:'translateY(14px) scale(.97)', pointerEvents:'none' });
    setIcon(btn, 'chat');
  }

  btn.addEventListener('click', () => panelOpen ? close() : open());
  panel.querySelector('#nw-close').addEventListener('click', close);

  // Chip clicks
  empty.querySelectorAll('.nw-chip').forEach(c =>
    c.addEventListener('click', () => send(c.getAttribute('data-q')))
  );

  // ── Markdown renderer ──────────────────────────────────────────────────────
  function md(text) {
    return text
      .replace(/<LEAD_CAPTURE>[\s\S]*?<\/LEAD_CAPTURE>/g, '')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/^### (.+)$/gm, `<div style="font-weight:600;margin:8px 0 2px;color:${C.text}">$1</div>`)
      .replace(/\[(.+?)\]\((https?:\/\/[^\)]+)\)/g,
        `<a href="$2" target="_blank" rel="noopener" style="color:${C.accent};text-decoration:underline">$1</a>`)
      .replace(/(^|[\s])(https?:\/\/[^\s<]+)/g,
        `$1<a href="$2" target="_blank" rel="noopener" style="color:${C.accent};text-decoration:underline">$2</a>`)
      .replace(/\n/g, '<br>');
  }

  // ── Add message bubble ─────────────────────────────────────────────────────
  function bubble(role, content) {
    if (feed.contains(empty)) feed.removeChild(empty);

    const wrap = document.createElement('div');
    Object.assign(wrap.style, { display:'flex', gap:'8px' });
    if (role === 'user') wrap.style.flexDirection = 'row-reverse';

    const b = document.createElement('div');
    Object.assign(b.style, {
      maxWidth:'85%', padding:'10px 13px', borderRadius:'14px',
      fontSize:'13px', lineHeight:'1.55', wordBreak:'break-word',
      boxSizing:'border-box',
    });

    if (role === 'user') {
      Object.assign(b.style, { background:'#242424', borderTopRightRadius:'4px' });
      b.textContent = content;
    } else {
      Object.assign(b.style, { background:C.surface, border:`1px solid ${C.border}`, borderTopLeftRadius:'4px' });
      if (content === '') {
        // typing dots
        b.innerHTML = [0,150,300].map(d =>
          `<span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:${C.muted};margin:0 2px;animation:nw-bounce 1.2s ${d}ms infinite"></span>`
        ).join('');
      } else {
        b.innerHTML = md(content);
      }
    }

    wrap.appendChild(b);
    feed.appendChild(wrap);
    feed.scrollTop = feed.scrollHeight;
    return b;
  }

  // ── Send ───────────────────────────────────────────────────────────────────
  async function send(text) {
    text = (text || '').trim();
    if (!text || streaming) return;

    // Client-side token limit (belt + suspenders with server 429)
    if (sessionChars / 4 >= TOKEN_LIMIT) {
      bubble('bot', '').innerHTML =
        `You've reached the conversation limit. <a href="https://app.cal.com/jayantrao/30min" target="_blank" rel="noopener" style="color:${C.accent};text-decoration:underline">Book a strategy call</a> to talk to the team directly.`;
      return;
    }

    sessionChars += text.length;
    messages.push({ role:'user', content:text });
    bubble('user', text);
    inp.value = '';

    streaming = true;
    sendBtn.style.opacity = '0.35';
    sendBtn.disabled = true;

    const botBubble = bubble('bot', ''); // typing dots

    try {
      const res = await fetch(`${API}/api/chat`, {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body:JSON.stringify({ messages, sessionId:SESSION_ID }),
      });

      // Server-side limit hit
      if (res.status === 429) {
        botBubble.innerHTML =
          `You've reached the conversation limit. <a href="https://app.cal.com/jayantrao/30min" target="_blank" rel="noopener" style="color:${C.accent};text-decoration:underline">Book a strategy call</a> to talk to the team directly.`;
        return;
      }

      if (!res.ok || !res.body) throw new Error('Bad response');

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText  = '';
      let buffer    = '';
      let first     = true;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream:true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6).trim();
          if (payload === '[DONE]') break;
          try {
            const p = JSON.parse(payload);
            if (p.chunk) {
              if (first) { botBubble.innerHTML = ''; first = false; }
              fullText += p.chunk;
              sessionChars += p.chunk.length;
              botBubble.innerHTML = md(fullText);
              feed.scrollTop = feed.scrollHeight;
            }
          } catch { /* skip */ }
        }
      }

      messages.push({ role:'assistant', content:fullText });
    } catch {
      botBubble.textContent = 'Something went wrong. Please try again.';
    } finally {
      streaming = false;
      sendBtn.style.opacity = '1';
      sendBtn.disabled = false;
      inp.focus();
    }
  }

  sendBtn.addEventListener('click', () => send(inp.value));
  inp.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); send(inp.value); }
  });
})();
