// ===== Claire Helper App (habits + debts) =====
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));
const fmtYMD = (d) => d.toISOString().slice(0,10);
const today = () => new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Singapore' }));

const store = {
  load(){ try { return JSON.parse(localStorage.getItem('claire-helper')||'{}'); } catch { return {}; } },
  save(data){ localStorage.setItem('claire-helper', JSON.stringify(data)); }
};

const state = {
  data: {
    settings: { dark:false },
    habits: [
      { id: 'write', name: '写作字数', type: 'counter', unit: '字', target: 500 },
      { id: 'study', name: '学习时长', type: 'counter', unit: '分钟', target: 30 },
    ],
    days: {},
    debts: [],
    repayments: []
  },
  get day(){
    const d=fmtYMD(today());
    if(!this.data.days[d]) this.data.days[d]={notes:'', values:{}};
    return this.data.days[d];
  }
};

Object.assign(state.data, store.load());

function applyTheme(){
  if(state.data.settings.dark) document.documentElement.classList.add('dark');
  else document.documentElement.classList.remove('dark');
}
applyTheme();
const toggleDarkBtn = $('#toggleDark');
if (toggleDarkBtn) toggleDarkBtn.addEventListener('click', ()=>{
  state.data.settings.dark = !state.data.settings.dark;
  applyTheme(); store.save(state.data);
});

$$('.tab').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    const target = btn.dataset.tab;
    $$('.tab').forEach(b=>b.classList.remove('tab-active')); btn.classList.add('tab-active');
    $$('.tab').forEach(b=>{ if(b!==btn) b.classList.add('tab-inactive'); else b.classList.remove('tab-inactive'); });
    ['habit','debt','more'].forEach(t=> $('#tab-'+t).classList.toggle('hidden', t!==target));
  });
});

function renderToday(){
  const tl = $('#todayLabel'); if (tl) tl.textContent = fmtYMD(today());
  const box = $('#habitList'); if (!box) return;
  box.innerHTML = '';
  state.data.habits.forEach(h => {
    const cur = state.day.values[h.id] ?? (h.type==='counter'?0:false);
    const row = document.createElement('div');
    row.className = 'flex items-center gap-3';
    if(h.type==='counter'){
      row.innerHTML = `
        <div class="flex-1">
          <div class="font-medium">${h.name}</div>
          <div class="text-xs text-slate-500">目标 ${h.target}${h.unit}</div>
        </div>
        <div class="flex items-center gap-2">
          <button class="btn-ghost" data-op="-10">-10</button>
          <button class="btn-ghost" data-op="-100">-100</button>
          <input class="input w-24 text-right" type="number" value="\${cur}" />
          <span class="text-sm w-6 text-center">\${h.unit}</span>
          <button class="btn-ghost" data-op="+10">+10</button>
          <button class="btn-ghost" data-op="+100">+100</button>
        </div>`;
      const input = row.querySelector('input');
      row.querySelectorAll('button[data-op]').forEach(b=>{
        b.addEventListener('click',()=>{
          const n = parseInt(input.value||0,10);
          const op = b.dataset.op;
          const val = n + parseInt(op.replace('+',''));
          input.value = Math.max(0, val);
          state.day.values[h.id] = Number(input.value);
          store.save(state.data); renderHistory(); renderStreak();
        });
      });
      input.addEventListener('change',()=>{
        state.day.values[h.id] = Number(input.value);
        store.save(state.data); renderHistory(); renderStreak();
      });
    } else {
      row.innerHTML = `
        <label class="flex items-center gap-3 flex-1">
          <input type="checkbox" \${cur? 'checked':''} class="w-5 h-5">
          <span class="font-medium">\${h.name}</span>
        </label>`;
      const cb = row.querySelector('input');
      cb.addEventListener('change',()=>{
        state.day.values[h.id] = cb.checked;
        store.save(state.data); renderHistory(); renderStreak();
      });
    }
    box.appendChild(row);
  });

  const note = $('#dailyNote'); if (note) note.value = state.day.notes || '';
  renderHistory();
  renderStreak();
}

function renderHistory(){
  const list = $('#history'); if (!list) return;
  list.innerHTML = '';
  const days = Object.keys(state.data.days).sort().reverse().slice(0, 14);
  days.forEach(d => {
    const day = state.data.days[d];
    const wrap = document.createElement('div');
    wrap.className = 'py-2 flex items-start justify-between gap-3';
    const detail = state.data.habits.map(h=>{
      const v = (day.values||{})[h.id];
      if(v===undefined) return null;
      if(h.type==='counter') return \`\${h.name}：\${v}\${h.unit}\`;
      return \`\${h.name}：\${v? '✓':''}\`;
    }).filter(Boolean).join(' · ');
    wrap.innerHTML = \`
      <div>
        <div class="font-medium">\${d}</div>
        <div class="text-xs text-slate-500">\${detail || '—'}</div>
        \${day.notes? \`<div class="mt-1 text-sm">📝 \${day.notes}</div>\`:''}
      </div>
      <button class="btn-ghost text-sm" data-date="\${d}">编辑</button>\`;
    wrap.querySelector('button').addEventListener('click',()=>{
      if(d===fmtYMD(today())){ window.scrollTo({ top: 0, behavior: 'smooth' }); }
      else alert('当前版本仅支持编辑当天数据');
    });
    list.appendChild(wrap);
  });
}

function renderStreak(){
  const chip = $('#streakChip'); if (!chip) return;
  const dates = Object.keys(state.data.days).sort();
  let streak = 0; let prev = null;
  for(let i=dates.length-1;i>=0;i--){
    const d = dates[i];
    const ok = state.data.habits.every(h=>{
      const v = (state.data.days[d].values||{})[h.id];
      if(h.type==='counter') return Number(v||0) >= Number(h.target||0);
      return !!v;
    });
    if(!ok) break;
    const cur = new Date(d);
    if(prev && (prev - cur !== 24*3600*1000)) break;
    streak++; prev = cur;
  }
  chip.textContent = \`连续 \${streak} 天\`;
}

const addHabitBtn = $('#addHabit');
if (addHabitBtn) addHabitBtn.addEventListener('click', ()=>{
  const name = prompt('目标名称（如：背单词）'); if(!name) return;
  const unit = prompt('单位（如：个/分钟/字），可留空', '') || '';
  const target = Number(prompt('目标数值（如：30）', '30')||0);
  const id = 'h'+Math.random().toString(36).slice(2,8);
  state.data.habits.push({ id, name, type:'counter', unit, target });
  store.save(state.data); renderToday();
});

const saveTodayBtn = $('#saveToday');
if (saveTodayBtn) saveTodayBtn.addEventListener('click', ()=>{
  const note = $('#dailyNote');
  state.day.notes = (note?.value || '').trim();
  store.save(state.data); alert('已保存'); renderHistory(); renderStreak();
});

const doneTodayBtn = $('#doneToday');
if (doneTodayBtn) doneTodayBtn.addEventListener('click', ()=>{
  state.data.habits.forEach(h=>{
    if(h.type==='counter') state.day.values[h.id]=h.target;
    else state.day.values[h.id]=true;
  });
  store.save(state.data); renderToday();
});

const clearTodayBtn = $('#clearToday');
if (clearTodayBtn) clearTodayBtn.addEventListener('click', ()=>{
  if(confirm('清除今天的数据？')){
    state.data.days[fmtYMD(today())] = { notes:'', values:{} };
    store.save(state.data); renderToday();
  }
});

function ensureDebtDefaults(d){ if(d.accrued==null) d.accrued=0; if(!d.lastCalc) d.lastCalc=d.start||fmtYMD(today()); }
function accrueToDate(d, targetDate){
  ensureDebtDefaults(d);
  const from = new Date(d.lastCalc);
  const to = new Date(targetDate);
  if(to <= from) return;
  const days = Math.floor((to - from) / 86400000);
  const dailyRate = (Number(d.apr||0)/100) / 365;
  const interest = (Number(d.principal||0)) * dailyRate * days;
  d.accrued += interest;
  d.lastCalc = fmtYMD(to);
}
function totalRemain(){ return state.data.debts.reduce((sum,d)=> sum + Number(d.principal||0) + Number(d.accrued||0), 0); }
function estMonthlyInterest(){ return state.data.debts.reduce((sum,d)=> sum + (Number(d.principal||0)) * (Number(d.apr||0)/100)/12, 0); }

function renderDebts(){
  const t = fmtYMD(today());
  state.data.debts.forEach(d=>accrueToDate(d, t));
  const dc = $('#debtCount'); if (dc) dc.textContent = \`\${state.data.debts.length} 笔\`;
  const tr = $('#totalRemain'); if (tr) tr.textContent = '¥' + totalRemain().toFixed(2);
  const emi = $('#estMonthlyInterest'); if (emi) emi.textContent = '¥' + estMonthlyInterest().toFixed(2);

  const list = $('#debtList'); if (!list) return;
  list.innerHTML = '';
  state.data.debts.forEach(d=>{
    const card = document.createElement('div'); card.className = 'p-3 rounded-xl border';
    card.innerHTML = `
      <div class="flex items-start justify-between">
        <div>
          <div class="font-semibold">\${d.name}</div>
          <div class="text-xs text-slate-500">APR \${Number(d.apr||0).toFixed(2)}% · 开始 \${d.start||'-'}</div>
        </div>
        <button class="btn-ghost text-sm" data-del="\${d.id}">删除</button>
      </div>
      <div class="grid grid-cols-2 gap-3 mt-2 text-sm">
        <div class="p-2 rounded-lg" style="background:#f8fafc">
          <div class="text-slate-500">本金剩余</div>
          <div class="font-semibold">¥\${Number(d.principal||0).toFixed(2)}</div>
        </div>
        <div class="p-2 rounded-lg" style="background:#f8fafc">
          <div class="text-slate-500">已计提利息</div>
          <div class="font-semibold">¥\${Number(d.accrued||0).toFixed(2)}</div>
        </div>
      </div>`;
    card.querySelector('[data-del]').addEventListener('click', ()=>{
      if(confirm('删除该债务及其还款记录？')){
        state.data.repayments = state.data.repayments.filter(r=>r.debtId!==d.id);
        state.data.debts = state.data.debts.filter(x=>x.id!==d.id);
        store.save(state.data); renderDebts(); renderStats();
      }
    });
    list.appendChild(card);
  });

  const sel = $('#repaySelect');
  if (sel) sel.innerHTML = state.data.debts.map(d=>`<option value="\${d.id}">\${d.name}</option>`).join('') || '<option>暂无债务</option>';
}

const addDebtBtn = $('#addDebt');
if (addDebtBtn) addDebtBtn.addEventListener('click', ()=>{
  const name = $('#debtName').value.trim();
  const principal = Number($('#debtPrincipal').value||0);
  const apr = Number($('#debtAPR').value||0);
  const start = $('#debtStart').value || fmtYMD(today());
  if(!name || principal<=0){ alert('请填写名称和本金'); return; }
  const id = 'd'+Math.random().toString(36).slice(2,8);
  state.data.debts.push({ id, name, principal, apr, accrued:0, start, lastCalc:start });
  store.save(state.data);
  $('#debtName').value=''; $('#debtPrincipal').value=''; $('#debtAPR').value=''; $('#debtStart').value='';
  renderDebts(); renderStats();
});

const applyInterestAllBtn = $('#applyInterestAll');
if (applyInterestAllBtn) applyInterestAllBtn.addEventListener('click', ()=>{
  renderDebts(); store.save(state.data); alert('已计提到今天');
});

const addRepayBtn = $('#addRepay');
if (addRepayBtn) addRepayBtn.addEventListener('click', ()=>{
  const id = $('#repaySelect').value; const amt = Number($('#repayAmount').value||0); const date = $('#repayDate').value || fmtYMD(today());
  const d = state.data.debts.find(x=>x.id===id);
  if(!d || amt<=0){ alert('请选择债务并输入金额'); return; }
  accrueToDate(d, date);
  let left = amt;
  const useAccrued = Math.min(d.accrued, left); d.accrued -= useAccrued; left -= useAccrued;
  const usePrincipal = Math.min(d.principal, left); d.principal -= usePrincipal; left -= usePrincipal;
  state.data.repayments.push({ id: 'r'+Math.random().toString(36).slice(2,8), debtId: id, amount: amt, date });
  store.save(state.data); $('#repayAmount').value=''; $('#repayDate').value='';
  renderDebts(); renderStats();
});

function renderStats(){
  const s = $('#stats'); if (!s) return;
  const total = totalRemain();
  const monthly = estMonthlyInterest();
  const paid = state.data.repayments.reduce((a,b)=>a+b.amount,0);
  s.innerHTML = `
    <div class="p-3 rounded-xl" style="background:#f8fafc">
      <div class="text-slate-500 text-sm">当前负债（含利息）</div>
      <div class="text-xl font-semibold">¥\${total.toFixed(2)}</div>
    </div>
    <div class="p-3 rounded-xl" style="background:#f8fafc">
      <div class="text-slate-500 text-sm">预计月利息（近似）</div>
      <div class="text-xl font-semibold">¥\${monthly.toFixed(2)}</div>
    </div>
    <div class="p-3 rounded-xl" style="background:#f8fafc">
      <div class="text-slate-500 text-sm">累计已还</div>
      <div class="text-xl font-semibold">¥\${paid.toFixed(2)}</div>
    </div>
  `;
}

const exportBtn = $('#exportBtn');
if (exportBtn) exportBtn.addEventListener('click', ()=>{
  const blob = new Blob([JSON.stringify(state.data, null, 2)], { type:'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'claire-helper-backup.json'; a.click();
  URL.revokeObjectURL(url);
});

const importFile = $('#importFile');
if (importFile) importFile.addEventListener('change', (e)=>{
  const file = e.target.files[0]; if(!file) return;
  const reader = new FileReader();
  reader.onload = ()=>{
    try {
      const data = JSON.parse(reader.result);
      if(!data || typeof data !== 'object') throw new Error('无效数据');
      state.data = Object.assign({settings:{dark:false},habits:[],days:{},debts:[],repayments:[]}, data);
      localStorage.setItem('claire-helper', JSON.stringify(state.data));
      location.reload();
    } catch(err){ alert('导入失败：'+err.message); }
  };
  reader.readAsText(file);
});

document.addEventListener('DOMContentLoaded', ()=>{
  const repayDate = $('#repayDate'); if (repayDate) repayDate.value = fmtYMD(today());
  const debtStart = $('#debtStart'); if (debtStart) debtStart.value = fmtYMD(today());
  renderToday(); renderDebts(); renderStats();
});
