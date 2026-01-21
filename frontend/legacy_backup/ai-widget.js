// Floating AI chat widget — injects a button and chat panel
(function(){
  if (window.__ai_widget_loaded) return; window.__ai_widget_loaded = true;

  const style = document.createElement('style');
  style.innerHTML = `
    .ai-widget-btn{position:fixed;right:18px;bottom:18px;background:linear-gradient(90deg,#667eea,#764ba2);color:#fff;padding:12px 14px;border-radius:999px;box-shadow:0 8px 24px rgba(102,126,234,0.3);z-index:9999;cursor:pointer;font-weight:700}
    .ai-panel{position:fixed;right:18px;bottom:78px;width:360px;height:520px;max-height:80vh;background:#fff;border-radius:12px;box-shadow:0 24px 48px rgba(2,6,23,0.2);z-index:9999;display:flex;flex-direction:column;overflow:hidden}
    .ai-panel.hidden{display:none}
    .ai-header{background:linear-gradient(90deg,#667eea,#764ba2);color:#fff;padding:10px 12px;font-weight:700;display:flex;align-items:center;justify-content:space-between}
    .ai-body{padding:12px;overflow:auto;flex:1;background:linear-gradient(180deg,#fff,#f7fafc);scroll-behavior:smooth}
    .ai-footer{display:flex;gap:8px;padding:10px;background:#fff;border-top:1px solid #eef2f6}
    .ai-input{flex:1;padding:8px 10px;border:1px solid #e6edf3;border-radius:8px}
    .ai-msg{margin-bottom:10px}
    .ai-msg.user{text-align:right}
    .ai-bubble{display:inline-block;padding:8px 12px;border-radius:10px;max-width:78%;box-shadow:0 6px 18px rgba(2,6,23,0.06)}
    .ai-bubble.user{background:#667eea;color:#fff;border-bottom-right-radius:4px}
    .ai-bubble.assistant{background:#f1f5f9;color:#0f172a;border-bottom-left-radius:4px}
  `;
  document.head.appendChild(style);

  const btn = document.createElement('button'); btn.className='ai-widget-btn'; btn.textContent='AI';
  document.body.appendChild(btn);

  const panel = document.createElement('div'); panel.className='ai-panel hidden';
  panel.innerHTML = `
    <div class="ai-header">AI Assistant<button id="ai-close" style="background:transparent;border:none;color:rgba(255,255,255,0.9);font-size:16px;cursor:pointer">✕</button></div>
    <div class="ai-body" id="aiBody"></div>
    <div class="ai-footer">
      <input id="aiAge" class="ai-input" placeholder="Age (opt)" style="width:80px" />
      <input id="aiInput" class="ai-input" placeholder="Describe symptoms or ask a question..." />
      <button id="aiSend" style="background:linear-gradient(90deg,#667eea,#764ba2);color:#fff;border:none;padding:8px 12px;border-radius:8px;cursor:pointer">Send</button>
    </div>
  `;
  document.body.appendChild(panel);

  const aiBody = panel.querySelector('#aiBody');
  const aiInput = panel.querySelector('#aiInput');
  const aiSend = panel.querySelector('#aiSend');
  const aiClose = panel.querySelector('#ai-close');
  const aiAge = panel.querySelector('#aiAge');

  function append(text, who){
    const wrap = document.createElement('div'); wrap.className='ai-msg '+(who==='user'?'user':'assistant');
    const b = document.createElement('div'); b.className='ai-bubble '+(who==='user'?'user':'assistant');
    b.innerHTML = text.replace(/\n/g,'<br>');
    wrap.appendChild(b); aiBody.appendChild(wrap); aiBody.scrollTop = aiBody.scrollHeight;
  }

  // speech removed

  async function send(){
    const text = aiInput.value.trim(); const age = aiAge.value?parseInt(aiAge.value,10):null;
    if(!text) return; aiInput.value=''; append(text,'user'); append('Thinking...', 'assistant');
    try{
      const res = await fetch('/api/recommend',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({symptoms:text,age})});
      const data = await res.json();
      // remove last 'Thinking...'
      const last = aiBody.lastElementChild; if(last && last.textContent.trim()==='Thinking...') aiBody.removeChild(last);
      if(!res.ok){ append('Error: '+(data.detail||res.statusText),'assistant'); return; }
      const reply = data.recommendation || JSON.stringify(data.raw||data);
      append(reply,'assistant');
    }catch(e){ console.error(e); append('Network error','assistant'); }
  }

  let _firstOpen = true;
  btn.addEventListener('click', ()=>{
    const wasHidden = panel.classList.contains('hidden');
    panel.classList.toggle('hidden');
    if(!panel.classList.contains('hidden')){
      aiInput.focus();
      if(wasHidden && _firstOpen){
        const greet = 'Hello — how can I help you today?';
        append(greet,'assistant');
        _firstOpen = false;
      }
    }
  });
  aiClose.addEventListener('click', ()=>{ panel.classList.add('hidden'); });
  aiSend.addEventListener('click', send);
  aiInput.addEventListener('keydown', (e)=>{ if(e.key==='Enter') send(); });

  // Expose a small API to open the widget and prefill the input
  window.AIWidget = {
    open: function(prefill){ panel.classList.remove('hidden'); if(prefill) aiInput.value = prefill; aiInput.focus(); }
  };

})();
