// ========= 共通設定 =========
const GAS_ENDPOINT =
  'https://script.google.com/macros/s/AKfycbyHeY6tH9r7-UIlMUdWFDlos7OmQdW-6mcnBe4yaFnoFPvJB6XcFdttMj2-IlWM65ucrw/exec';

// -------- ページ判定 --------
const page = location.pathname.split('/').pop();
if(page.endsWith('quiz.html'))   runQuiz();
if(page.endsWith('result.html')) showResult();

// -------- ローダー＋メッセージ --------
function showLoader(show=true){
  document.getElementById('loader')?.classList.toggle('hidden', !show);
  document.getElementById('loadingMsg')?.classList.toggle('hidden', !show);
}

/* ------------------------------------------------------------
   クイズ画面
------------------------------------------------------------ */
async function runQuiz(){
  showLoader(true);
  try{
    const res  = await fetch(`${GAS_ENDPOINT}?action=getQuiz`);
    const data = await res.json();
    renderQuestions(data.questions,data.choices);
  }catch(e){alert('データ取得に失敗しました');console.error(e);}
  finally{showLoader(false);}
}

function renderQuestions(qs, choices){
  const root      = document.getElementById('quizArea');
  const btnFinish = document.getElementById('btnFinish');
  const answered  = {};

  btnFinish.onclick = () => {
    showLoader(true);                                // 即ローダー
    submitLog(answered).then(()=>location.href='result.html');
  };

  const updateBar = () => {
    const cnt = Object.keys(answered).length;
    document.getElementById('progressBar').style.width = `${(cnt/qs.length)*100}%`;
    btnFinish.classList.toggle('hidden', cnt !== qs.length);
  };

  qs.forEach((q,idx)=>{
    const card = document.createElement('section');
    card.className = 'card' + (idx?' inactive':'');
    card.innerHTML = `<h2>Q${idx+1}. ${q.text}</h2>`;

    q.choiceIds.forEach(cid=>{
      const btn = document.createElement('button');
      btn.className='choice';
      btn.innerHTML=`<span>${choices[cid].text}</span>`;
      btn.onclick=()=>{
        [...card.querySelectorAll('.choice')].forEach(b=>b.classList.remove('selected'));
        btn.classList.add('selected');
        answered[q.id]=cid;
        if(idx+1<qs.length){
          root.children[idx+1].classList.remove('inactive');
          root.children[idx+1].scrollIntoView({behavior:'smooth',block:'center'});
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
  const answersStr = localStorage.getItem('answers');
  if(!answersStr) return location.href='index.html';
  const answers = JSON.parse(answersStr);

  const form = new URLSearchParams();
  form.append('action','getResult');
  form.append('answers',JSON.stringify(answers));

  showLoader(true);
  try{
    const res = await fetch(GAS_ENDPOINT,{method:'POST',body:form});
    const data = await res.json();

    /* 1) タイプ説明 (fade) */
    const header = document.getElementById('resultTitle'); // ←アニメなし
    const desc = document.createElement('p');
    desc.className='title-center fade-item';
    desc.style.animationDelay='.3s';
    desc.innerHTML=`診断の結果、あなたのタイプは<strong>「${data.type}」</strong>でした`;
    header.insertAdjacentElement('afterend',desc);

    /* 2) メニューカード (fade) */
    const list = document.getElementById('menuList');
    list.innerHTML='';
    data.menus.forEach((m,i)=>{
      const d=.8+i*0.3;
      list.insertAdjacentHTML('beforeend',
        `<div class="card fade-item" style="animation-delay:${d}s">
           ${m.img?`<img src="${m.img}" alt="${m.name}" style="width:100%;border-radius:1rem;">`:''}
           <h2 style="margin:1rem 0 .5rem">${m.name}</h2>
         </div>`);
    });

    /* 3) ホームへ戻るボタン (fade) */
    const nav=document.querySelector('nav.bottom-pad');
    nav.classList.add('fade-item');
    nav.style.animationDelay = (.8 + data.menus.length*0.3 + .3)+'s';

  }catch(e){alert('結果取得に失敗しました');console.error(e);}
  finally{showLoader(false);}
}

/* ------------------------------------------------------------
   回答ログ送信
------------------------------------------------------------ */
async function submitLog(obj){
  const form=new URLSearchParams();
  form.append('action','log');
  form.append('answers',JSON.stringify(obj));
  try{await fetch(GAS_ENDPOINT,{method:'POST',body:form});}
  catch(e){console.warn('log failed',e);}
}
