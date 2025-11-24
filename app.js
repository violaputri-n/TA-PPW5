(function(){
  const displayEl = document.getElementById('display');
  const expressionEl = document.getElementById('expression');
  const buttons = document.getElementById('buttons');
  const historyUl = document.getElementById('history-ul');
  const memoryIndicator = document.getElementById('memory-indicator');
  const memoryPanel = document.getElementById('memory-panel');

  let currentEntry = '0';
  let tokens = []; 
  let history = [];
  let memory = 0;

  function updateDisplay(){
    displayEl.textContent = currentEntry;
    expressionEl.textContent = tokens.join(' ');
    memoryIndicator.textContent = `M: ${niceNumber(memory)}`;
  }

  function niceNumber(n){
    if (n === Infinity || n === -Infinity || Number.isNaN(n)) return 'Error';
    if (Number.isInteger(n)) return String(n);
    return String(parseFloat(n.toPrecision(12))).replace(/\.0+$|(?<=\.[0-9]*?)0+$/,'');
  }

  function pushNumberDigit(d){
    if (currentEntry === 'Error') currentEntry = '0';
    if (d === '.' && currentEntry.includes('.')) return;
    if (currentEntry === '0' && d !== '.') currentEntry = d;
    else currentEntry += d;
    updateDisplay();
  }

  function pushOperator(op){
    if (currentEntry === 'Error') return;
    tokens.push(currentEntry);
    tokens.push(op);
    currentEntry = '0';
    updateDisplay();
  }

  function clearEntry(){ currentEntry = '0'; updateDisplay(); }
  function clearAll(){ currentEntry = '0'; tokens = []; updateDisplay(); }

  function recordHistory(expr, result){
    history.unshift({expr, result});
    history = history.slice(0,5);
    renderHistory();
  }

  function renderHistory(){
    historyUl.innerHTML = '';
    if (!history || history.length === 0){
      const li = document.createElement('li');
      li.className = 'history-empty';
      li.textContent = 'Belum ada riwayat perhitungan.';
      historyUl.appendChild(li);
      return;
    }

    history.forEach((h, idx) => {
      const li = document.createElement('li');
      li.className = 'history-item';
      const left = document.createElement('div');
      left.className = 'history-left';
      left.innerHTML = `<strong class="history-result">${h.result}</strong><small class="history-expr">${h.expr}</small>`;
      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'hist-del';
      del.title = 'Hapus riwayat ini';
      del.textContent = '✖';

      left.addEventListener('click', () => {
        currentEntry = String(h.result);
        updateDisplay();
      });

      del.addEventListener('click', (ev) => {
        ev.stopPropagation();
        history.splice(idx, 1);
        renderHistory();
      });

      li.appendChild(left);
      li.appendChild(del);
      historyUl.appendChild(li);
    });
  }

  function evaluateTokens(tokenList){
    const output = [];
    const ops = [];
    const precedence = {'+':1,'-':1,'*':2,'/':2};
    tokenList.forEach(tok => {
      if (/^[0-9]+(?:\.[0-9]+)?$/.test(tok)) output.push(parseFloat(tok));
      else if (tok in precedence){
        while(ops.length && precedence[ops[ops.length-1]] >= precedence[tok]){
          output.push(ops.pop());
        }
        ops.push(tok);
      }
    });
    while(ops.length) output.push(ops.pop());

    const stack = [];
    for (const el of output){
      if (typeof el === 'number') stack.push(el);
      else {
        const b = stack.pop();
        const a = stack.pop();
        if (el === '+') stack.push(a + b);
        else if (el === '-') stack.push(a - b);
        else if (el === '*') stack.push(a * b);
        else if (el === '/'){
          if (b === 0){
            return 'Error: Division by zero';
          }
          stack.push(a / b);
        }
      }
    }
    return stack[0];
  }

  function computeEquals(){
    if (currentEntry === 'Error') return;
    const exprTokens = tokens.slice();
    exprTokens.push(currentEntry);
    const sanitized = exprTokens.map(t => t.replace ? t.replace('×','*').replace('÷','/') : t);
    const res = evaluateTokens(sanitized);
    if (typeof res === 'string' && res.startsWith('Error')){
      currentEntry = 'Error';
      tokens = [];
      updateDisplay();
      return;
    }
    const nice = niceNumber(res);
    const exprStr = sanitized.join(' ');
    recordHistory(exprStr, nice);
    currentEntry = String(nice);
    tokens = [];
    updateDisplay();
  }

  function memoryAdd(){ memory += parseFloatOrZero(currentEntry); updateDisplay(); }
  function memorySub(){ memory -= parseFloatOrZero(currentEntry); updateDisplay(); }
  function memoryRec(){ currentEntry = String(niceNumber(memory)); updateDisplay(); }
  function memoryClear(){ memory = 0; updateDisplay(); }

  function parseFloatOrZero(s){
    const v = parseFloat(s);
    return Number.isFinite(v) ? v : 0;
  }

  buttons.addEventListener('click', (ev)=>{
    const btn = ev.target.closest('button');
    if (!btn) return;
    const val = btn.dataset.value;
    const action = btn.dataset.action;
    if (btn.classList.contains('num')){
      pushNumberDigit(val);
    } else if (btn.classList.contains('op')){
      pushOperator(val);
    } else if (action === 'equals'){
      computeEquals();
    } else if (action === 'ce'){
      clearEntry();
    } else if (action === 'c'){
      clearAll();
    } else if (action === 'mplus'){
      memoryAdd();
    } else if (action === 'mminus'){
      memorySub();
    } else if (action === 'mr'){
      memoryRec();
    } else if (action === 'mc'){
      memoryClear();
    }
  });

  if (memoryPanel){
    memoryPanel.addEventListener('click', (ev)=>{
      const btn = ev.target.closest('button');
      if (!btn) return;
      const action = btn.dataset.action;
      if (action === 'mplus') memoryAdd();
      else if (action === 'mminus') memorySub();
      else if (action === 'mr') memoryRec();
      else if (action === 'mc') memoryClear();
    });
  }

  const historyPanel = document.querySelector('.history-panel');
  if (historyPanel){
    historyPanel.addEventListener('click', (ev)=>{
      const btn = ev.target.closest('button[data-action]');
      if (!btn) return;
      const action = btn.dataset.action;
      if (action === 'clear-history-all'){
        if (history.length === 0) return;
        history = [];
        renderHistory();
      }
    });
  }

  window.addEventListener('keydown', (ev)=>{
    if (ev.key >= '0' && ev.key <= '9') { pushNumberDigit(ev.key); ev.preventDefault(); return; }
    if (ev.key === '.') { pushNumberDigit('.'); ev.preventDefault(); return; }
    if (ev.key === '+' || ev.key === '-' || ev.key === '*' || ev.key === '/') { pushOperator(ev.key); ev.preventDefault(); return; }
    if (ev.key === 'Enter' || ev.key === '=') { computeEquals(); ev.preventDefault(); return; }
    if (ev.key === 'Backspace') { clearEntry(); ev.preventDefault(); return; }
    if (ev.key === 'Escape') { clearAll(); ev.preventDefault(); return; }
  });

  updateDisplay();
  renderHistory();
})();
