// ---------------- 共通設定 ----------------
const GAS_ENDPOINT =
  'https://script.google.com/macros/s/AKfycbyHeY6tH9r7-UIlMUdWFDlos7OmQdW-6mcnBe4yaFnoFPvJB6XcFdttMj2-IlWM65ucrw/exec';

// ---------------- ページ判定 ----------------
const page = location.pathname.split('/').pop();
if(page.endsWith('quiz.html'))   runQuiz();
if(page.endsWith('result.html')) showResult();

// ---------------- ローダー ----------------
function showLoader(show=true){
  document.getElementById('loader')?.classList.toggle('hidden', !show);
}

/* ------------------------------------------------------------
   クイズ画面
------------------------------------------------------------ */
async function runQuiz(){
  try{
    showLoader(true);
    const res  = await fetch(`${GAS_ENDPOINT}?action=getQuiz`);
    const data = await res.json();
    renderQuestions(data.questions,data.choices);
  }catch(e){
    alert('データ取得に失敗しました');console.error(e);
  }finally{
    showLoader(false);
  }
}

function renderQuestions(qs, choices){
  const root = document.getElementById('quizArea');
  const answered = {};

  const updateBar = ()=>{
    const pct = (Object.keys(answered).length/qs.length)*100;
    document.getElementById('progressBar').style.width = `${pct}%`;
  };

  qs.forEach((q,idx)=>{
    const card = document.createElement('section');
    card.className = 'card' + (idx?' inactive':'');
    card.innerHTML = `<h2>Q${idx+1}. ${q.text}</h2>`;

    q.choiceIds.forEach(cid=>{
      const btn = document.createElement('button');
      btn.className='choice';
      btn.innerHTML=`<span>${choices[cid].text}</span><i class="material-icons">check_circle</i>`;
      btn.onclick=()=>{
        [...card.querySelectorAll('.choice')].forEach(b=>b.classList.remove('selected'));
        btn.classList.add('selected');
        answered[q.id]=cid;

        if(idx+1<qs.length){
          root.children[idx+1].classList.remove('inactive');
          root.children[idx+1].scrollIntoView({behavior:'smooth',block:'center'});
        }else{
          localStorage.setItem('answers',JSON.stringify(answered));
          submitLog(answered).then(()=>location.href='result.html');
        }
        updateBar();
      };
      card.appendChild(btn);
    });
    root.appendChild(card);
  });
}

/* ------------------------------------------------------------
   結果画面
------------------------------------------------------------ */
async function showResult(){
  const ansStr = localStorage.getItem('answers');
  if(!ansStr) return location.href='index.html';
  const answers = JSON.parse(ansStr);

  const form = new URLSearchParams();
  form.append('action','getResult');
  form.append('answers',JSON.stringify(answers));

  try{
    showLoader(true);
    const res  = await fetch(GAS_ENDPOINT,{method:'POST',body:form});
    const data = await res.json();

    document.getElementById('resultTitle').textContent = data.type;
    const list = document.getElementById('menuList');
    list.innerHTML='';
    data.menus.forEach(m=>{
      list.insertAdjacentHTML('beforeend',
        `<div class="card">
           ${m.img?`<img src="${m.img}" alt="${m.name}" style="width:100%;border-radius:1rem;">`:''}
           <h2 style="margin:1rem 0 .5rem">${m.name}</h2>
         </div>`);
    });
  }catch(e){
    alert('結果取得に失敗しました');console.error(e);
  }finally{
    showLoader(false);
  }
}

/* ------------------------------------------------------------
   回答ログ送信
------------------------------------------------------------ */
async function submitLog(obj){
  const form = new URLSearchParams();
  form.append('action','log');
  form.append('answers',JSON.stringify(obj));
  try{ await fetch(GAS_ENDPOINT,{method:'POST',body:form}); }
  catch(e){ console.warn('log failed',e); }
}
