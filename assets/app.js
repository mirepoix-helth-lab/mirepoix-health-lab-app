
/* ---------- Config ---------- */
const GAS_ENDPOINT =
  'https://script.google.com/macros/s/AKfycbyHeY6tH9r7-UIlMUdWFDlos7OmQdW-6mcnBe4yaFnoFPvJB6XcFdttMj2-IlWM65ucrw/exec';

/* ---------- Page Router ---------- */
const page = location.pathname.split('/').pop();
if (page.endsWith('quiz.html'))   runQuiz();
if (page.endsWith('result.html')) showResult();

/* ---------- Loader Helpers ---------- */
function showLoader(show = true) {
  document.getElementById('loader')?.classList.toggle('hidden', !show);
}

/* ============================================================
   Quiz Page
============================================================ */
async function runQuiz() {
  showLoader(true);
  try {
    const res  = await fetch(`${GAS_ENDPOINT}?action=getQuiz`);
    const data = await res.json();
    renderQuestions(data.questions, data.choices);
  } catch (e) {
    alert('データ取得に失敗しました'); console.error(e);
  } finally {
    showLoader(false);
  }
}

function renderQuestions(qs, choices) {
  const root      = document.getElementById('quizArea');
  const btnFinish = document.getElementById('btnFinish');
  const answered  = {};

  btnFinish.onclick = () => {
    showLoader(true);               // show immediately
    submitLog(answered).then(() => location.href = 'result.html');
  };

  const updateBar = () => {
    const done = Object.keys(answered).length;
    document.getElementById('progressBar').style.width = `${(done / qs.length) * 100}%`;
    btnFinish.classList.toggle('hidden', done !== qs.length);
  };

  qs.forEach((q, idx) => {
    const card = document.createElement('section');
    card.className = 'card' + (idx ? ' inactive' : '');
    card.innerHTML = `<h2>Q${idx + 1}. ${q.text}</h2>`;

    q.choiceIds.forEach(cid => {
      const btn = document.createElement('button');
      btn.className = 'choice';
      btn.innerHTML = `<span>${choices[cid].text}</span>`;
      btn.onclick = () => {
        // mark selection
        [...card.querySelectorAll('.choice')].forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        answered[q.id] = cid;

        // unlock next question
        if (idx + 1 < qs.length) {
          root.children[idx + 1].classList.remove('inactive');
          root.children[idx + 1].scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        updateBar();
      };
      card.appendChild(btn);
    });
    root.appendChild(card);
  });
}

/* ============================================================
   Result Page
============================================================ */
async function showResult() {
  const answersStr = localStorage.getItem('answers');
  if (!answersStr) return location.href = 'index.html';
  const answers = JSON.parse(answersStr);

  const form = new URLSearchParams();
  form.append('action', 'getResult');
  form.append('answers', JSON.stringify(answers));

  showLoader(true);
  try {
    const res  = await fetch(GAS_ENDPOINT, { method: 'POST', body: form });
    const data = await res.json();               // { type, menus[] }

    /* --- fade-in sequence --- */
    // 1) description
    const header = document.getElementById('resultTitle');       // title fixed (no animation)
    const desc = document.createElement('p');
    desc.className = 'title-center fade-item';
    desc.style.animationDelay = '.3s';
    desc.innerHTML = `診断の結果、あなたのタイプは<strong>「${data.type}」</strong>でした`;
    header.insertAdjacentElement('afterend', desc);

    // 2) menu cards
    const list = document.getElementById('menuList');
    list.innerHTML = '';
    data.menus.forEach((m, i) => {
      const delay = .8 + i * 0.3;
      list.insertAdjacentHTML(
        'beforeend',
        `<div class="card fade-item" style="animation-delay:${delay}s">
           ${m.img ? `<img src="${m.img}" alt="${m.name}" style="width:100%;border-radius:1rem;">` : ''}
           <h2 style="margin:1rem 0 .5rem">${m.name}</h2>
         </div>`
      );
    });

    // 3) back-home button
    const nav = document.querySelector('nav.bottom-pad');
    nav.classList.add('fade-item');
    nav.style.animationDelay = (.8 + data.menus.length * 0.3 + .3) + 's';

  } catch (e) {
    alert('結果取得に失敗しました'); console.error(e);
  } finally {
    showLoader(false);
  }
}

/* ============================================================
   Logging
============================================================ */
async function submitLog(obj) {
  const form = new URLSearchParams();
  form.append('action', 'log');
  form.append('answers', JSON.stringify(obj));
  try { await fetch(GAS_ENDPOINT, { method: 'POST', body: form }); }
  catch (e) { console.warn('log failed', e); }
}
