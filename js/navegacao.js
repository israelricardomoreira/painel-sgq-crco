/* Painel SGQ · CRCO — js/navegacao.js (0.12.0: o app.js foi dividido por página; tudo continua no mesmo escopo global, na ordem do index.html) */
(window.PAINEL_ARQ=window.PAINEL_ARQ||{})['js/navegacao.js']='0.25.0';
  function pgVisLer(){ try{ return JSON.parse(localStorage.getItem('crco-pgvis')||'{}')||{}; }catch(e){ return {}; } }
  function pgVisDef(aba,on){ state.pgVis[aba]=on; try{ localStorage.setItem('crco-pgvis',JSON.stringify(state.pgVis)); }catch(e){} pgVisSw(); render(); }
  // 0.25.0: o botão Gráficos do topo saiu; nas páginas com visual próprio, o alternador fica no cabeçalho da página
  function pgVisSw(){ var el=$('pgVisSw'), k=state.aba; if (!el) return; if (!PG_VIS[k]){ el.innerHTML=''; return; } var on=!!state.pgVis[k];
    el.innerHTML='<div class="seg" role="group" aria-label="Como ver esta página"><button type="button" class="segb" data-pgvis="1" aria-pressed="'+on+'">Gráficos</button><button type="button" class="segb" data-pgvis="0" aria-pressed="'+(!on)+'">Tabela</button></div>'; }
  function menuAbrir(sim){ document.body.classList.toggle('menu-aberto',!!sim); $('menuFundo').hidden=!sim; }
  function irAba(k){ var irVis=k==='vis'; if (irVis) k='geral'; // 0.25.0: a página Gráficos virou a seção Mais gráficos do Painel geral
    if ((k==='imp'||k==='eqp'||k==='apr'||k==='pes'||k==='pend') && !podeEscrever) k='geral'; if (typeof svModo==='function' && svModo()==='cert' && (k==='geral'||SO_SERV.indexOf(k)>=0)) k='cer'; state.aba=k; $('pgGeral').hidden=k!=='geral'; $('pgConteudo').hidden=k==='geral'||k==='imp'; $('importar').hidden=k!=='imp'; $('pgTitulo').textContent=TITULOS[k]||''; pgVisSw(); menuAbrir(false); window.scrollTo(0,0); if (k==='geral'){ if (state.sujo&&state.sujo.geral) pagPendente('geral'); else renderGraficos(); } var kMenu=DES_GRUPO.indexOf(k)>=0?'des':k; document.querySelectorAll('.tab').forEach(function(b){ if (b.dataset.tab===kMenu) b.setAttribute('aria-current','page'); else b.removeAttribute('aria-current'); /* 0.25.0: menu de navegação, não é tablist */ }); desAbasRender();
    var MAP={nat:'tabNat',k1:'tabK1',cer:'tabCer',eta:'tabEta',fp:'tabFp',ex:'tabEx',nao:'tabNao',at:'tabAt',tri:'tabTri',lanc:'tabLanc',rel:'tabRel',met:'tabMet',des:'tabDes',pend:'tabPend',cfg:'tabCfg',sau:'tabSau',eqp:'tabEqp',pes:'tabPes',apr:'tabApr',pn:'tabPn'}; Object.keys(MAP).forEach(function(x){ $(MAP[x]).hidden=state.aba!==x; });
    if (state.sujo && ['rel','tri','lanc','at'].indexOf(k)>=0) delete state.sujo[k]; else if (k!=='geral') pagPendente(k);
    if (k==='rel') renderRel(); if (k==='cfg') renderCfg(); if (k==='sau') renderSau(); if (k==='eqp') renderEqp(); if (k==='apr') renderApr(); if (k==='pn'){ state._pnC=null; renderPn(); } if (k==='tri') renderTri(); if (k==='imp') renderExcluir();  if (k==='lanc') renderLanc(); if (k==='at') renderAtend(); if (k==='des') renderDes(); if (k==='geral') renderVis(); if (k==='pend') renderPendencias(); if (irVis) setTimeout(function(){ var sv=$('secVis'); if (sv&&sv.scrollIntoView) sv.scrollIntoView({block:'start'}); },60); if (k==='pes') renderPes(); var bv=$('btnVis'); if (bv) bv.setAttribute('aria-pressed',(k==='vis'||(PG_VIS[k]&&state.pgVis[k]))?'true':'false'); }
  // 0.24.0: a seção Equipe ficou com Desempenho e Aprendizagem; Relatórios por pessoa, Equipe e funções e Quem fez · Tri7 viraram abas do Desempenho
  var DES_GRUPO=['des','rel','eqp','tri'];
  function desAbaAtual(){ if (state.aba==='des') return state.desVis||(podeEscrever&&Object.keys(state.trab||{}).length?'vg':Object.keys(state.trab||{}).length?'trab':'dias'); return state.aba; }
  function desAbasRender(){ var el=$('desAbas'); if (!el) return; var em=DES_GRUPO.indexOf(state.aba)>=0; el.hidden=!em; if (!em){ el.innerHTML=''; return; }
    var cur=desAbaAtual(), A=[['vg','Visão geral',podeEscrever],['rel','Por pessoa',true],['eqp','Funções',podeEscrever],['tri','Quem fez · Tri7',true],['trab','Tempo de trabalho',true],['dias','Dias na etapa',true]];
    el.innerHTML='<div class="seg" role="group" aria-label="Abas do Desempenho">'+A.filter(function(a){ return a[2]; }).map(function(a){ return '<button type="button" class="segb" data-desaba="'+a[0]+'" aria-pressed="'+(cur===a[0])+'">'+a[1]+'</button>'; }).join('')+'</div>'; }
  function desAbaIr(a){ if (a==='rel'||a==='eqp'||a==='tri') return irAba(a); state.desVis=a; if (state.aba==='des'){ renderDes(); desAbasRender(); } else irAba('des'); }
  function avRascunho(t){ var row=t.closest&&t.closest('#tabEx tr[data-cod]'); if (!row||!t.matches('select.mini,input.mini')) return false;
    var cod=row.dataset.cod, a=atoPorCod(cod); if (!a) return true; var res=row.querySelector('select').value, ob=row.querySelector('input').value.trim(), sv=state.aval[idDoc(cod)]||{};
    if ((sv.resultado||'')===res && (sv.obs||'')===ob) delete state.avDraft[cod]; else state.avDraft[cod]={res:res,obs:ob};
    row.classList.toggle('rasc',!!state.avDraft[cod]); var n=Object.keys(state.avDraft).length, b=$('avTudo'); if (b){ b.disabled=!n; b.textContent=n?'Salvar tudo ('+n+' alterada'+(n>1?'s':'')+')':'Salvar tudo'; }
    if (t.tagName==='SELECT'){ var bf=row.querySelector('[data-av-fb]'); if (res==='nc' && !bf){ var sb=row.querySelector('[data-av-salvar]'); sb.insertAdjacentHTML('afterend',' <button class="btn sm" type="button" data-av-fb="1" title="Abrir o feedback da pessoa que redigiu a exigência">→ Feedback</button>'); } else if (res!=='nc' && bf) bf.remove(); }
    return true; }
  function dicaGo(el,toq){ var g=el.dataset.goh?el:(el.closest&&el.closest('[data-go]')); return g&&g.dataset.goh?'<div class="tip-go">▸ '+(toq?'Toque de novo para ':'Clique para ')+esc(g.dataset.goh)+'</div>':''; }
  // no celular o 1º toque mostra a dica; o 2º toque no mesmo elemento abre
  function toqueSoDica(el){ if (Date.now()-toque.t>900 || toque.el!==el || !toque.novo || !el.hasAttribute('data-tip')) return false; toque.novo=false; return true; }
  function avisar(t){ var a=$('avisoDb'); a.textContent=t; a.hidden=false; }
  // 0.25.0: explicação longa vai para o "?" (gráfico e número na frente; o texto aparece quando a pessoa pede)
  var TXT_MAX_NOTA=110, TXT_MAX_HINT=170;
  function rolavelFoco(root){ root.querySelectorAll('.tbl-wrap:not([tabindex]), .scroll:not([tabindex]), #chartMeses:not([tabindex])').forEach(function(el){ el.setAttribute('tabindex','0'); if (!el.getAttribute('role')) el.setAttribute('role','region'); if (!el.getAttribute('aria-label')) el.setAttribute('aria-label','Tabela ou gráfico (role para ver tudo)'); }); }
  function txtEncolher(root){ if (!root||!root.querySelectorAll) return; rolavelFoco(root);
    root.querySelectorAll('.sec-h .note:not([data-enc]), p.hint:not([data-enc])').forEach(function(el){ el.setAttribute('data-enc','1');
      var lim=el.classList.contains('note')?TXT_MAX_NOTA:TXT_MAX_HINT; if ((el.textContent||'').trim().length<=lim) return;
      if (el.querySelector('button,input,select,textarea,label') || el.closest('.kpi-f,.go-lista,#protBox,.banner')) return;
      var b=document.createElement('button'); b.type='button'; b.className='txt-q'; b.setAttribute('aria-expanded','false'); b.innerHTML='<span aria-hidden="true">?</span> Como ler';
      b.addEventListener('click',function(e){ e.stopPropagation(); el.hidden=!el.hidden; b.setAttribute('aria-expanded',String(!el.hidden)); b.classList.toggle('on',!el.hidden); });
      el.hidden=true; el.classList.add('txt-enc'); el.parentNode.insertBefore(b,el); }); }
  (function(){ var fila=false; function rodar(){ fila=false; ['pgGeral','pgConteudo','importar'].forEach(function(id){ txtEncolher(document.getElementById(id)); }); }
    function agenda(){ if (fila) return; fila=true; (window.requestAnimationFrame||setTimeout)(rodar); }
    if (typeof MutationObserver==='function') document.addEventListener('DOMContentLoaded',function(){ ['pgGeral','pgConteudo'].forEach(function(id){ var r=document.getElementById(id); if (r) new MutationObserver(agenda).observe(r,{childList:true,subtree:true}); }); agenda(); });
  })();
