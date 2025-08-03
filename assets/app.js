// === 共通設定 ===
const GAS_ENDPOINT = 'hhttps://script.google.com/macros/s/AKfycbyHeY6tH9r7-UIlMUdWFDlos7OmQdW-6mcnBe4yaFnoFPvJB6XcFdttMj2-IlWM65ucrw/exec'; // デプロイ後のURLに置換

/* ===== Index / Quiz / Result 判定 ===== */
const page = document.body?.id || document.location.pathname.split('/').pop();

if (page.endsWith('quiz.html')) runQuiz();
if (page.endsWith('result.html')) showResult();

/* --------- クイズ画面 --------- */
async function runQuiz() {
  // データ取得
  const res = await fetch(`${GAS_ENDPOINT}?action=getQuiz`);
  const data = await res.json();               // { questions:[{id,text,choiceIds:[]}], choices:{id:{text}}, total }
  renderQuestions(data.questions, data.choices);
}

function renderQuestions(qs, choicesMap) {
  const root = document.getElementById('quizArea');
  const answered = {};
  let current = 0;

  const updateProgress = () => {
    const pct = ((Object.keys(answered).length) / qs.length) * 100;
    document.getElementById('progressBar').style.width = `${pct}%`;
  };

  qs.forEach((q, idx) => {
    const card = document.createElement('section');
    card.className = 'card' + (idx === 0 ? '' : ' inactive');
    card.innerHTML = `<h2>Q${idx + 1}. ${q.text}</h2>`;
    q.choiceIds.forEach(cid => {
      const btn = document.createElement('button');
      btn.className = 'choice';
      btn.innerHTML = `<span>${choicesMap[cid].text}</span><i class="material-icons">check_circle</i>`;
      btn.addEventListener('click', () => {
        // 選択状態の更新
        [...card.querySelectorAll('.choice')].forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        answered[q.id] = cid;
        // 次のカード活性化
        if (idx + 1 < qs.length) {
          root.children[idx + 1].classList.remove('inactive');
          root.children[idx + 1].scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
          // 完了 → 結果へ
          localStorage.setItem('answers', JSON.stringify(answered));
          submitLog(answered).then(() => location.href = 'result.html');
        }
        updateProgress();
      });
      card.appendChild(btn);
    });
    root.appendChild(card);
  });
}

/* --------- 結果画面 --------- */
async function showResult() {
  const answers = JSON.parse(localStorage.getItem('answers') || '{}');
  if (!Object.keys(answers).length) { location.href = 'index.html'; return; }

  const res = await fetch(`${GAS_ENDPOINT}?action=getResult`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ answers })
  });
  const data = await res.json();               // { type:'◯◯タイプ', menus:[{name,img}] }

  document.getElementById('resultTitle').textContent = data.type;

  const list = document.getElementById('menuList');
  data.menus.forEach(m => {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      ${m.img ? `<img src="${m.img}" alt="${m.name}" style="width:100%;border-radius:1rem;">` : ''}
      <h2 style="margin:1rem 0 0.5rem;">${m.name}</h2>`;
    list.appendChild(card);
  });
}

/* --------- ログ送信 --------- */
async function submitLog(obj) {
  try {
    await fetch(`${GAS_ENDPOINT}?action=log`, {
      method: 'POST',
      body: JSON.stringify({ answers: obj }),
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (e) { console.warn('log failed', e); }
}
