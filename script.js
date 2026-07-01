/* ===========================================================
   Kitoko Hearth — Registration logic
   =========================================================== */

/* ---------- CONFIG ---------- */
// Replace with your deployed Google Apps Script Web App URL
const SCRIPT_URL = "https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec";

/* ============================================================
   0. PRELOADER
   ============================================================ */
(function preloader(){
  const el = document.getElementById('preloader');
  if(!el) return;

  let hidden = false;
  function hide(){
    if(hidden) return;
    hidden = true;
    el.classList.add('is-hidden');
    setTimeout(()=> el.remove(), 600);
  }

  // hide once everything (fonts, images) is ready, with a small minimum
  // display time so it doesn't flash, and a hard fallback timeout
  const minTime = new Promise(res => setTimeout(res, 400));
  const ready = document.fonts
    ? Promise.all([document.fonts.ready, minTime])
    : minTime;

  Promise.race([
    ready,
    new Promise(res => setTimeout(res, 2500)) // hard fallback
  ]).then(hide);

  window.addEventListener('load', () => setTimeout(hide, 150));
})();

/* ============================================================
   1. EMBER PARTICLE BACKGROUND
   ============================================================ */
(function emberField(){
  const canvas = document.getElementById('emberCanvas');
  const ctx = canvas.getContext('2d');
  let w, h, embers = [];

  function resize(){
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resize);
  resize();

  function makeEmber(){
    return {
      x: Math.random() * w,
      y: h + Math.random() * 100,
      r: Math.random() * 2 + 0.6,
      speed: Math.random() * 0.6 + 0.25,
      drift: (Math.random() - 0.5) * 0.5,
      flicker: Math.random() * Math.PI * 2,
      hue: Math.random() > 0.5 ? '255,122,69' : '255,179,94',
      life: Math.random()
    };
  }

  const COUNT = window.innerWidth < 600 ? 35 : 70;
  for(let i=0;i<COUNT;i++) embers.push(makeEmber());

  function tick(){
    ctx.clearRect(0,0,w,h);
    embers.forEach(p=>{
      p.y -= p.speed;
      p.x += Math.sin(p.flicker) * p.drift;
      p.flicker += 0.02;
      p.life += 0.004;
      const alpha = Math.max(0, 0.65 - p.life) * (0.5 + 0.5*Math.sin(p.flicker*3));
      ctx.beginPath();
      ctx.fillStyle = `rgba(${p.hue},${alpha})`;
      ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
      ctx.fill();
      if(p.y < -20 || p.life > 1){
        Object.assign(p, makeEmber());
        p.y = h + Math.random()*40;
      }
    });
    requestAnimationFrame(tick);
  }
  tick();
})();

/* ============================================================
   2. MULTI-STEP FORM LOGIC
   ============================================================ */
(function form(){
  const introScreen = document.getElementById('introScreen');
  const formScreen = document.getElementById('formScreen');
  const successScreen = document.getElementById('successScreen');
  const startBtn = document.getElementById('startBtn');
  const form = document.getElementById('regForm');
  const steps = Array.from(form.querySelectorAll('.step'));
  const totalSteps = steps.length;
  const progressFill = document.getElementById('progressFill');
  const stepCurrent = document.getElementById('stepCurrent');
  const stepTotal = document.getElementById('stepTotal');
  const backBtn = document.getElementById('backBtn');
  const nextBtn = document.getElementById('nextBtn');
  const submitBtn = document.getElementById('submitBtn');
  const errorMsg = document.getElementById('errorMsg');
  const reviewCard = document.getElementById('reviewCard');
  const loadingOverlay = document.getElementById('loadingOverlay');

  let current = 1;
  stepTotal.textContent = totalSteps;

  startBtn.addEventListener('click', ()=>{
    introScreen.hidden = true;
    formScreen.hidden = false;
    window.scrollTo(0,0);
  });

  function showStep(n){
    steps.forEach(s => s.classList.toggle('active', Number(s.dataset.step) === n));
    progressFill.style.width = `${(n/totalSteps)*100}%`;
    stepCurrent.textContent = n;
    backBtn.style.visibility = n === 1 ? 'hidden' : 'visible';
    nextBtn.hidden = n === totalSteps;
    submitBtn.hidden = n !== totalSteps;
    errorMsg.hidden = true;
    if(n === totalSteps) renderReview();
    window.scrollTo({top:0, behavior:'smooth'});
  }

  function currentFieldset(){
    return steps.find(s => Number(s.dataset.step) === current);
  }

  function validateStep(){
    const fs = currentFieldset();
    const requiredInputs = fs.querySelectorAll('input[required], textarea[required], select[required]');
    for(const input of requiredInputs){
      if(input.type === 'radio'){
        const group = fs.querySelectorAll(`input[name="${input.name}"]`);
        const checked = Array.from(group).some(r => r.checked);
        if(!checked) return false;
      } else if(!input.value.trim()){
        return false;
      }
    }
    return true;
  }

  nextBtn.addEventListener('click', ()=>{
    if(!validateStep()){
      errorMsg.hidden = false;
      currentFieldset().scrollIntoView({behavior:'smooth', block:'center'});
      return;
    }
    if(current < totalSteps){
      current++;
      showStep(current);
    }
  });

  backBtn.addEventListener('click', ()=>{
    if(current > 1){
      current--;
      showStep(current);
    }
  });

  function fieldValue(name){
    const els = form.querySelectorAll(`[name="${name}"]`);
    if(!els.length) return '';
    if(els[0].type === 'checkbox'){
      return Array.from(els).filter(e=>e.checked).map(e=>e.value).join(', ');
    }
    if(els[0].type === 'radio'){
      const checked = Array.from(els).find(e=>e.checked);
      return checked ? checked.value : '';
    }
    return els[0].value.trim();
  }

  function renderReview(){
    const rows = [
      ['Full Name', fieldValue('fullName')],
      ['Email', fieldValue('email')],
      ['Phone (WhatsApp)', fieldValue('phone')],
      ['Age', fieldValue('age')],
      ['City / State', fieldValue('cityState')],
      ['Country', fieldValue('country')],
      ['Currently', fieldValue('currentStatus')],
      ['Interest Area', fieldValue('interestArea')],
      ['Commit 4 Weeks', fieldValue('canCommit4Weeks')],
    ];
    reviewCard.innerHTML = rows.map(([k,v]) => `
      <div class="review-row"><span class="rk">${k}</span><span class="rv">${v || '—'}</span></div>
    `).join('');
  }

  showStep(current);

  /* ---------- SUBMISSION (JSONP — avoids CORS with Apps Script) ---------- */

  form.addEventListener('submit', (e)=>{
    e.preventDefault();
    if(!validateStep()) {
      errorMsg.hidden = false;
      return;
    }
    submitRegistration();
  });

  function collectPayload(){
    const fd = new FormData(form);
    const data = {};
    const allNames = new Set();
    form.querySelectorAll('[name]').forEach(el => allNames.add(el.name));
    allNames.forEach(name => { data[name] = fieldValue(name); });
    data.timestamp = new Date().toISOString();
    return data;
  }

  function submitRegistration(){
    loadingOverlay.hidden = false;
    submitBtn.disabled = true;

    const payload = collectPayload();
    const callbackName = 'kitokoCallback_' + Date.now();

    window[callbackName] = function(response){
      cleanup();
      loadingOverlay.hidden = true;
      if(response && response.result === 'success'){
        formScreen.hidden = true;
        successScreen.hidden = false;
        window.scrollTo(0,0);
      } else {
        submitBtn.disabled = false;
        errorMsg.hidden = false;
        errorMsg.textContent = 'Something went wrong sending your registration. Please check your connection and try again.';
      }
    };

    const params = new URLSearchParams();
    Object.keys(payload).forEach(k => params.append(k, payload[k]));
    params.append('callback', callbackName);

    const script = document.createElement('script');
    script.src = `${SCRIPT_URL}?${params.toString()}`;
    script.onerror = function(){
      cleanup();
      loadingOverlay.hidden = true;
      submitBtn.disabled = false;
      errorMsg.hidden = false;
      errorMsg.textContent = 'Could not reach the server. Please check your connection and try again.';
    };

    // safety timeout in case the script never calls back
    const timeout = setTimeout(()=>{
      if(window[callbackName]){
        cleanup();
        loadingOverlay.hidden = true;
        submitBtn.disabled = false;
        errorMsg.hidden = false;
        errorMsg.textContent = 'The request timed out. Please try again.';
      }
    }, 20000);

    function cleanup(){
      clearTimeout(timeout);
      delete window[callbackName];
      script.remove();
    }

    document.body.appendChild(script);
  }
})();