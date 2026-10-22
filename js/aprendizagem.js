/* Painel SGQ · CRCO — js/aprendizagem.js (0.21.0: reescrita — eficácia da capacitação em POP)
 * ISO 9001 7.2 b/c/d · NBR 15906 7.2.2.4, 7.2.4.1–7.2.4.3 e 7.2.4.5 e · PQTA 2026 itens 7.3 e 27.
 * Cada registro liga uma pessoa a um documento do catálogo (js/catalogo.js). O escopo sai do documento (naturezas + etapas).
 * A partir da data do treinamento o painel conta os atos da pessoa no escopo e traz, já marcadas, as inconformidades
 * dela nesses documentos (o tipo do erro decide quando ela fez mais de uma fase no mesmo documento).
 * Regra (Configuração): taxa ≤ limite = sugere Apto; acima = Não apto; menos atos que o mínimo do POP = amostra pequena.
 * Quem decide é o superior imediato (PQTA 27.2), com a data do feedback (27.3). O painel sugere e gera a evidência.
 * Coleção aprendiz/{id}: registro individual {v:2, k, nome, pop, popVer, popTit, motivo, treino, instrutor, jan, obs, aj{incId:{rel,mot}},
 *   status aberto|concluido, res apto|nao, avaliador, avalEm, feedbackEm, justif, snap{…}, pai, grupo, criadoEm, por}
 *   ou treinamento em grupo {v:2, tipo:'grupo', pop, popVer, treino, instrutor, meses, ks[], obs, criadoEm, por}.
 * 0.21.3: ch (carga horária, h — sugerida pelo Catálogo) nos dois tipos; marcar documentos por fase; participantes não vêm marcados
 *   (o painel pergunta); "Incluir pessoa" e "Excluir" aviso em Quem precisa ser treinado (config/pops {revDisp}); emitir o registro ao salvar. */
(window.PAINEL_ARQ=window.PAINEL_ARQ||{})['js/aprendizagem.js']='0.21.3';
  var APR_MOTIVOS={novo:'Colaborador novo na função', 'pop-novo':'POP novo', 'pop-rev':'POP revisado', funcao:'Mudança de função', reforco:'Reforço', experiencia:'Apto por experiência (ISO 9001 7.2 b)'};
  var APR_RES={apto:['good','Apto'], nao:['warn','Não apto']};
  function aprCfg(){ return {lim:+cfgS('apr.limite'), jan:+cfgS('apr.janela'), minMeses:+cfgS('apr.minMeses'), piso:+cfgS('apr.piso'), teto:+cfgS('apr.teto'), exp:+cfgS('apr.expMeses'), ref:+cfgS('apr.refMeses')}; }
  function aprHoje(){ return new Date().toISOString().slice(0,10); }
  function aprAddMes(iso, n){ var p=String(iso).slice(0,10).split('-').map(Number), d=new Date(Date.UTC(p[0],p[1]-1+n,p[2])); if (d.getUTCDate()!==p[2]) d=new Date(Date.UTC(p[0],p[1]-1+n+1,0)); return d.toISOString().slice(0,10); }
  function aprMesesAtras(n){ var h=mesHoje().split('-').map(Number), m=h[1]-n, a=h[0]; while (m<1){ m+=12; a--; } return a+'-'+(m<10?'0':'')+m; }
  function aprId(){ return 'apr-'+Date.now().toString(36)+Math.random().toString(36).slice(2,5); }
  function aprPct(x){ return x==null||isNaN(x)?'—':pct(x); }

  // ——— execuções (todas as origens, sem o filtro balcão × central do topo) ———
  function aprExecs(){
    var k=[Object.keys(state.docs).length,Object.keys(state.logs).length,Object.keys(state.serv).length,Object.keys(state.andam).length,state.andVer||0,Object.keys(state.usr||{}).length,Object.keys(state.usrAuto||{}).length].join('|');
    if (state._aprX&&state._aprX.k===k) return state._aprX.v;
    var X=[], P={}, D={};
    function dia(n){ return new Date(n*864e5).toISOString().slice(0,10); }
    function add(nome,raw,nat,d,c,src){ if (!nome||!raw||!d) return; var ck=chavePessoa(nome); if (!ck) return; d=String(d).slice(0,10);
      var x={k:ck, nome:nome, raw:raw, etN:popEtNorm(raw), nat:nat||'', natN:popNorm(nat||''), d:d, m:d.slice(0,7), c:String(c), src:src}; X.push(x);
      if (!P[ck]||aprNomeNota(nome)>aprNomeNota(P[ck])) P[ck]=String(nome); var q=D[ck+'|'+x.c]=D[ck+'|'+x.c]||{}; q[x.etN]=1; }
    Object.keys(state.docs).forEach(function(m){ if (!state.logs[m]) return; var map=state.logCache[m]||(state.logCache[m]=Motor.decodificarLog(state.logs[m]));
      state.docs[m].atos.forEach(function(a){ var L=map[a.c]; if (!L) return; L.ev.forEach(function(e){ add(e.rp,e.et,a.nat,dia(e.d),a.c,'VHL'); }); }); });
    var nat=eqNatRI();
    Object.keys(state.andam).forEach(function(m){ state.andam[m].forEach(function(e){ if (e.t!=='P'||!EQ_TRI[e.s]||!e.u||/^tri7$/i.test(e.u)) return; add(nomeLogin(e.u),EQ_TRI[e.s]+' (Tri7)',nat[String(e.n)]||'',Motor.isoMin(e.m).slice(0,10),e.n,'Tri7'); }); });
    Object.keys(state.serv).forEach(function(m){ state.serv[m].forEach(function(d){ d.ets.forEach(function(e){ add(e.rp,e.et,d.nat,e.d?dia(e.d):m+'-01',d.c,'VHL'); }); }); });
    Object.keys(P).forEach(function(q){ P[q]=aprNomeBonito(P[q]); }); state._aprX={k:k, v:X, nomes:P, docEt:D}; state._aprC=null; return X; }
  // nome para mostrar: prefere o escrito em maiúsculas e minúsculas (o VHL às vezes traz tudo em caixa alta); caixa alta vira "Nome Próprio"
  function aprNomeNota(n){ n=String(n||''); return (/[a-zà-ÿ]/.test(n)?1000:0)+(/\./.test(n)?0:100)+n.length; }
  function aprNomeBonito(n){ n=String(n||''); if (/[a-zà-ÿ]/.test(n)) return n; return n.toLowerCase().replace(/(^|\s)([^\s])/g,function(m,a,b){ return a+b.toUpperCase(); }).replace(/\s(De|Da|Do|Dos|Das|E)(?=\s)/g,function(m,a){ return ' '+a.toLowerCase(); }); }
  function aprNomes(){ aprExecs(); return state._aprX.nomes; }
  function aprDocEt(){ aprExecs(); return state._aprX.docEt; }
  // execuções no escopo de um documento, por pessoa (cache por documento + versão do catálogo)
  function aprEscopoIdx(p){ var C=state._aprC=state._aprC||{}, key=p.c+'|'+state.popsVer; if (C[key]) return C[key];
    var porK={}; aprExecs().forEach(function(x){ if (!popNoEscopo(p,x)) return; (porK[x.k]=porK[x.k]||[]).push(x); });
    return (C[key]={porK:porK}); }
  // mínimo de atos do documento = o que uma pessoa costuma fazer no escopo em N meses (mediana da equipe), com piso e teto
  function popMinimo(p){ var cf=aprCfg(), C=state._aprC=state._aprC||{}, key='min|'+p.c+'|'+state.popsVer+'|'+cf.minMeses+'|'+cf.piso+'|'+cf.teto+'|'+cf.ref; if (C[key]) return C[key];
    var r={v:cf.piso, tipico:null, pessoas:0};
    if (popMede(p)){ var ini=aprMesesAtras(cf.ref), fim=mesHoje(), I=aprEscopoIdx(p), meds=[];
      // só quem atua de verdade no POP: as pessoas que, somadas, fazem 80% do volume (as eventuais não puxam o típico para baixo)
      var tot={}, soma=0; Object.keys(I.porK).forEach(function(k){ var pm={}; I.porK[k].forEach(function(x){ if (x.m<ini||x.m>=fim) return; (pm[x.m]=pm[x.m]||{})[x.c]=1; });
        var v=Object.keys(pm).map(function(m){ return Object.keys(pm[m]).length; }), t=v.reduce(function(a,b){ return a+b; },0); if (t){ tot[k]={t:t, med:aprMediana(v)}; soma+=t; } });
      var acum=0; Object.keys(tot).sort(function(a,b){ return tot[b].t-tot[a].t; }).forEach(function(k){ if (acum<soma*0.8){ meds.push(tot[k].med); acum+=tot[k].t; } });
      if (meds.length){ r.tipico=aprMediana(meds); r.pessoas=meds.length; r.v=Math.max(cf.piso,Math.min(cf.teto,Math.round(r.tipico*cf.minMeses))); } }
    return (C[key]=r); }
  function aprMediana(v){ var s=v.slice().sort(function(a,b){ return a-b; }), n=s.length; return n?(n%2?s[(n-1)/2]:(s[n/2-1]+s[n/2])/2):null; }
  // inconformidade pertence à avaliação? (pré-marcação) — tipo do erro decide quando a pessoa fez outra fase do RI no mesmo documento
  function aprPreMarca(p, k, r){ var F=p.fase; if (!POP_FASE_CAT[F]) return true;
    var cat=semAc(catDe(r)), minha=POP_FASE_CAT[F].test(cat); if (minha) return true;
    var ets=aprDocEt()[k+'|'+String(r.c)]||{}, outras=0;
    Object.keys(ets).forEach(function(e){ var f=popFaseDeEt(e); if (f&&f!==F&&POP_FASE_CAT[f]&&POP_FASE_CAT[f].test(cat)) outras++; });
    return !outras; }
  function aprIncPorK(){ var key=Object.keys(state.inconf).map(function(m){ return m+':'+state.inconf[m].length; }).join(',')+'|'+Object.keys(state.incCat||{}).length;
    if (state._aprI&&state._aprI.k===key) return state._aprI.v; var o={};
    incTodos().forEach(function(r){ if (grupoDe(r)==='E') return; var k=chavePessoa(r.r); if (!k) return; (o[k]=o[k]||[]).push(r); });
    state._aprI={k:key, v:o}; return o; }
  // números de um período: atos (documentos distintos) da pessoa no escopo entre ini e fim e as inconformidades nesses documentos
  function aprMedir(p, k, ini, fim, aj){ aj=aj||{};
    var X=(aprEscopoIdx(p).porK[k]||[]).filter(function(x){ return x.d>=ini && x.d<=fim; }), docs={};
    X.forEach(function(x){ docs[x.c]=1; });
    var I=(aprIncPorK()[k]||[]).filter(function(r){ return r.d>=ini; }), inc=[], outras=[];
    I.forEach(function(r){ var no=!!docs[String(r.c)], pre=no&&aprPreMarca(p,k,r), a=aj[r.id], rel=a?!!a.rel:pre;
      var o={id:r.id, d:r.d, c:String(r.c), t:r.t, cat:catDe(r), o:r.o, pre:pre, no:no, rel:rel, mot:a&&a.mot||''};
      if (no||rel) inc.push(o); else if (r.d<=fim) outras.push(o); });
    inc.sort(function(a,b){ return (b.rel-a.rel)||(a.d<b.d?-1:1); });
    var n=Object.keys(docs).length, nRel=inc.filter(function(x){ return x.rel; }).length;
    return {n:n, inc:inc, outras:outras, nRel:nRel, taxa:n?nRel/n*100:null}; }
  // avaliação de um registro (ao vivo ou o retrato salvo na conclusão)
  function aprAval(a){ if (a.status==='concluido'&&a.snap) return a.snap;
    var p=popDe(a.pop)||{c:a.pop, t:a.popTit}, cf=aprCfg(), mede=popMede(p);
    var ini=a.treino||a.ini||aprHoje(), fimJ=a.fim||aprAddMes(ini,+(a.jan||cf.jan)), hoje=aprHoje(), ate=fimJ<hoje?fimJ:hoje;
    var r={mede:mede, de:ini, ate:ate, fimJ:fimJ, acabou:fimJ<=hoje, lim:cf.lim, min:popMinimo(p).v, n:0, inc:[], outras:[], nRel:0, taxa:null, sug:null};
    if (!mede) return r;
    var M=aprMedir(p,a.k,ini,ate,a.aj); r.n=M.n; r.inc=M.inc; r.outras=M.outras; r.nRel=M.nRel; r.taxa=M.taxa;
    r.sug=r.n<r.min?'pequena':(r.taxa<=r.lim?'apto':'nao'); return r; }
  function aprSugTxt(R){ if (!R.mede) return 'sem medição automática: avaliação por quem acompanhou';
    return R.sug==='pequena'?'amostra pequena ('+R.n+' de '+R.min+' atos)':R.sug==='apto'?'Apto ('+aprPct(R.taxa)+' ≤ '+numBR(R.lim,1)+'%)':'Não apto ('+aprPct(R.taxa)+' > '+numBR(R.lim,1)+'%)'; }
  function aprSugPill(R){ var c=!R.mede?'mute':R.sug==='apto'?'good':R.sug==='nao'?'warn':'mute'; return '<span class="pill '+c+'">'+esc(aprSugTxt(R))+'</span>'; }

  // ——— registros ———
  function aprTodos(){ return Object.keys(state.apr||{}).map(function(id){ return state.apr[id]; }).filter(function(a){ return a&&a.v===2&&!a.arquivado; }); }
  function aprLista(){ return aprTodos().filter(function(a){ return a.tipo!=='grupo'; }); }
  function aprGrupos(){ return aprTodos().filter(function(a){ return a.tipo==='grupo'; }); }
  function aprSalvar(a){ state.apr=Object.assign({},state.apr); state.apr[a.id]=a; if (dbPronto&&podeEscrever) return db.doc('aprendiz/'+a.id).set(a).catch(function(){ toast('Não consegui salvar a aprendizagem'); }); return Promise.resolve(); }
  function aprNovo(o){ var p=popDe(o.pop)||{}; return Object.assign({v:2, id:aprId(), status:'aberto', aj:{}, criadoEm:new Date().toISOString(), por:nomeUsuario(), popVer:p.v||'', popTit:p.t||''},o); }
  // quem está em aprendizagem sai da régua dos colegas na Equipe e funções (no período escolhido)
  function eqEmApr(k){ var L=aprLista(); if (!L.length) return false; var ck=chavePessoa(k), per=state.periodo;
    return L.some(function(a){ if (a.k!==ck||a.motivo==='experiencia') return false; if (per==='todos') return a.status==='aberto';
      var ini=String(a.treino||'').slice(0,7), fim=String(a.status==='concluido'?(a.avalEm||a.treino):aprHoje()).slice(0,7); return ini&&per>=ini&&per<=fim; }); }

  // ——— página ———
  function renderApr(){
    var el=$('tabApr'); if (!el) return; aprLerRascunhos(); if (state.aprRevFresco) state.aprRevFresco=false; else aprRevLer();
    var L=aprLista(), ab=L.filter(function(a){ return a.status!=='concluido'; }).sort(function(a,b){ return String(a.nome).localeCompare(String(b.nome),'pt-BR')||(a.pop<b.pop?-1:1); }),
        fe=L.filter(function(a){ return a.status==='concluido'; }).sort(function(a,b){ return String(b.avalEm||'')<String(a.avalEm||'')?-1:1; }), cf=aprCfg();
    var h='<div class="sec-h"><span class="note">Eficácia da capacitação em POP: você registra a pessoa, o documento e a data do treinamento; o painel acompanha os atos dela no escopo e as inconformidades nesses documentos. '+
      'Regra: até <b>'+numBR(cf.lim,1)+'%</b> de inconformidade relacionada = sugere Apto; janela de referência de <b>'+cf.jan+' meses</b>; abaixo do mínimo do POP aparece "amostra pequena". '+
      'Quem decide é o superior imediato, com a data do feedback (ISO 9001 7.2; NBR 15906 7.2.4; PQTA 27). A linha oficial fica na Matriz de Competências do SGQ; o painel só gera a evidência.</span></div>';
    h+='<div class="search apr-bt">'+(podeEscrever?'<button class="btn primary sm" type="button" data-aprnovo="1">Nova aprendizagem</button><button class="btn sm" type="button" data-aprgnovo="1">Treinamento em grupo</button>':'')+'<span class="spacer"></span>'+
      '<button class="btn sm" type="button" data-aprbranco="1">Registro de treinamento em branco</button>'+(L.length?'<button class="btn sm" type="button" data-aprcompet="1">Baixar linhas da COMPET</button><button class="btn sm" type="button" data-aprcons="1">Relatório consolidado</button>':'')+'</div>'+
      (L.length?'<div class="search apr-bt"><label class="apr-inl">Histórico de capacitação de <select id="aprHistK">'+aprHistOpc()+'</select></label><button class="btn sm" type="button" data-aprhist="1">Baixar</button>'+(function(){ var n=aprTodos().filter(function(a){ return aprEvPend(a); }).length; return n?'<span class="spacer"></span><span class="pill warn">'+n+' registro(s) com evidência pendente</span>':''; })()+'</div>':'');
    if (state.aprEmitir){ var em=state.aprEmitir; h+='<div class="panel apr-rev apr-emitir"><div class="sub-h">Cadastro concluído · registro de treinamento</div><p class="hint" style="margin:4px 0 8px">'+esc((em.pops||[]).join(', '))+' · '+(em.treino?fmtData(em.treino):'')+(em.instrutor?' · por '+esc(em.instrutor):'')+' · '+(em.pessoas||[]).length+' participante(s)'+(em.ch!=null?' · '+popChTxt(em.ch):'')+'. Já sai preenchido com data, carga horária, quem treinou, documentos e participantes; é só mandar para assinar.</p>'+
      '<div class="ctl"><button class="btn primary sm" type="button" data-apremitir="sim">Emitir registro de treinamento</button><button class="btn sm" type="button" data-apremitir="nao">Agora não</button></div></div>'; }
    if (state.aprForm) h+=aprFormHTML(state.aprForm);
    if (state.aprGForm) h+=aprGFormHTML(state.aprGForm);
    h+=aprRevHTML();
    h+='<div class="sub-h" style="margin-top:14px">Em aprendizagem · '+ab.length+'</div>';
    h+=ab.length?ab.map(aprCardHTML).join(''):'<div class="empty"><b>Ninguém em aprendizagem</b>Clique em "Nova aprendizagem" ou abra pela lista "Quem precisa ser treinado".</div>';
    var G=aprGrupos().sort(function(a,b){ return a.treino<b.treino?1:-1; });
    if (G.length) h+='<div class="sub-h" style="margin-top:16px">Treinamentos em grupo · '+G.length+'</div>'+G.map(aprGCardHTML).join('');
    if (fe.length) h+='<details class="apr-det"'+(state.aprVerFim?' open':'')+' data-aprdet="fim"><summary>Concluídas · '+fe.length+' ('+fe.filter(function(a){ return a.res==='apto'; }).length+' Apto · '+fe.filter(function(a){ return a.res==='nao'; }).length+' Não apto)</summary>'+fe.map(aprCardHTML).join('')+'</details>';
    if (podeEscrever) h+=aprExpHTML();
    el.innerHTML=h; }
  // 0.21.2: evidência do treinamento (não precisa ser ata) — ISO 9001 7.2 d; NBR 15906 7.2.2.4; PQTA 26
  var APR_EV={reg:'Registro de treinamento assinado', teams:'Mensagem no Teams com ciência', lista:'Lista de presença', cert:'Certificado (IMQC/externo)', foto:'Foto ou print', ata:'Ata de reunião', pend:'Ainda sem evidência (formalizar)'};
  function aprEvPend(a){ return a.motivo!=='experiencia' && (!a.ev||a.ev==='pend'); }
  function aprEvTxt(a){ if (a.motivo==='experiencia') return 'Experiência comprovada pelos atos (ISO 9001 7.2 b)'; return (APR_EV[a.ev]||APR_EV.pend)+(a.evRef?' · '+a.evRef:''); }
  function aprEvHTML(pref, ev, ref){ ev=ev||'pend';
    return '<label>Evidência do treinamento<select id="'+pref+'Ev">'+Object.keys(APR_EV).map(function(k){ return '<option value="'+k+'"'+(k===ev?' selected':'')+'>'+APR_EV[k]+'</option>'; }).join('')+'</select></label>'+
      '<label>Referência da evidência<input type="text" id="'+pref+'EvRef" value="'+esc(ref||'')+'" placeholder="nº do registro, link do Teams ou data"></label>'; }
  function aprLerEv(pref){ return {ev:($(pref+'Ev')||{}).value||'pend', evRef:String(($(pref+'EvRef')||{}).value||'').trim()}; }
  // 0.21.3: marcar de uma vez todos os documentos de uma fase (ex.: "Recepção") — não desmarca o resto, continua editável
  function aprFaseChipsHTML(attr){ var fases={}; popsTodos().forEach(function(p){ if (p.fase&&POP_FASE_NOME[p.fase]) fases[p.fase]=1; });
    var ordem=['REC','QLF','MIN','REV'], ks=Object.keys(fases).sort(function(a,b){ var ia=ordem.indexOf(a), ib=ordem.indexOf(b); if (ia<0) ia=99; if (ib<0) ib=99; return (ia-ib)||a.localeCompare(b); });
    if (!ks.length) return '';
    return '<div class="apr-fasechips" style="margin:4px 0"><span class="mut" style="margin-right:6px">Marcar por fase:</span>'+ks.map(function(f){ return '<button type="button" class="btn sm" data-aprfasechip="'+esc(attr)+'|'+esc(f)+'">'+esc(POP_FASE_NOME[f])+'</button>'; }).join(' ')+'</div>'; }
  // lista de documentos para marcar (vários POPs/ITs de uma vez), com filtro
  function aprPopsMarcarHTML(attr, sel, k){ var sv=null, h='<div class="pop-bh"><b>Documentos (POP / IT)</b> <span class="mut" data-aprpopsn="'+attr+'">'+(sel||[]).length+' marcado(s)</span><input type="search" class="mini" data-aprbusca="'+attr+'" placeholder="filtrar…" aria-label="Filtrar documentos"></div>'+aprFaseChipsHTML(attr)+'<div class="apr-chk pop-lista apr-pops" data-aprpopslista="'+attr+'">';
    popsTodos().forEach(function(p){ if (p.sv!==sv){ sv=p.sv; h+='<div class="apr-popsv">'+esc(sv)+'</div>'; } var mede=popMede(p), info='';
      if (mede){ info='mín. '+popMinimo(p).v; if (k){ var corte=aprMesesAtras(12)+'-01', dd={}; (aprEscopoIdx(p).porK[k]||[]).forEach(function(x){ if (x.d>=corte) dd[x.c]=1; }); var n=Object.keys(dd).length; if (n) info+=' · '+n+(n===1?' ato':' atos')+' em 12 meses'; } } else info='sem medição';
      h+='<label data-popnome="'+esc(semAc(p.c+' '+(p.t||'')))+'"><input type="checkbox" data-'+attr+'="'+esc(p.c)+'"'+((sel||[]).indexOf(p.c)>=0?' checked':'')+'> <b>'+esc(p.c)+'</b> '+esc((p.t||'').split(' (')[0])+' <span class="mut">'+info+'</span></label>'; });
    return h+'</div>'; }
  function aprPopsMarcados(attr){ return [].slice.call(document.querySelectorAll('#tabApr [data-'+attr+']:checked')).map(function(x){ return x.getAttribute('data-'+attr); }); }
  function aprFiltrar(t){ var q=semAc(t.value||''), box=document.querySelector('[data-aprpopslista="'+t.dataset.aprbusca+'"]'); if (!box) return; box.querySelectorAll('label').forEach(function(l){ l.hidden=!!q&&l.dataset.popnome.indexOf(q)<0; }); }
  // 0.21.1: tudo que dá para escolher vira lista (sem digitar nome)
  var APR_MOT_DESM=['Erro de outra fase','Erro não ligado a este POP','Registro duplicado ou equivocado'];
  function aprEquipe(){ var P=aprNomes(), corte=aprMesesAtras(12), at={}; aprExecs().forEach(function(x){ if (x.m>=corte) at[x.k]=1; });
    return Object.keys(P).filter(function(k){ return at[k]; }).map(function(k){ return P[k]; }).sort(function(a,b){ return a.localeCompare(b,'pt-BR'); }); }
  function aprEu(){ var u=semAc(nomeUsuario()); if (!u) return ''; var L=aprEquipe(); for (var i=0;i<L.length;i++) if (semAc(L[i])===u||semAc(L[i]).indexOf(u+' ')===0) return L[i]; return ''; }
  // lista de pessoas da equipe; com "outro", abre um campo para quem é de fora (IMQC, ENNOR…)
  function aprSelPessoa(id, valor, outro, attrs){ var L=aprEquipe(), v=String(valor||''), tem=!v||L.indexOf(v)>=0;
    var h='<select id="'+id+'" data-aprsel="'+id+'"'+(attrs||'')+'><option value="">Escolha…</option>'+L.map(function(n){ return '<option'+(n===v?' selected':'')+'>'+esc(n)+'</option>'; }).join('')+
      (!tem&&!outro?'<option selected>'+esc(v)+'</option>':'')+(outro?'<option value="__outro"'+(tem?'':' selected')+'>Outro (de fora da equipe)…</option>':'')+'</select>';
    if (outro) h+='<input type="text" id="'+id+'_o" class="mini apr-outro" value="'+esc(tem?'':v)+'" placeholder="nome ou instituição"'+(tem?' hidden':'')+'>';
    return h; }
  function aprLerSel(id){ var s=$(id); if (!s) return ''; if (s.value==='__outro'){ var o=$(id+'_o'); return String(o&&o.value||'').trim(); } return s.value; }
  function aprPessoasOpc(sel, extra){ var P=aprNomes(), corte=aprMesesAtras(12), ativos={}; aprExecs().forEach(function(x){ if (x.m>=corte) ativos[x.k]=1; });
    var ks=Object.keys(P).filter(function(k){ return ativos[k]||k===sel; }).sort(function(a,b){ return String(P[a]).localeCompare(String(P[b]),'pt-BR'); });
    return '<option value="">Escolha…</option>'+ks.map(function(k){ return '<option value="'+esc(k)+'"'+(k===sel?' selected':'')+'>'+esc(P[k])+'</option>'; }).join('')+(extra||''); }
  function aprPopOpc(sel){ var sv=null, h='<option value="">Escolha…</option>';
    popsTodos().forEach(function(p){ if (p.sv!==sv){ if (sv!==null) h+='</optgroup>'; sv=p.sv; h+='<optgroup label="'+esc(sv)+'">'; } h+='<option value="'+esc(p.c)+'"'+(p.c===sel?' selected':'')+'>'+esc(p.c+' · '+(p.t||'').split(' (')[0])+(popMede(p)?'':' (sem medição)')+'</option>'; });
    return h+(sv!==null?'</optgroup>':''); }
  function aprEscopoTxt(p){ if (!p) return ''; if (!popMede(p)) return '<p class="hint">Este documento não tem medição automática: a eficácia é avaliada por quem acompanhou, e o painel registra e gera o relatório.</p>';
    var m=popMinimo(p); return '<p class="hint">Escopo: <b>'+esc((p.ets||[]).join(', '))+'</b> nas naturezas <b>'+esc((p.nats||[]).join(', '))+'</b>'+(p.conf?'':' <span class="pill warn">a conferir</span>')+'. Mínimo para avaliar: <b>'+m.v+' atos</b>'+(m.tipico!=null?' (uma pessoa faz cerca de '+numBR(m.tipico,1)+' por mês; '+m.pessoas+' pessoas no escopo)':' (sem histórico: vale o piso)')+'.</p>'; }
  function aprFormHTML(f){ var p=f.id?popDe(f.pop):null, P=aprNomes();
    var docs=f.id?'<label>Documento<input type="text" value="'+esc(f.pop+' — '+(f.popTit||''))+'" disabled></label>':'';
    return '<div class="panel apr-f"><div class="sub-h">'+(f.id?'Editar aprendizagem':'Nova aprendizagem')+'</div><div class="apr-g">'+
      '<label>Pessoa<select id="aprK"'+(f.id?' disabled':'')+'>'+aprPessoasOpc(f.k)+'</select></label>'+docs+
      '<label>Motivo<select id="aprMot">'+Object.keys(APR_MOTIVOS).filter(function(m){ return m!=='experiencia'; }).map(function(m){ return '<option value="'+m+'"'+(f.motivo===m?' selected':'')+'>'+APR_MOTIVOS[m]+'</option>'; }).join('')+'</select></label>'+
      '<label>Data do treinamento<input type="date" id="aprTr" value="'+esc(f.treino||aprHoje())+'"></label>'+
      '<label>Treinado por'+aprSelPessoa('aprIns',f.instrutor,true)+'</label>'+
      '<label>Janela de referência (meses)<input type="number" id="aprJan" min="1" max="12" value="'+(+f.jan||aprCfg().jan)+'"></label>'+aprChHTML('aprCh',f,f.id?[f.pop]:(f.pops||(f.pop?[f.pop]:[])))+aprEvHTML('aprF',f.ev,f.evRef)+'</div>'+
      (f.id?aprEscopoTxt(p):'<div class="apr-box">'+aprPopsMarcarHTML('aprpopc',f.pops||(f.pop?[f.pop]:[]),f.k)+'<p class="hint">Um registro por documento marcado (a Matriz é pessoa × POP). O mínimo de cada um aparece ao lado'+(f.k?'; e quantos atos a pessoa já fez no escopo nos últimos 12 meses. Se ela já domina, use a carga "Apto por experiência"':'')+'.</p></div>')+
      '<label class="apr-obs">Observação<textarea id="aprObs" rows="2" placeholder="Ex.: treinamento prático com acompanhamento dos 10 primeiros títulos">'+esc(f.obs||'')+'</textarea></label>'+
      '<div class="ctl" style="margin-top:8px"><button class="btn primary sm" type="button" data-aprsalvarf="1">Salvar</button><button class="btn sm" type="button" data-aprcancelar="1">Cancelar</button>'+(f.id?'':'<button class="btn sm" type="button" data-aprprintf="1">Imprimir registro de treinamento</button>')+'</div></div>'; }
  function aprLerForm(){ var f=Object.assign({},state.aprForm||{}); if (!f.id){ f.k=($('aprK')||{}).value||f.k||''; if (document.querySelector('#tabApr [data-aprpopslista="aprpopc"]')) f.pops=aprPopsMarcados('aprpopc'); }
    var e=aprLerEv('aprF'); f.ev=e.ev; f.evRef=e.evRef;
    f.motivo=($('aprMot')||{}).value||f.motivo||'novo'; f.treino=($('aprTr')||{}).value||f.treino||aprHoje(); f.instrutor=$('aprIns')?aprLerSel('aprIns'):(f.instrutor||''); f.jan=Math.max(1,Math.min(12,+($('aprJan')||{}).value||aprCfg().jan)); f.obs=String(($('aprObs')||{}).value||'').trim(); aprLerCh('aprCh',f); return f; }
  // 0.21.3: carga horária do treinamento — sugere a soma das cargas padrão do Catálogo; o que você digitar vale
  function aprChHTML(id, f, pops){ var sug=popChSoma(pops), v=f.chMan?f.ch:sug;
    return '<label>Carga horária (h)<input type="number" id="'+id+'" min="0" step="0.5" value="'+(v!=null&&v!==''?esc(v):'')+'" placeholder="'+(sug==null?'sem padrão no Catálogo':'')+'"><span class="hint" id="'+id+'_s" style="margin:2px 0 0">'+(sug!=null?'sugerido pelo Catálogo: '+popChTxt(sug):'cadastre a carga padrão em Configuração › POPs e escopo')+'</span></label>'; }
  function aprLerCh(id, f){ var e=$(id); if (!e) return; f.ch=e.value===''?null:+e.value; }
  function aprChAtualizar(id, form, pops){ var e=$(id), s=$(id+'_s'), sug=popChSoma(pops); if (!e) return;
    if (!(form&&form.chMan)) e.value=sug!=null?sug:''; if (s) s.textContent=sug!=null?'sugerido pelo Catálogo: '+popChTxt(sug):'cadastre a carga padrão em Configuração › POPs e escopo'; }

  // cartão de um registro
  function aprCardHTML(a){ var R=aprAval(a), aberto=state.aprAberto===a.id, fim=a.status==='concluido', p=popDe(a.pop);
    var barra=R.mede?'<div class="apr-bar" title="'+R.n+' de '+R.min+' atos"><span style="width:'+Math.min(100,R.min?R.n/R.min*100:0).toFixed(0)+'%"></span></div><span class="mut">'+R.n+' de '+R.min+' atos · '+R.nRel+' inconformidade(s) · '+aprPct(R.taxa)+'</span>':'';
    var h='<div class="panel apr-c'+(fim?' fim':'')+'"><div class="apr-h"><div class="apr-hd"><b>'+esc(a.nome)+'</b> · '+esc(a.pop)+(a.popVer?' <span class="mut">v'+esc(a.popVer)+'</span>':'')+(p&&p.v&&a.popVer&&p.v!==a.popVer?' <span class="pill warn">POP na v'+esc(p.v)+'</span>':'')+
      '<div class="hint" style="margin:2px 0 0">'+esc(APR_MOTIVOS[a.motivo]||a.motivo||'')+(a.treino?' · treinado em '+fmtData(a.treino)+(a.instrutor?' por '+esc(a.instrutor):''):'')+(aprEvPend(a)?' · <span class="pill warn">evidência pendente</span>':' · '+esc(aprEvTxt(a)))+(R.mede?' · período avaliado '+fmtData(R.de)+' a '+fmtData(R.ate)+(fim||R.acabou?'':' (janela até '+fmtData(R.fimJ)+')'):'')+'</div>'+
      (barra?'<div class="apr-prog">'+barra+'</div>':'')+'</div><span class="spacer"></span>'+
      (fim?'<span class="pill '+(APR_RES[a.res]||['mute'])[0]+'">'+esc((APR_RES[a.res]||['','—'])[1])+'</span>'+(a.feedbackEm?'':' <span class="pill mute">feedback pendente</span>'):aprSugPill(R))+
      '<button class="btn sm" type="button" data-aprabrir="'+esc(a.id)+'" aria-expanded="'+(aberto?'true':'false')+'">'+(aberto?'Fechar':fim?'Ver':'Avaliar')+'</button>'+(podeEscrever?'<button class="btn sm" type="button" data-aprexcluir="'+esc(a.id)+'" title="Excluir registro lançado errado">Excluir</button>':'')+'</div>';
    if (aberto) h+=aprAvalHTML(a,R);
    return h+'</div>'; }
  function aprIncTabela(a, R, fim){ if (!R.inc.length) return '<p class="hint">Nenhuma inconformidade da pessoa nos documentos avaliados.</p>';
    var ed=podeEscrever&&!fim;
    return '<div class="tbl-wrap"><table class="tleft"><thead><tr><th>Conta?</th><th>Data</th><th>Documento</th><th>Tipo do erro</th>'+(fim?'':'<th>Observação</th>')+'</tr></thead><tbody>'+R.inc.map(function(x){
      return '<tr><td><label class="lc-chk"><input type="checkbox" data-aprrel="'+esc(x.id)+'" data-aprpre="'+(x.pre?1:0)+'"'+(x.rel?' checked':'')+(ed?'':' disabled')+'> sim</label>'+(x.pre?'':' <span class="pill mute">'+(x.no?'outra fase':'fora do escopo')+'</span>')+
        (!x.rel&&x.pre?aprMotDesmHTML(x,ed):'')+'</td><td>'+fmtData(x.d)+'</td><td>'+protLink(x.c)+' <span class="mut">'+esc(x.t||'')+'</span></td><td>'+esc(x.cat)+'</td>'+(fim?'':'<td style="min-width:240px">'+esc(x.o||'')+'</td>')+'</tr>'; }).join('')+'</tbody></table></div>'; }
  function aprMotDesmHTML(x, ed){ var m=String(x.mot||''), padrao=APR_MOT_DESM.indexOf(m)>=0, outro=!!m&&!padrao, dis=ed?'':' disabled';
    return '<div class="apr-mot"><select class="mini" data-aprmotsel="'+esc(x.id)+'"'+dis+' aria-label="Por que não conta?"><option value="">Por que não conta? (obrigatório)</option>'+APR_MOT_DESM.map(function(o){ return '<option'+(o===m?' selected':'')+'>'+esc(o)+'</option>'; }).join('')+'<option value="__outro"'+(outro?' selected':'')+'>Outro…</option></select>'+
      '<input type="text" class="mini" data-aprmot="'+esc(x.id)+'" value="'+esc(outro?m:'')+'" placeholder="escreva o motivo"'+(outro?'':' hidden')+dis+'></div>'; }
  function aprAvalHTML(a, R){ var fim=a.status==='concluido', d=state.aprDraft[a.id]||{}, P=aprNomes(), h='<div class="apr-av">';
    if (R.mede){ h+='<div class="kpis" style="margin-bottom:10px">'+kpi('Atos no escopo',String(R.n),'mínimo do POP: '+R.min,R.n<R.min?'':'')+kpi('Inconformidades que contam',String(R.nRel),'em '+R.n+' documentos')+kpi('Taxa',aprPct(R.taxa),'limite: '+numBR(R.lim,1)+'%')+kpi('Sugestão do painel',R.sug==='apto'?'Apto':R.sug==='nao'?'Não apto':'Amostra pequena',R.sug==='pequena'?'faltam '+(R.min-R.n)+' atos para o mínimo':'a decisão é do superior')+'</div>';
      h+=aprIncTabela(a,R,fim);
      if (!fim&&R.outras.length) h+='<details class="apr-det"><summary>Outras inconformidades da pessoa no período ('+R.outras.length+', fora dos documentos avaliados)</summary><div class="tbl-wrap"><table class="tleft"><tbody>'+R.outras.map(function(x){ return '<tr><td><label class="lc-chk"><input type="checkbox" data-aprrel="'+esc(x.id)+'" data-aprpre="0"'+(podeEscrever?'':' disabled')+'> contar</label></td><td>'+fmtData(x.d)+'</td><td>'+protLink(x.c)+'</td><td>'+esc(x.cat)+'</td></tr>'; }).join('')+'</tbody></table></div></details>';
      h+='<p class="hint">Contam, já marcadas, as inconformidades internas da pessoa nos documentos do escopo feitos a partir do treinamento. Se ela fez outra fase no mesmo documento (ex.: qualificação e minuta), o tipo do erro decide a fase. Desmarcar pede o motivo.</p>'; }
    else h+='<p class="hint">Sem medição automática: registre a avaliação de quem acompanhou na justificativa.</p>';
    if (a.obs) h+='<p class="hint">Observação do cadastro: '+esc(a.obs)+'</p>';
    if (a.motivo!=='experiencia'){ h+='<div class="apr-res apr-ev">'+(podeEscrever?aprEvHTML('aprE_'+a.id,a.ev,a.evRef)+'<button class="btn sm" type="button" data-aprev="'+esc(a.id)+'">Atualizar evidência</button>':'<span class="hint">Evidência do treinamento: '+esc(aprEvTxt(a))+'</span>')+'<button class="btn sm" type="button" data-aprprint="'+esc(a.id)+'">Imprimir registro de treinamento</button></div>'; }
    if (fim){ h+='<p class="hint">Concluído em '+fmtData(String(a.avalEm||'').slice(0,10))+' por '+esc(a.avaliador||'—')+': <b>'+esc((APR_RES[a.res]||['','—'])[1])+'</b>'+(a.justif?' — '+esc(a.justif):'')+'. Feedback: '+(a.feedbackEm?fmtData(a.feedbackEm):'<b>pendente</b>')+'.</p>';
      h+='<div class="ctl apr-bt">'+'<button class="btn sm" type="button" data-aprrel1="'+esc(a.id)+'">Baixar relatório (evidência)</button>';
      if (podeEscrever){ if (!a.feedbackEm) h+='<label class="apr-inl">Feedback dado em <input type="date" id="aprFb_'+esc(a.id)+'" value="'+aprHoje()+'"></label><button class="btn sm" type="button" data-aprfb="'+esc(a.id)+'">Registrar feedback</button>';
        if (a.res==='nao'&&!aprLista().some(function(x){ return x.pai===a.id; })) h+='<button class="btn sm" type="button" data-aprreforco="'+esc(a.id)+'">Abrir reforço</button>';
        h+='<button class="btn sm" type="button" data-aprreabrir="'+esc(a.id)+'">Reabrir</button>'; }
      return h+'</div></div>'; }
    if (!podeEscrever) return h+'</div>';
    var sugRes=R.sug==='apto'?'apto':R.sug==='nao'?'nao':'';
    h+='<div class="apr-res"><label>Resultado<select id="aprRes_'+esc(a.id)+'" data-aprdr="'+esc(a.id)+'"><option value="">—</option><option value="apto"'+((d.res||sugRes)==='apto'?' selected':'')+'>Apto</option><option value="nao"'+((d.res||sugRes)==='nao'?' selected':'')+'>Não apto</option></select></label>'+
      '<label>Avaliado por'+aprSelPessoa('aprAv_'+a.id,d.av!=null?d.av:aprEu(),false,' data-aprdr="'+esc(a.id)+'"')+'</label>'+
      '<label>Feedback dado em<input type="date" id="aprFbd_'+esc(a.id)+'" data-aprdr="'+esc(a.id)+'" value="'+esc(d.fb||'')+'"></label>'+
      '<label class="apr-jus">Justificativa'+(R.mede&&R.sug!=='pequena'?' (obrigatória se for contra a sugestão)':' (obrigatória)')+'<input type="text" id="aprJus_'+esc(a.id)+'" data-aprdr="'+esc(a.id)+'" value="'+esc(d.jus||'')+'" placeholder="ex.: acompanhamento dos 10 primeiros títulos sem erro"></label></div>'+
      '<div class="ctl apr-bt" style="margin-top:8px"><button class="btn primary sm" type="button" data-aprconcluir="'+esc(a.id)+'">Concluir avaliação</button><button class="btn sm" type="button" data-aprrel1="'+esc(a.id)+'">Baixar relatório parcial</button><button class="btn sm" type="button" data-apreditar="'+esc(a.id)+'">Editar</button></div>';
    return h+'</div>'; }
  // rascunhos do veredito (sobrevivem ao redesenho da página)
  function aprLerRascunhos(){ document.querySelectorAll('#tabApr [data-aprdr]').forEach(function(e){ var id=e.dataset.aprdr, d=state.aprDraft[id]=state.aprDraft[id]||{}, k=e.id.split('_')[0];
    if (k==='aprRes') d.res=e.value; else if (k==='aprAv') d.av=e.value; else if (k==='aprFbd') d.fb=e.value; else if (k==='aprJus') d.jus=e.value; }); }

  // ——— treinamento em grupo (antes × depois) ———
  function aprGPessoas(f){ var P=aprNomes(), corte=aprMesesAtras(12)+'-01', o={};
    (f.pops||[]).forEach(function(c){ var p=popDe(c); if (!p||!popMede(p)) return; var I=aprEscopoIdx(p); Object.keys(I.porK).forEach(function(k){ if (I.porK[k].some(function(x){ return x.d>=corte; })) o[k]=1; }); });
    (f.extra||[]).forEach(function(k){ o[k]=1; });
    return Object.keys(o).sort(function(a,b){ return String(P[a]).localeCompare(String(P[b]),'pt-BR'); }); }
  function aprGFormHTML(f){ var P=aprNomes(), ks=aprGPessoas(f), sel=f.ks||[], perguntar=ks.length>0&&!f.confirmado;
    return '<div class="panel apr-f"><div class="sub-h">Treinamento em grupo · antes × depois</div><p class="hint">Para um treinamento com várias pessoas de uma vez (ex.: POP revisado apresentado à equipe). O painel compara a taxa de inconformidade no escopo de cada documento nos meses antes e depois da data.</p><div class="apr-g">'+
      '<label>Data do treinamento<input type="date" id="aprGTr" value="'+esc(f.treino||aprHoje())+'"></label>'+
      '<label>Treinado por'+aprSelPessoa('aprGIns',f.instrutor,true)+'</label><label>Meses antes e depois<input type="number" id="aprGM" min="1" max="12" value="'+(+f.meses||aprCfg().jan)+'"></label>'+aprChHTML('aprGCh',f,f.pops||[])+aprEvHTML('aprG',f.ev,f.evRef)+'</div>'+
      '<div class="apr-box">'+aprPopsMarcarHTML('aprgpopc',f.pops||[],null)+'</div>'+
      '<div class="sub-h" style="margin-top:8px">Participantes'+(ks.length?' (quem executou o escopo nos últimos 12 meses)':'')+'</div>'+
      (perguntar?'<div class="apr-rv" style="margin:4px 0 8px"><span class="hint">'+ks.length+' pessoa(s) executaram este escopo nos últimos 12 meses. Adicionar todas como participantes?</span><div class="ctl" style="margin-top:4px"><button type="button" class="btn sm primary" data-aprgconf="sim">Sim, adicionar todas</button><button type="button" class="btn sm" data-aprgconf="nao">Não, vou marcar manualmente</button></div></div>':'')+
      (ks.length?'<div class="apr-chk">'+ks.map(function(k){ return '<label><input type="checkbox" data-aprgk="'+esc(k)+'"'+(sel.indexOf(k)>=0?' checked':'')+'> '+esc(P[k])+((f.extra||[]).indexOf(k)>=0?' <span class="mut">incluída</span>':'')+'</label>'; }).join('')+'</div>':'<p class="hint">Marque os documentos ou inclua as pessoas abaixo.</p>')+
      '<div class="ctl" style="margin-top:6px"><label class="apr-inl">Incluir pessoa <select id="aprGAdd">'+aprPessoasOpc('')+'</select></label><button class="btn sm" type="button" data-aprgadd="1">Incluir</button></div>'+
      '<label class="apr-inl" style="margin-top:8px"><input type="checkbox" id="aprGInd"'+(f.ind?' checked':'')+'> Abrir também a aprendizagem individual de cada participante em cada documento</label>'+
      '<label class="apr-obs">Observação<input type="text" id="aprGObs" value="'+esc(f.obs||'')+'" placeholder="ex.: apresentação da v1.0.2 na reunião de setor"></label>'+
      '<div class="ctl" style="margin-top:8px"><button class="btn primary sm" type="button" data-aprgsalvar="1">Salvar</button><button class="btn sm" type="button" data-aprcancelar="1">Cancelar</button><button class="btn sm" type="button" data-aprprintg="1">Imprimir registro de treinamento</button></div></div>'; }
  function aprLerGForm(){ var f=Object.assign({},state.aprGForm||{}); f.treino=($('aprGTr')||{}).value||f.treino||aprHoje(); f.instrutor=$('aprGIns')?aprLerSel('aprGIns'):(f.instrutor||''); f.meses=Math.max(1,Math.min(12,+($('aprGM')||{}).value||aprCfg().jan)); f.obs=String(($('aprGObs')||{}).value||'').trim(); f.ind=!!($('aprGInd')||{}).checked;
    if (document.querySelector('#tabApr [data-aprpopslista="aprgpopc"]')) f.pops=aprPopsMarcados('aprgpopc'); var e=aprLerEv('aprG'); f.ev=e.ev; f.evRef=e.evRef; aprLerCh('aprGCh',f);
    var cx=document.querySelectorAll('#tabApr [data-aprgk]'); if (cx.length) f.ks=[].slice.call(cx).filter(function(x){ return x.checked; }).map(function(x){ return x.dataset.aprgk; }); return f; }
  // z de duas proporções (antes × depois)
  function aprZ(x1,n1,x2,n2){ if (!n1||!n2) return null; var p=(x1+x2)/(n1+n2); if (p<=0||p>=1) return null; var se=Math.sqrt(p*(1-p)*(1/n1+1/n2)); return se?(x2/n2-x1/n1)/se:null; }
  function aprGPops(g){ return (g.pops&&g.pops.length)?g.pops:(g.pop?[g.pop]:[]); }
  function aprGAvalPop(g, c){ var p=popDe(c)||{c:c}, out={c:c, mede:popMede(p)}; if (!out.mede) return out;
    var ini=aprAddMes(g.treino,-(+g.meses||3)), dep=aprAddMes(g.treino,+(+g.meses||3)), hoje=aprHoje(), ate=dep<hoje?dep:hoje;
    var dAntes=new Date(Date.parse(g.treino)-864e5).toISOString().slice(0,10), ks=(g.ks&&g.ks.length)?g.ks:Object.keys(aprEscopoIdx(p).porK);
    function soma(a,b){ var n=0, x=0; ks.forEach(function(k){ var M=aprMedirJanela(p,k,a,b); n+=M.n; x+=M.nRel; }); return {n:n, x:x, taxa:n?x/n*100:null}; }
    out.antes=soma(ini,dAntes); out.depois=soma(g.treino,ate); return out; }
  function aprGLeitura(o){ o.z=aprZ(o.antes.x,o.antes.n,o.depois.x,o.depois.n); o.pequeno=o.antes.n<20||o.depois.n<20;
    var dif=o.antes.taxa!=null&&o.depois.taxa!=null?o.depois.taxa-o.antes.taxa:null; o.dif=dif;
    o.txt=dif==null?'sem atos suficientes para comparar':(o.pequeno?'amostra pequena (menos de 20 atos de um dos lados): ':'')+(Math.abs(dif)<0.05?'sem mudança':(dif<0?'caiu ':'subiu ')+numBR(Math.abs(dif),1)+' p.p.')+(o.z!=null&&Math.abs(o.z)>=1.96?' · diferença real (95% de confiança)':' · a diferença pode ser acaso');
    return o; }
  function aprGAval(g){ var dep=aprAddMes(g.treino,+(+g.meses||3)), hoje=aprHoje();
    var out={de:aprAddMes(g.treino,-(+g.meses||3)), ate:dep<hoje?dep:hoje, fim:dep, acabou:dep<=hoje, porPop:aprGPops(g).map(function(c){ var o=aprGAvalPop(g,c); return o.mede?aprGLeitura(o):o; })};
    var M=out.porPop.filter(function(o){ return o.mede; }); out.mede=M.length>0; if (!out.mede) return out;
    var A={n:0,x:0}, D={n:0,x:0}; M.forEach(function(o){ A.n+=o.antes.n; A.x+=o.antes.x; D.n+=o.depois.n; D.x+=o.depois.x; });
    out.antes={n:A.n, x:A.x, taxa:A.n?A.x/A.n*100:null}; out.depois={n:D.n, x:D.x, taxa:D.n?D.x/D.n*100:null}; return aprGLeitura(out); }
  // medição de janela fechada (usada no antes × depois): só a pré-marcação, sem ajustes manuais
  function aprMedirJanela(p,k,a,b){ var X=(aprEscopoIdx(p).porK[k]||[]).filter(function(x){ return x.d>=a&&x.d<=b; }), docs={}; X.forEach(function(x){ docs[x.c]=1; });
    var nRel=(aprIncPorK()[k]||[]).filter(function(r){ return r.d>=a && docs[String(r.c)] && aprPreMarca(p,k,r); }).length; return {n:Object.keys(docs).length, nRel:nRel}; }
  function aprGCardHTML(g){ var R=aprGAval(g), ab=state.aprAberto===g.id, pops=aprGPops(g);
    var h='<div class="panel apr-c"><div class="apr-h"><div class="apr-hd"><b>'+esc(pops.join(', '))+'</b> · treinamento em grupo em '+fmtData(g.treino)+(g.instrutor?' por '+esc(g.instrutor):'')+'<div class="hint" style="margin:2px 0 0">'+((g.ks||[]).length?g.ks.length+' participantes':'toda a equipe do escopo')+(aprEvPend(g)?' · <span class="pill warn">evidência pendente</span>':' · '+esc(aprEvTxt(g)))+(g.obs?' · '+esc(g.obs):'')+'</div></div><span class="spacer"></span>'+
      (R.mede?'<span class="pill '+(R.dif!=null&&R.dif<0&&R.z!=null&&R.z<=-1.96?'good':'mute')+'">'+aprPct(R.antes.taxa)+' → '+aprPct(R.depois.taxa)+'</span>':'<span class="pill mute">sem medição automática</span>')+
      '<button class="btn sm" type="button" data-aprabrir="'+esc(g.id)+'">'+(ab?'Fechar':'Ver')+'</button>'+(podeEscrever?'<button class="btn sm" type="button" data-aprexcluir="'+esc(g.id)+'" title="Excluir treinamento lançado errado">Excluir</button>':'')+'</div>';
    if (ab){ if (R.mede){ h+='<div class="kpis" style="margin:10px 0">'+kpi('Antes',aprPct(R.antes.taxa),R.antes.x+' em '+R.antes.n+' atos · desde '+fmtData(R.de))+kpi('Depois',aprPct(R.depois.taxa),R.depois.x+' em '+R.depois.n+' atos · até '+fmtData(R.ate)+(R.acabou?'':' (em andamento)'))+kpi('Leitura',R.dif==null?'—':(R.dif<=0?'−':'+')+numBR(Math.abs(R.dif),1)+' p.p.',esc(R.txt))+'</div>';
        if (R.porPop.length>1) h+='<div class="tbl-wrap"><table class="tleft"><thead><tr><th>Documento</th><th class="n">Antes</th><th class="n">Depois</th><th>Leitura</th></tr></thead><tbody>'+R.porPop.map(function(o){ return '<tr><td>'+esc(o.c)+'</td><td class="n">'+(o.mede?aprPct(o.antes.taxa)+' <span class="mut">('+o.antes.x+'/'+o.antes.n+')</span>':'—')+'</td><td class="n">'+(o.mede?aprPct(o.depois.taxa)+' <span class="mut">('+o.depois.x+'/'+o.depois.n+')</span>':'—')+'</td><td>'+esc(o.mede?o.txt:'sem medição automática')+'</td></tr>'; }).join('')+'</tbody></table></div>'; }
      h+='<div class="apr-res apr-ev">'+(podeEscrever?aprEvHTML('aprE_'+g.id,g.ev,g.evRef)+'<button class="btn sm" type="button" data-aprev="'+esc(g.id)+'">Atualizar evidência</button>':'<span class="hint">Evidência: '+esc(aprEvTxt(g))+'</span>')+'</div>';
      h+='<div class="ctl apr-bt"><button class="btn sm" type="button" data-aprprint="'+esc(g.id)+'">Imprimir registro de treinamento</button><button class="btn sm" type="button" data-aprgrel="'+esc(g.id)+'">Baixar relatório de eficácia</button></div>'; }
    return h+'</div>'; }

  // ——— quem precisa ser treinado (POP com versão nova) ———
  function aprRevLista(){ var hoje=aprHoje(), out=[], P=aprNomes();
    popsTodos().forEach(function(p){ if (!p.verDesde||!popMede(p)) return; if (aprAddMes(p.verDesde,12)<hoje) return; if (p.revDisp&&p.revDisp===(p.v||'')) return;
      var corte=aprAddMes(p.verDesde,-12), I=aprEscopoIdx(p), tem={};
      aprLista().forEach(function(a){ if (a.pop===p.c&&(a.popVer===p.v||(a.treino&&a.treino>=p.verDesde))) tem[a.k]=1; });
      var cont={}; Object.keys(I.porK).forEach(function(k){ if (tem[k]) return; var d={}; I.porK[k].forEach(function(x){ if (x.d>=corte) d[x.c]=1; }); var n=Object.keys(d).length; if (n) cont[k]=n; });
      var ks=Object.keys(cont).sort(function(a,b){ return cont[b]-cont[a]; });
      if (ks.length) out.push({p:p, ks:ks, n:cont}); });
    return out; }
  // 0.21.3: o que já foi preenchido na caixa (marcações, incluídos, data, quem treinou, evidência) sobrevive ao redesenho
  function aprRevLer(){ var R=state.aprRev=state.aprRev||{};
    var porId={}; document.querySelectorAll('#tabApr [data-aprrevk]').forEach(function(x){ var q=x.dataset.aprrevk.split('|'); (porId[q[0]]=porId[q[0]]||[]); if (x.checked) porId[q[0]].push(q[1]); });
    Object.keys(porId).forEach(function(id){ var o=R[id]=R[id]||{}; o.sel=porId[id];
      var tr=$('aprRevTr_'+id); if (tr) o.tr=tr.value; var chR=$('aprRevCh_'+id); if (chR) o.ch=chR.value===''?null:+chR.value; if ($('aprRevIns_'+id)) o.ins=aprLerSel('aprRevIns_'+id); if ($('aprRv_'+id+'Ev')){ var e=aprLerEv('aprRv_'+id); o.ev=e.ev; o.evRef=e.evRef; } }); }
  function aprRevHTML(){ var L=aprRevLista(); if (!L.length) return ''; var P=aprNomes(); state.aprRev=state.aprRev||{};
    return '<div class="panel apr-rev"><div class="sub-h">Quem precisa ser treinado · POP com versão nova</div>'+L.map(function(r){ var id=r.p.c, o=state.aprRev[id]||{}, extra=(o.extra||[]).filter(function(k){ return r.ks.indexOf(k)<0; }),
        muitos=r.ks.filter(function(k){ return (r.n[k]||0)>=3; }), sel=o.sel||[], todos=r.ks.concat(extra);
      var banner=(!o.conf&&muitos.length)?'<div class="apr-rv-banner" style="margin:4px 0"><span class="hint">'+muitos.length+' pessoa(s) fizeram 3 ou mais atos nesse escopo. Marcar essas automaticamente?</span><div class="ctl" style="margin-top:4px"><button type="button" class="btn sm primary" data-aprrevconf="'+esc(id)+'|sim">Sim, marcar essas</button><button type="button" class="btn sm" data-aprrevconf="'+esc(id)+'|nao">Não, vou marcar manualmente</button></div></div>':'';
      return '<div class="apr-rv"><div class="apr-rv-hd"><span><b>'+esc(id)+'</b> v'+esc(r.p.v||'')+' desde '+fmtData(r.p.verDesde)+' · '+r.ks.length+' pessoa(s) executaram o escopo nos 12 meses anteriores</span><span class="spacer"></span>'+(podeEscrever?'<button class="btn sm" type="button" data-aprrevdisp="'+esc(id)+'" title="Tira este aviso da tela (ex.: POP que não precisa de treinamento ou é só para você). Volta só se o documento ganhar outra versão." aria-label="Excluir aviso de '+esc(id)+'">Excluir</button>':'')+'</div>'+banner+
        '<div class="apr-chk" style="margin:6px 0">'+todos.map(function(k){ var ex=extra.indexOf(k)>=0, n=r.n[k]||0; return '<label><input type="checkbox" data-aprrevk="'+esc(id)+'|'+esc(k)+'"'+(sel.indexOf(k)>=0?' checked':'')+'> '+esc(P[k]||k)+' <span class="mut">'+(ex?'incluída':n+' atos')+'</span></label>'; }).join('')+'</div>'+
        (podeEscrever?'<div class="ctl" style="margin-bottom:6px"><label class="apr-inl">Incluir pessoa <select id="aprRevAdd_'+esc(id)+'">'+aprPessoasOpc('')+'</select></label><button class="btn sm" type="button" data-aprrevadd="'+esc(id)+'">Incluir</button></div>'+
          '<div class="ctl"><label class="apr-inl">Data do treinamento <input type="date" id="aprRevTr_'+esc(id)+'" value="'+esc(o.tr||aprHoje())+'"></label><label class="apr-inl">Treinado por '+aprSelPessoa('aprRevIns_'+id,o.ins||'',true)+'</label><label class="apr-inl">Carga horária (h) <input type="number" class="mini" style="width:70px" min="0" step="0.5" id="aprRevCh_'+esc(id)+'" value="'+(o.ch!==undefined?(o.ch==null?'':esc(o.ch)):(popCh(r.p)!=null?popCh(r.p):''))+'" placeholder="—"></label><span class="apr-inl apr-evinl">'+aprEvHTML('aprRv_'+id,o.ev||'pend',o.evRef||'')+'</span><button class="btn sm primary" type="button" data-aprrevabrir="'+esc(id)+'">Abrir aprendizagem dos marcados</button></div>':'')+'</div>'; }).join('')+'</div>'; }

  // ——— carga inicial: Apto por experiência ———
  function aprExpCalc(){ var cf=aprCfg(), ini=aprMesesAtras(cf.exp)+'-01', fimM=mesHoje(), fim=new Date(Date.parse(fimM+'-01')-864e5).toISOString().slice(0,10), P=aprNomes(), out=[];
    var tem={}; aprLista().forEach(function(a){ tem[a.pop+'|'+a.k]=1; });
    popsTodos().filter(popMede).forEach(function(p){ var mn=popMinimo(p).v, I=aprEscopoIdx(p);
      Object.keys(I.porK).forEach(function(k){ if (tem[p.c+'|'+k]) return; var M=aprMedir(p,k,ini,fim,{}); if (M.n<mn) return;
        out.push({p:p.c, k:k, nome:P[k], n:M.n, x:M.nRel, taxa:M.taxa, ok:M.taxa<=cf.lim, min:mn}); }); });
    out.sort(function(a,b){ return String(a.nome).localeCompare(String(b.nome),'pt-BR')||(a.p<b.p?-1:1); });
    return {ini:ini, fim:fim, L:out}; }
  function aprExpHTML(){ var cf=aprCfg(), E=state.aprExp;
    var h='<details class="apr-det" data-aprdet="exp"'+(state.aprExpAberto?' open':'')+'><summary>Carga inicial · Apto por experiência</summary><p class="hint">Para registrar quem já domina um POP sem treinar de novo (ISO 9001 7.2 b: competência por experiência). Entra quem fez, nos últimos <b>'+cf.exp+' meses fechados</b>, pelo menos o mínimo de atos do POP no escopo. Até '+numBR(cf.lim,1)+'% vem marcado; acima do limite fica desmarcado para conversar com o superior antes. Quem já tem registro naquele POP não aparece.</p>';
    if (!E) return h+'<div class="ctl"><button class="btn sm" type="button" data-aprexpcalc="1">Calcular candidatos</button></div></details>';
    if (!E.L.length) return h+'<p class="hint">Nenhum candidato no período '+fmtData(E.ini)+' a '+fmtData(E.fim)+'.</p></details>';
    var porP={}; E.L.forEach(function(x){ porP[x.p]=(porP[x.p]||0)+1; });
    h+='<p class="hint">Período: '+fmtData(E.ini)+' a '+fmtData(E.fim)+' · '+E.L.length+' combinações pessoa × documento ('+E.L.filter(function(x){ return x.ok; }).length+' dentro do limite).</p><div class="tbl-wrap"><table class="tleft"><thead><tr><th><input type="checkbox" data-aprexptodos="1" aria-label="Marcar todos"></th><th>Pessoa</th><th>Documento</th><th class="n">Atos</th><th class="n">Inconf.</th><th class="n">Taxa</th></tr></thead><tbody>'+
      E.L.map(function(x,i){ return '<tr><td><input type="checkbox" data-aprexp="'+i+'"'+(x.ok?' checked':'')+'></td><td>'+esc(x.nome)+'</td><td>'+esc(x.p)+'</td><td class="n">'+x.n+'</td><td class="n">'+x.x+'</td><td class="n">'+(x.ok?'':'<span class="pill warn">')+aprPct(x.taxa)+(x.ok?'':'</span>')+'</td></tr>'; }).join('')+'</tbody></table></div>'+
      '<div class="ctl" style="margin-top:8px"><label class="apr-inl">Avaliado por '+aprSelPessoa('aprExpAv',aprEu(),false)+'</label><button class="btn primary sm" type="button" data-aprexpok="1">Registrar marcados como Apto por experiência</button><button class="btn sm" type="button" data-aprexpcalc="1">Recalcular</button></div></details>';
    return h; }

  // ——— cliques e mudanças ———
  function aprClique(t){ var d=t.dataset||{};
    if (d.aprfasechip){ var qf=d.aprfasechip.split('|'), attrF=qf[0], faseF=qf[1], codsF=popsTodos().filter(function(p){ return p.fase===faseF; }).map(function(p){ return p.c; });
      if (attrF==='aprpopc'){ var ff=Object.assign({},state.aprForm); ff.pops=(ff.pops||[]).slice(); codsF.forEach(function(c){ if (ff.pops.indexOf(c)<0) ff.pops.push(c); }); state.aprForm=ff; }
      else if (attrF==='aprgpopc'){ var gg=Object.assign({},state.aprGForm); gg.pops=(gg.pops||[]).slice(); codsF.forEach(function(c){ if (gg.pops.indexOf(c)<0) gg.pops.push(c); }); state.aprGForm=gg; }
      renderApr(); return true; }
    if (d.aprnovo){ state.aprForm={motivo:'novo', treino:aprHoje()}; state.aprGForm=null; renderApr(); return true; }
    if (d.aprgnovo){ state.aprGForm={treino:aprHoje()}; state.aprForm=null; renderApr(); return true; }
    if (d.aprcancelar){ state.aprForm=null; state.aprGForm=null; renderApr(); return true; }
    if (d.apreditar){ state.aprForm=JSON.parse(JSON.stringify(state.apr[d.apreditar])); renderApr(); return true; }
    if (d.aprsalvarf){ var f=aprLerForm(); if (!f.k){ toast('Escolha a pessoa'); return true; }
      if (f.id){ var a=Object.assign({},state.apr[f.id],{motivo:f.motivo,treino:f.treino,instrutor:f.instrutor,jan:f.jan,obs:f.obs,ev:f.ev,evRef:f.evRef,ch:f.ch}); aprSalvar(a).then(function(){ toast('Registro atualizado'); }); state.aprForm=null; state.aprAberto=a.id; renderApr(); return true; }
      if (!(f.pops||[]).length){ toast('Marque ao menos um documento'); return true; }
      var novos=0, pulou=[], ult=null, feitos=[]; f.pops.forEach(function(c){ if (aprLista().some(function(x){ return x.k===f.k&&x.pop===c&&x.status!=='concluido'; })){ pulou.push(c); return; }
        ult=aprNovo({k:f.k, nome:aprNomes()[f.k]||f.k, pop:c, motivo:f.motivo, treino:f.treino, instrutor:f.instrutor, jan:f.jan, obs:f.obs, ev:f.ev, evRef:f.evRef, ch:f.ch, pai:f.pai||null}); aprSalvar(ult); novos++; feitos.push(c); });
      toast((novos?novos+' aprendizagem(ns) aberta(s)':'Nada aberto')+(pulou.length?' · já em aprendizagem: '+pulou.join(', '):'')); state.aprForm=null; state.aprAberto=novos===1&&ult?ult.id:null;
      if (novos&&f.motivo!=='experiencia') state.aprEmitir={treino:f.treino, instrutor:f.instrutor, pops:feitos, pessoas:[aprNomes()[f.k]||f.k], cod:f.evRef, ch:f.ch};
      renderApr(); return true; }
    if (d.aprprintf){ var f2=aprLerForm(); if (!(f2.pops||[]).length){ toast('Marque os documentos'); return true; } aprBaixarRegistro({treino:f2.treino, instrutor:f2.instrutor, pops:f2.pops, pessoas:f2.k?[aprNomes()[f2.k]]:[], cod:f2.evRef, ch:f2.ch}); return true; }
    if (d.apremitir){ var em=state.aprEmitir; state.aprEmitir=null; if (d.apremitir==='sim'&&em) aprBaixarRegistro(em); renderApr(); return true; }
    if (d.aprarquivar){ if (!confirm('Arquivar este registro? Ele sai da lista (fica guardado no banco).')) return true; var id0=d.aprarquivar; if (dbPronto&&podeEscrever) db.doc('aprendiz/'+id0).delete(); var c=Object.assign({},state.apr); delete c[id0]; state.apr=c; state.aprForm=null; renderApr(); return true; }
    if (d.aprexcluir){ var ex=state.apr[d.aprexcluir]; if (!ex) return true; var filhos=aprLista().filter(function(x){ return x.pai===ex.id||x.grupo===ex.id; }).length;
      if (!confirm('Excluir '+(ex.tipo==='grupo'?'o treinamento em grupo de '+ex.pop:'a aprendizagem de '+ex.nome+' em '+ex.pop)+'?'+(filhos?' Os '+filhos+' registro(s) ligados a ele continuam.':'')+' Ele sai da lista e fica guardado no banco (arquivado).')) return true;
      if (dbPronto&&podeEscrever) db.doc('aprendiz/'+ex.id).delete(); var c3=Object.assign({},state.apr); delete c3[ex.id]; state.apr=c3; if (state.aprAberto===ex.id) state.aprAberto=null; delete state.aprDraft[ex.id]; toast('Registro excluído'); renderApr(); return true; }
    if (d.aprgarq){ if (!confirm('Arquivar este treinamento em grupo?')) return true; if (dbPronto&&podeEscrever) db.doc('aprendiz/'+d.aprgarq).delete(); var c2=Object.assign({},state.apr); delete c2[d.aprgarq]; state.apr=c2; renderApr(); return true; }
    if (d.aprabrir){ state.aprAberto=state.aprAberto===d.aprabrir?null:d.aprabrir; renderApr(); return true; }
    if (d.aprconcluir){ var a1=JSON.parse(JSON.stringify(state.apr[d.aprconcluir])); aprLerRascunhos(); var dr=state.aprDraft[a1.id]||{}, R=aprAval(a1);
      if (!dr.res){ toast('Escolha Apto ou Não apto'); return true; } if (!String(dr.av||'').trim()){ toast('Escolha quem avaliou'); return true; }
      var contra=R.mede&&R.sug!=='pequena'&&dr.res!==R.sug, precisa=!R.mede||R.sug==='pequena'||contra;
      if (precisa&&!String(dr.jus||'').trim()){ toast(contra?'Contra a sugestão do painel: escreva a justificativa':'Escreva a justificativa'); return true; }
      if (R.mede&&R.inc.some(function(x){ return x.pre&&!x.rel&&!x.mot; })){ toast('Escreva o motivo de cada inconformidade desmarcada'); return true; }
      a1.status='concluido'; a1.res=dr.res; a1.avaliador=String(dr.av).trim(); a1.avalEm=new Date().toISOString(); a1.feedbackEm=dr.fb||''; a1.justif=String(dr.jus||'').trim(); a1.avalPor=nomeUsuario();
      a1.snap=Object.assign({},R,{inc:R.inc.map(function(x){ return {id:x.id,d:x.d,c:x.c,t:x.t,cat:x.cat,pre:x.pre,no:x.no,rel:x.rel,mot:x.mot}; }), outras:[]});
      delete state.aprDraft[a1.id]; aprSalvar(a1).then(function(){ toast('Avaliação concluída'); }); renderApr(); return true; }
    if (d.aprfb){ var a2=JSON.parse(JSON.stringify(state.apr[d.aprfb])), v=($('aprFb_'+d.aprfb)||{}).value; if (!v){ toast('Informe a data'); return true; } a2.feedbackEm=v; aprSalvar(a2).then(function(){ toast('Feedback registrado'); }); renderApr(); return true; }
    if (d.aprreabrir){ if (!confirm('Reabrir esta avaliação? O resultado salvo é descartado e os números voltam a ser calculados ao vivo.')) return true; var a3=JSON.parse(JSON.stringify(state.apr[d.aprreabrir])); a3.status='aberto'; delete a3.snap; delete a3.res; aprSalvar(a3); renderApr(); return true; }
    if (d.aprreforco){ var o=state.apr[d.aprreforco]; state.aprForm={k:o.k, pops:[o.pop], motivo:'reforco', treino:aprHoje(), pai:o.id, jan:o.jan}; state.aprGForm=null; renderApr(); var ff=$('aprTr'); if (ff&&ff.scrollIntoView) ff.scrollIntoView({block:'center'}); return true; }
    if (d.aprev){ var r0=JSON.parse(JSON.stringify(state.apr[d.aprev])), e=aprLerEv('aprE_'+r0.id); r0.ev=e.ev; r0.evRef=e.evRef; aprSalvar(r0); var np=0;
      if (r0.tipo==='grupo') aprLista().forEach(function(x){ if (x.grupo===r0.id){ var y=JSON.parse(JSON.stringify(x)); y.ev=e.ev; y.evRef=e.evRef; aprSalvar(y); np++; } });
      toast('Evidência atualizada'+(np?' (também em '+np+' registro(s) individual(is) do grupo)':'')); renderApr(); return true; }
    if (d.aprprint){ aprBaixarRegistro(aprSessao(state.apr[d.aprprint])); return true; }
    if (d.aprbranco){ aprBaixarRegistro({branco:true}); return true; }
    if (d.aprhist){ var kh=($('aprHistK')||{}).value; if (!kh){ toast('Escolha a pessoa'); return true; } aprBaixarHist(kh); return true; }
    if (d.aprrel1){ aprBaixarInd(state.apr[d.aprrel1]); return true; }
    if (d.aprgrel){ aprBaixarGrupo(state.apr[d.aprgrel]); return true; }
    if (d.aprcons){ aprBaixarCons(); return true; }
    if (d.aprcompet){ aprBaixarCompet(); return true; }
    if (d.aprgconf){ var gc=aprLerGForm(); gc.confirmado=true; if (d.aprgconf==='sim') gc.ks=aprGPessoas(gc).slice(); state.aprGForm=gc; renderApr(); return true; }
    if (d.aprgadd){ var gf=aprLerGForm(), ka=($('aprGAdd')||{}).value; if (!ka){ toast('Escolha a pessoa'); return true; } gf.extra=(gf.extra||[]).filter(function(x){ return x!==ka; }).concat([ka]); gf.ks=(gf.ks||[]).filter(function(x){ return x!==ka; }).concat([ka]); state.aprGForm=gf; renderApr(); return true; }
    if (d.aprprintg){ var g0=aprLerGForm(); if (!(g0.pops||[]).length){ toast('Marque os documentos'); return true; } aprBaixarRegistro({treino:g0.treino, instrutor:g0.instrutor, pops:g0.pops, pessoas:(g0.ks||[]).map(function(k){ return aprNomes()[k]||k; }), cod:g0.evRef, ch:g0.ch}); return true; }
    if (d.aprgsalvar){ var g=aprLerGForm(); if (!(g.pops||[]).length){ toast('Marque ao menos um documento'); return true; } if (!(g.ks||[]).length){ toast('Marque ao menos um participante'); return true; }
      var reg={v:2, tipo:'grupo', id:aprId(), pops:g.pops, pop:g.pops[0], popVers:g.pops.map(function(c){ return (popDe(c)||{}).v||''; }), treino:g.treino, instrutor:g.instrutor, meses:g.meses, ks:g.ks, extra:g.extra||[], ev:g.ev, evRef:g.evRef, obs:g.obs, ch:g.ch, criadoEm:new Date().toISOString(), por:nomeUsuario()};
      aprSalvar(reg); var nInd=0;
      if (g.ind){ g.pops.forEach(function(c){ var gp=popDe(c)||{}; g.ks.forEach(function(k){ if (aprLista().some(function(a){ return a.k===k&&a.pop===c&&a.status==='aberto'; })) return; aprSalvar(aprNovo({k:k, nome:aprNomes()[k]||k, pop:c, motivo:gp.verDesde&&g.treino>=gp.verDesde?'pop-rev':'novo', treino:g.treino, instrutor:g.instrutor, jan:g.meses, ev:g.ev, evRef:g.evRef, ch:g.ch, obs:'Treinamento em grupo'+(g.obs?' · '+g.obs:''), grupo:reg.id})); nInd++; }); }); }
      toast('Treinamento em grupo salvo'+(nInd?' · '+nInd+' aprendizagem(ns) individual(is)':'')); state.aprGForm=null; state.aprAberto=reg.id;
      state.aprEmitir={treino:g.treino, instrutor:g.instrutor, pops:g.pops, pessoas:g.ks.map(function(k){ return aprNomes()[k]||k; }), cod:g.evRef, ch:g.ch}; renderApr(); return true; }
    if (d.aprrevconf){ var qc=d.aprrevconf.split('|'); aprRevLer(); var oc=state.aprRev[qc[0]]=state.aprRev[qc[0]]||{}; oc.conf=qc[1];
      if (qc[1]==='sim'){ var rr=aprRevLista().filter(function(x){ return x.p.c===qc[0]; })[0]; if (rr){ oc.sel=(oc.sel||[]).slice(); rr.ks.forEach(function(k){ if ((rr.n[k]||0)>=3&&oc.sel.indexOf(k)<0) oc.sel.push(k); }); } }
      state.aprRevFresco=true; renderApr(); return true; }
    if (d.aprrevadd){ var ia=d.aprrevadd, ka2=($('aprRevAdd_'+ia)||{}).value; if (!ka2){ toast('Escolha a pessoa'); return true; } aprRevLer(); var oa=state.aprRev[ia]=state.aprRev[ia]||{};
      oa.extra=(oa.extra||[]).filter(function(x){ return x!==ka2; }).concat([ka2]); oa.sel=(oa.sel||[]).filter(function(x){ return x!==ka2; }).concat([ka2]); state.aprRevFresco=true; renderApr(); return true; }
    if (d.aprrevdisp){ var pcd=d.aprrevdisp, ppd=popDe(pcd); if (!ppd) return true;
      state.popsCfg.map[pcd]=Object.assign({},state.popsCfg.map[pcd],{revDisp:ppd.v||''}); popSalvarCfg(); aprRevLer(); if (state.aprRev) delete state.aprRev[pcd]; state.aprRevFresco=true; toast('Aviso de '+pcd+' excluído · só volta se o documento ganhar outra versão'); renderApr(); return true; }
    if (d.aprrevabrir){ var pc=d.aprrevabrir, pp=popDe(pc), tr=($('aprRevTr_'+pc)||{}).value||aprHoje(), ins=aprLerSel('aprRevIns_'+pc), evr=aprLerEv('aprRv_'+pc), chE=$('aprRevCh_'+pc), chv=chE&&chE.value!==''?+chE.value:null, n=0, nomesR=[];
      document.querySelectorAll('#tabApr [data-aprrevk]').forEach(function(x){ var q=x.dataset.aprrevk.split('|'); if (q[0]!==pc||!x.checked) return; aprSalvar(aprNovo({k:q[1], nome:aprNomes()[q[1]]||q[1], pop:pc, motivo:'pop-rev', treino:tr, instrutor:ins, ev:evr.ev, evRef:evr.evRef, ch:chv, obs:'POP revisado para a v'+(pp.v||'')})); n++; nomesR.push(aprNomes()[q[1]]||q[1]); });
      toast(n?n+' aprendizagem(ns) aberta(s)':'Nenhuma pessoa marcada'); if (n){ aprRevLer(); if (state.aprRev) delete state.aprRev[pc]; state.aprRevFresco=true; state.aprEmitir={treino:tr, instrutor:ins, pops:[pc], pessoas:nomesR, cod:evr.evRef, ch:chv}; } renderApr(); return true; }
    if (d.aprexpcalc){ state.aprExp=aprExpCalc(); state.aprExpAberto=true; renderApr(); return true; }
    if (d.aprexpok){ var E=state.aprExp; if (!E) return true; var av=aprLerSel('aprExpAv'); if (!av){ toast('Informe quem avaliou'); return true; } var cf=aprCfg(), n2=0;
      document.querySelectorAll('#tabApr [data-aprexp]').forEach(function(x){ if (!x.checked) return; var c3=E.L[+x.dataset.aprexp]; if (!c3) return; var pp2=popDe(c3.p)||{c:c3.p};
        var M=aprMedir(pp2,c3.k,E.ini,E.fim,{}), snap={mede:true, de:E.ini, ate:E.fim, fimJ:E.fim, acabou:true, lim:cf.lim, min:c3.min, n:M.n, inc:M.inc.map(function(y){ return {id:y.id,d:y.d,c:y.c,t:y.t,cat:y.cat,pre:y.pre,no:y.no,rel:y.rel,mot:''}; }), outras:[], nRel:M.nRel, taxa:M.taxa, sug:M.n<c3.min?'pequena':(M.taxa<=cf.lim?'apto':'nao')};
        aprSalvar(aprNovo({k:c3.k, nome:c3.nome, pop:c3.p, motivo:'experiencia', treino:null, ini:E.ini, fim:E.fim, status:'concluido', res:'apto', avaliador:av, avalEm:new Date().toISOString(), avalPor:nomeUsuario(), feedbackEm:'', justif:'Competência por experiência (ISO 9001 7.2 b): '+M.n+' atos no escopo de '+fmtData(E.ini)+' a '+fmtData(E.fim)+', taxa '+aprPct(M.taxa)+(M.taxa<=cf.lim?' ≤ ':' > ')+numBR(cf.lim,1)+'%.', snap:snap})); n2++; });
      state.aprExp=null; toast(n2?n2+' registro(s) de Apto por experiência':'Nenhum marcado'); renderApr(); return true; }
    if (d.aprexptodos){ document.querySelectorAll('#tabApr [data-aprexp]').forEach(function(x){ x.checked=t.checked; }); return true; }
    if (t.tagName==='SUMMARY'&&t.parentNode&&t.parentNode.dataset&&t.parentNode.dataset.aprdet){ var k2=t.parentNode.dataset.aprdet; setTimeout(function(){ if (k2==='fim') state.aprVerFim=t.parentNode.open; if (k2==='exp') state.aprExpAberto=t.parentNode.open; },0); return false; }
    return false; }
  function aprMudou(t){ var d=t.dataset||{};
    if (d.aprsel!=null){ var o=$(d.aprsel+'_o'); if (o){ o.hidden=t.value!=='__outro'; if (!o.hidden) o.focus(); } if (d.aprdr!=null) aprLerRascunhos(); return true; }
    if (d.aprmotsel!=null){ var tx=t.parentNode.querySelector('[data-aprmot]'), c=JSON.parse(JSON.stringify(state.apr[state.aprAberto])); c.aj=c.aj||{};
      if (t.value==='__outro'){ if (tx){ tx.hidden=false; tx.focus(); } c.aj[d.aprmotsel]={rel:false, mot:String(tx&&tx.value||'').trim()}; }
      else { if (tx){ tx.hidden=true; tx.value=''; } c.aj[d.aprmotsel]={rel:false, mot:t.value}; }
      aprSalvar(c); return true; }
    if (d.aprrel!=null){ var a=JSON.parse(JSON.stringify(state.apr[state.aprAberto])), id=d.aprrel, pre=d.aprpre==='1'; aprLerRascunhos(); a.aj=a.aj||{};
      if (t.checked===pre) delete a.aj[id]; else a.aj[id]={rel:t.checked, mot:(a.aj[id]&&a.aj[id].mot)||''};
      aprSalvar(a); renderApr(); return true; }
    if (d.aprmot!=null){ var b=JSON.parse(JSON.stringify(state.apr[state.aprAberto])); b.aj=b.aj||{}; b.aj[d.aprmot]={rel:false, mot:String(t.value||'').trim()}; aprSalvar(b); return true; }
    if (d.aprdr!=null){ aprLerRascunhos(); return true; }
    if (t.id==='aprK'){ state.aprForm=aprLerForm(); renderApr(); return true; }
    if (t.id==='aprCh'&&state.aprForm){ state.aprForm.chMan=true; state.aprForm.ch=t.value===''?null:+t.value; return true; }
    if (t.id==='aprGCh'&&state.aprGForm){ state.aprGForm.chMan=true; state.aprGForm.ch=t.value===''?null:+t.value; return true; }
    if (d.aprgpopc!=null){ state.aprGForm=aprLerGForm(); renderApr(); return true; }
    if (d.aprpopc!=null){ var cn=document.querySelector('[data-aprpopsn="aprpopc"]'), mk=aprPopsMarcados('aprpopc'); if (cn) cn.textContent=mk.length+' marcado(s)'; if (state.aprForm) state.aprForm.pops=mk; aprChAtualizar('aprCh',state.aprForm,mk); return true; }
    return false; }

  // ——— relatórios (HTML para imprimir ou salvar em PDF, como o relatório por pessoa) ———
  function aprDoc(titulo, corpo){ return '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+esc(titulo)+'</title><style>body{margin:0;background:#fff}'+REL_CSS+
    '.apr-ass{margin-top:28px;display:flex;gap:40px}.apr-ass div{flex:1;border-top:1px solid #444;padding-top:4px;font-size:11px}@media print{.noprint{display:none}.relsheet{padding:0}}</style></head><body>'+
    '<div class="noprint" style="font-family:Segoe UI,Arial,sans-serif;background:#fde8da;padding:8px 12px;margin:12px auto;max-width:860px;border-radius:6px;font-size:12px">Para imprimir ou salvar em PDF: Ctrl+P (Cmd+P no Mac).</div><div class="relsheet">'+corpo+
    '<p class="nota" style="margin-top:18px">Gerado pelo Painel SGQ · CRCO (ferramenta auxiliar, versão '+esc(Motor.VERSAO)+') em '+esc(new Date().toLocaleString('pt-BR'))+'. Fontes: Produção por Etapa e Prazo e Tempo Médio do VHL, Relatório de andamentos do Tri7 e Consulta de inconformidades do VHL. O mesmo cálculo pode ser feito sem o painel: ver "Como é calculado".</p></div></body></html>'; }
  function aprSalvarArq(nome, html){ if (!downloads){ toast('Download indisponível nesta visualização'); return; } downloads.save({filename:nome, data:html}).then(function(){ toast('Relatório baixado — abra e use Ctrl+P'); }).catch(function(e){ if (e&&e.code!=='declined') toast('Não consegui gerar o arquivo'); }); }
  function aprArqNome(a){ return 'Eficacia - '+String(a.nome||'').split(' ')[0]+' - '+a.pop+' - '+String(a.treino||a.ini||'').slice(0,10)+'.html'; }
  function aprIndCorpo(a){ var R=aprAval(a), p=popDe(a.pop)||{}, fim=a.status==='concluido', cf=aprCfg();
    var h='<h1>Avaliação de eficácia da capacitação</h1><p class="sub">'+esc(a.nome)+' · '+esc(a.pop)+(a.popVer?' v'+esc(a.popVer):'')+' — '+esc(a.popTit||p.t||'')+'</p>'+
      '<table><tbody><tr><th>Motivo</th><td>'+esc(APR_MOTIVOS[a.motivo]||a.motivo||'')+'</td></tr>'+(a.treino?'<tr><th>Treinamento</th><td>'+fmtData(a.treino)+(a.instrutor?' · por '+esc(a.instrutor):'')+'</td></tr>':'')+
      '<tr><th>Evidência do treinamento</th><td>'+esc(aprEvTxt(a))+'</td></tr><tr><th>Objetivo</th><td>Executar o documento no escopo sem inconformidade relacionada a ele (PCAP · Capacitação em POP)</td></tr>'+
      '<tr><th>Critério</th><td>'+(R.mede?'Taxa de inconformidade relacionada ≤ '+numBR(R.lim,1)+'% dos atos no escopo; mínimo de '+R.min+' atos para a amostra; janela de referência de '+(+(a.jan||cf.jan))+' meses':'Sem medição automática: avaliação de quem acompanhou')+'</td></tr>'+
      (R.mede?'<tr><th>Escopo</th><td>Etapas '+esc((p.ets||[]).join(', '))+' · naturezas '+esc((p.nats||[]).join(', '))+'</td></tr><tr><th>Período avaliado</th><td>'+fmtData(R.de)+' a '+fmtData(R.ate)+'</td></tr>'+
        '<tr><th>Resultado medido</th><td><b>'+R.n+'</b> atos · <b>'+R.nRel+'</b> inconformidade(s) relacionada(s) · taxa <b>'+aprPct(R.taxa)+'</b> · sugestão: '+esc(aprSugTxt(R))+'</td></tr>':'')+
      '<tr><th>Decisão</th><td>'+(fim?'<b>'+esc((APR_RES[a.res]||['','—'])[1])+'</b> · avaliado por '+esc(a.avaliador||'—')+' em '+fmtData(String(a.avalEm||'').slice(0,10))+(a.justif?' · '+esc(a.justif):''):'<b>em aprendizagem</b> (relatório parcial)')+'</td></tr>'+
      '<tr><th>Feedback ao colaborador</th><td>'+(a.feedbackEm?fmtData(a.feedbackEm):'pendente')+'</td></tr></tbody></table>';
    if (R.mede) h+='<h2>Inconformidades consideradas</h2>'+(R.inc.length?'<table><thead><tr><th>Data</th><th>Documento</th><th>Tipo do erro</th><th>Conta?</th></tr></thead><tbody>'+R.inc.map(function(x){ return '<tr><td>'+fmtData(x.d)+'</td><td>'+esc(x.c)+'</td><td>'+esc(x.cat)+'</td><td>'+(x.rel?'sim':'não — '+esc(x.mot||(x.no?'outra fase':'')))+'</td></tr>'; }).join('')+'</tbody></table>':'<p>Nenhuma inconformidade nos documentos avaliados.</p>')+
      '<p class="nota">Observações das inconformidades omitidas (LGPD); o detalhe está na Consulta de inconformidades do VHL.</p>';
    return h+'<div class="apr-ass"><div>Superior imediato</div><div>Colaborador (ciência do feedback)</div></div>'; }
  function aprBaixarInd(a){ if (!a) return; aprSalvarArq(aprArqNome(a), aprDoc('Eficácia · '+a.nome+' · '+a.pop, aprIndCorpo(a))); }
  function aprBaixarGrupo(g){ if (!g) return; var R=aprGAval(g), P=aprNomes(), pops=aprGPops(g);
    var h='<h1>Eficácia de treinamento em grupo</h1><p class="sub">'+esc(pops.map(function(c){ var p=popDe(c)||{}; return c+(p.v?' v'+p.v:''); }).join(' · '))+'</p><table><tbody><tr><th>Treinamento</th><td>'+fmtData(g.treino)+(g.instrutor?' · por '+esc(g.instrutor):'')+(g.obs?' · '+esc(g.obs):'')+'</td></tr>'+
      '<tr><th>Evidência do treinamento</th><td>'+esc(aprEvTxt(g))+'</td></tr><tr><th>Participantes</th><td>'+((g.ks||[]).length?g.ks.map(function(k){ return esc(P[k]||k); }).join(', '):'toda a equipe que executa o escopo')+'</td></tr>';
    if (R.mede) h+='<tr><th>Antes (total)</th><td>desde '+fmtData(R.de)+': '+R.antes.x+' inconformidade(s) em '+R.antes.n+' atos = <b>'+aprPct(R.antes.taxa)+'</b></td></tr><tr><th>Depois (total)</th><td>até '+fmtData(R.ate)+(R.acabou?'':' (em andamento)')+': '+R.depois.x+' em '+R.depois.n+' atos = <b>'+aprPct(R.depois.taxa)+'</b></td></tr><tr><th>Leitura</th><td>'+esc(R.txt)+'</td></tr>';
    else h+='<tr><th>Medição</th><td>Documentos sem medição automática</td></tr>';
    h+='</tbody></table>';
    if (R.porPop.length>1) h+='<h2>Por documento</h2><table><thead><tr><th>Documento</th><th class="n">Antes</th><th class="n">Depois</th><th>Leitura</th></tr></thead><tbody>'+R.porPop.map(function(o){ return '<tr><td>'+esc(o.c)+'</td><td class="n">'+(o.mede?aprPct(o.antes.taxa)+' ('+o.antes.x+'/'+o.antes.n+')':'—')+'</td><td class="n">'+(o.mede?aprPct(o.depois.taxa)+' ('+o.depois.x+'/'+o.depois.n+')':'—')+'</td><td>'+esc(o.mede?o.txt:'sem medição')+'</td></tr>'; }).join('')+'</tbody></table>';
    h+='<p class="nota">Taxa = inconformidades internas relacionadas ao documento ÷ atos (documentos distintos) no escopo. "Diferença real" = teste de duas proporções com 95% de confiança; com menos de 20 atos de um dos lados, a leitura é só indicativa. Mostra o grupo, não ordena pessoas.</p>';
    aprSalvarArq('Eficacia grupo - '+pops.join(' ')+' - '+g.treino+'.html', aprDoc('Eficácia · grupo', h)); }
  // uma "sessão" de treinamento: o grupo, ou os registros individuais com a mesma data e quem treinou
  function aprSessao(a){ if (!a) return {branco:true}; var P=aprNomes(), g=a.tipo==='grupo'?a:(a.grupo&&state.apr[a.grupo]);
    if (g&&g.tipo==='grupo') return {treino:g.treino, instrutor:g.instrutor, pops:aprGPops(g), pessoas:(g.ks||[]).map(function(k){ return P[k]||k; }), cod:g.evRef, ch:g.ch!=null?g.ch:popChSoma(aprGPops(g))};
    var L=aprLista().filter(function(x){ return x.motivo!=='experiencia'&&x.treino===a.treino&&String(x.instrutor||'')===String(a.instrutor||''); }), pops=[], pes=[], ch=null;
    L.forEach(function(x){ if (pops.indexOf(x.pop)<0) pops.push(x.pop); if (pes.indexOf(x.nome)<0) pes.push(x.nome); if (x.ch!=null&&(ch==null||+x.ch>ch)) ch=+x.ch; });
    return {treino:a.treino, instrutor:a.instrutor, pops:pops, pessoas:pes, cod:a.evRef, ch:ch!=null?ch:popChSoma(pops)}; }
  // Registro de treinamento para imprimir e colher assinaturas (preenchido ou em branco)
  function aprBaixarRegistro(o){ var cf=aprCfg(), br=!!o.branco, pops=(o.pops||[]).map(function(c){ return popDe(c)||{c:c}; }), pes=(o.pessoas||[]).slice().sort(function(a,b){ return a.localeCompare(b,'pt-BR'); });
    var vazio=function(n,cols){ var h=''; for (var i=0;i<n;i++) h+='<tr>'+cols.map(function(){ return '<td>&nbsp;</td>'; }).join('')+'</tr>'; return h; };
    var h='<div class="rt-cab"><div><b>Cartório de Registros de Cidade Ocidental · CRCO</b><br><span>Sistema de Gestão da Qualidade</span></div><div class="rt-cod">Código: '+(o.cod?esc(o.cod):'______________')+'</div></div><h1>Registro de treinamento</h1>'+
      '<table class="rt-id"><tbody><tr><th>Data</th><td>'+(o.treino?fmtData(o.treino).replace(/\/(\d\d)$/,'/20$1'):'____/____/________')+'</td><th>Carga horária</th><td>'+(!br&&o.ch!=null&&o.ch!==''?esc(popChTxt(+o.ch)):'__________')+'</td></tr>'+
      '<tr><th>Modalidade</th><td colspan="3">☐ Presencial &nbsp;&nbsp; ☐ Teams / remoto &nbsp;&nbsp; ☐ Prático (acompanhamento no posto) &nbsp;&nbsp; ☐ Outro: ____________</td></tr>'+
      '<tr><th>Local</th><td colspan="3">&nbsp;</td></tr><tr><th>Treinado por</th><td colspan="3">'+(o.instrutor?esc(o.instrutor):'&nbsp;')+'</td></tr></tbody></table>'+
      '<h2>Documentos treinados</h2><table><thead><tr><th style="width:24%">Código</th><th>Título</th><th style="width:12%">Versão</th></tr></thead><tbody>'+pops.map(function(p){ return '<tr><td>'+esc(p.c)+'</td><td>'+esc(p.t||'')+'</td><td>'+esc(p.v||'')+'</td></tr>'; }).join('')+vazio(br?4:Math.max(0,2-pops.length),[1,2,3])+'</tbody></table>'+
      '<h2>Conteúdo e objetivo</h2><p class="rt-obj">Objetivo: executar o(s) documento(s) acima sem inconformidade relacionada a ele(s).</p><div class="rt-linhas"><div></div><div></div><div></div></div>'+
      '<h2>Participantes</h2><table class="rt-part"><thead><tr><th style="width:5%">#</th><th style="width:42%">Nome</th><th style="width:20%">Função</th><th>Assinatura</th></tr></thead><tbody>'+
      pes.map(function(n,i){ return '<tr><td>'+(i+1)+'</td><td>'+esc(n)+'</td><td></td><td></td></tr>'; }).join('')+vazio(br?14:Math.max(3,8-pes.length),[1,2,3,4]).replace(/<tr><td>&nbsp;<\/td>/g,'<tr><td></td>')+'</tbody></table>'+
      '<h2>Avaliação da eficácia</h2><p class="rt-obj">A eficácia será avaliada pelo superior com os atos executados no escopo do(s) documento(s) a partir desta data: até '+numBR(cf.lim,1)+'% de inconformidade relacionada = apto (PCAP · Capacitação em POP). O resultado é registrado na Matriz de Competências (COMPET-SGQ-001), com o feedback ao colaborador.</p>'+
      '<div class="apr-ass"><div>Quem treinou</div><div>Gestor da Qualidade (visto)</div></div>';
    var css='.rt-cab{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #c2410c;padding-bottom:6px;margin-bottom:8px;font-size:11px}.rt-cod{font-size:12px;font-weight:600}.rt-id th{width:16%;text-align:left}.rt-part td{height:26px}.rt-obj{font-size:12px;margin:4px 0}.rt-linhas div{border-bottom:1px solid #999;height:22px}';
    var html=aprDoc('Registro de treinamento',h).replace('</style>',css+'</style>').replace(/<p class="nota" style="margin-top:18px">Gerado pelo Painel SGQ[^<]*<\/p>/,'<p class="nota" style="margin-top:14px">Registro gerado pelo Painel SGQ em '+esc(new Date().toLocaleDateString('pt-BR'))+'. Depois de assinado, digitalizar e anexar no SGQ (M5) e na linha da Matriz de Competências.</p>');
    aprSalvarArq('Registro de treinamento - '+(br?'em branco':(o.treino||'')+' - '+(o.pops||[]).join(' '))+'.html', html); }
  // histórico de capacitação de uma pessoa (todos os registros da Aprendizagem)
  function aprHistOpc(){ var o={}; aprLista().forEach(function(a){ o[a.k]=a.nome; }); return '<option value="">Escolha…</option>'+Object.keys(o).sort(function(a,b){ return String(o[a]).localeCompare(String(o[b]),'pt-BR'); }).map(function(k){ return '<option value="'+esc(k)+'">'+esc(o[k])+'</option>'; }).join(''); }
  function aprBaixarHist(k){ var L=aprLista().filter(function(a){ return a.k===k; }).sort(function(a,b){ return String(a.treino||a.ini||'')<String(b.treino||b.ini||'')?1:-1; }); if (!L.length) return; var nome=L[0].nome;
    var h='<h1>Histórico de capacitação em POP</h1><p class="sub">'+esc(nome)+' · '+L.length+' registro(s) · situação em '+esc(new Date().toLocaleDateString('pt-BR'))+'</p><table><thead><tr><th>Documento</th><th>Motivo</th><th>Treinado em</th><th>Evidência do treinamento</th><th>Situação</th><th>Avaliado por</th><th>Feedback</th></tr></thead><tbody>'+
      L.map(function(a){ var fim=a.status==='concluido'; return '<tr><td>'+esc(a.pop)+(a.popVer?' v'+esc(a.popVer):'')+'</td><td>'+esc(APR_MOTIVOS[a.motivo]||'')+'</td><td>'+(a.treino?fmtData(a.treino)+(a.instrutor?' · '+esc(a.instrutor):''):'—')+'</td><td>'+esc(aprEvTxt(a))+'</td><td>'+(fim?esc((APR_RES[a.res]||['','—'])[1]):'em aprendizagem')+'</td><td>'+esc(a.avaliador||'')+(fim?' · '+fmtData(String(a.avalEm||'').slice(0,10)):'')+'</td><td>'+(a.feedbackEm?fmtData(a.feedbackEm):fim?'pendente':'—')+'</td></tr>'; }).join('')+'</tbody></table>'+
      '<p class="nota">Capacitação em POP registrada na Aprendizagem do Painel SGQ. Os treinamentos institucionais (trilha IMQC, ENNOR e outros) ficam no CAP-SGQ-001. A situação oficial é a da Matriz de Competências (COMPET-SGQ-001).</p>';
    aprSalvarArq('Historico de capacitacao - '+String(nome).split(' ')[0]+' - '+aprHoje()+'.html', aprDoc('Histórico · '+nome, h)); }
  function aprBaixarCons(){ var L=aprLista(), G=aprGrupos();
    var h='<h1>Aprendizagem · relatório consolidado</h1><p class="sub">Situação em '+esc(new Date().toLocaleDateString('pt-BR'))+' · '+L.length+' registro(s) individual(is) e '+G.length+' treinamento(s) em grupo</p>';
    var ab=L.filter(function(a){ return a.status!=='concluido'; }), fe=L.filter(function(a){ return a.status==='concluido'; }), fbp=fe.filter(function(a){ return !a.feedbackEm; });
    h+='<table><tbody><tr><th>Em aprendizagem</th><td>'+ab.length+'</td></tr><tr><th>Concluídas</th><td>'+fe.length+' ('+fe.filter(function(a){ return a.res==='apto'; }).length+' Apto · '+fe.filter(function(a){ return a.res==='nao'; }).length+' Não apto)</td></tr><tr><th>Feedback pendente</th><td>'+fbp.length+'</td></tr><tr><th>Evidência do treinamento pendente</th><td>'+aprTodos().filter(aprEvPend).length+'</td></tr></tbody></table>';
    function tab(T){ return '<table><thead><tr><th>Pessoa</th><th>Documento</th><th>Motivo</th><th>Treino</th><th class="n">Atos</th><th class="n">Taxa</th><th>Situação</th><th>Feedback</th></tr></thead><tbody>'+T.map(function(a){ var R=aprAval(a);
      return '<tr><td>'+esc(a.nome)+'</td><td>'+esc(a.pop)+'</td><td>'+esc(APR_MOTIVOS[a.motivo]||'')+'</td><td>'+(a.treino?fmtData(a.treino):'—')+'</td><td class="n">'+(R.mede?R.n+'/'+R.min:'—')+'</td><td class="n">'+(R.mede?aprPct(R.taxa):'—')+'</td><td>'+(a.status==='concluido'?esc((APR_RES[a.res]||['','—'])[1]):'em aprendizagem')+'</td><td>'+(a.feedbackEm?fmtData(a.feedbackEm):a.status==='concluido'?'pendente':'—')+'</td></tr>'; }).join('')+'</tbody></table>'; }
    if (ab.length) h+='<h2>Em aprendizagem</h2>'+tab(ab); if (fe.length) h+='<h2>Concluídas</h2>'+tab(fe);
    if (G.length) h+='<h2>Treinamentos em grupo</h2><table><thead><tr><th>Documento</th><th>Data</th><th class="n">Antes</th><th class="n">Depois</th><th>Leitura</th></tr></thead><tbody>'+G.map(function(g){ var R=aprGAval(g); return '<tr><td>'+esc(aprGPops(g).join(', '))+'</td><td>'+fmtData(g.treino)+'</td><td class="n">'+(R.mede?aprPct(R.antes.taxa):'—')+'</td><td class="n">'+(R.mede?aprPct(R.depois.taxa):'—')+'</td><td>'+esc(R.mede?R.txt:'sem medição')+'</td></tr>'; }).join('')+'</tbody></table>';
    h+='<p class="nota">Uso exclusivo para competência e eficácia da capacitação (ISO 9001 7.2; NBR 15906 7.2.4). Não serve para bonificação, progressão ou comparação entre pessoas.</p>';
    aprSalvarArq('Aprendizagem - consolidado - '+aprHoje()+'.html', aprDoc('Aprendizagem · consolidado', h)); }
  function aprBaixarCompet(){ precisaXLSX().then(function(X){ var rows=[['Colaborador','Função (PCS)','POP / IT','Versão','Motivo','Treinado em','Por quem','Situação','Avaliado por','Data da avaliação','Feedback dado em','Evidência do treinamento','Relatório de eficácia','Ação (se Não apto)']];
      aprLista().sort(function(a,b){ return String(a.nome).localeCompare(String(b.nome),'pt-BR')||(a.pop<b.pop?-1:1); }).forEach(function(a){ var fim=a.status==='concluido', filho=aprLista().filter(function(x){ return x.pai===a.id; })[0];
        rows.push([a.nome,'',a.pop,a.popVer||'',APR_MOTIVOS[a.motivo]||a.motivo||'',a.treino?fmtData(a.treino):'',a.instrutor||'',fim?(APR_RES[a.res]||['',''])[1]:'Em aprendizagem',a.avaliador||'',fim?fmtData(String(a.avalEm||'').slice(0,10)):'',a.feedbackEm?fmtData(a.feedbackEm):'',aprEvTxt(a),fim||a.treino?aprArqNome(a).replace(/\.html$/,'.pdf'):'',a.res==='nao'?(filho?'Reforço aberto em '+fmtData(filho.treino):'Definir reforço'):'']); });
      var ws=X.utils.aoa_to_sheet(rows), wb=X.utils.book_new(); ws['!cols']=[{wch:34},{wch:16},{wch:18},{wch:8},{wch:28},{wch:12},{wch:20},{wch:16},{wch:22},{wch:14},{wch:14},{wch:40},{wch:44},{wch:26}]; X.utils.book_append_sheet(wb,ws,'COMPET'); var out=X.write(wb,{type:'array',bookType:'xlsx'});
      if (!downloads) return toast('Download indisponível nesta visualização');
      downloads.save({filename:'Linhas COMPET-SGQ-001 - '+aprHoje()+'.xlsx', data:new Blob([out],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'})}).then(function(){ toast('Planilha baixada'); }); }).catch(function(e){ toast(e.message); }); }
  // relatório por pessoa: seção "Aprendizagem"
  function aprRelHTML(k){ var ck=chavePessoa(k), L=aprLista().filter(function(a){ return a.k===ck; }); if (!L.length) return '';
    return '<h2>Aprendizagem</h2><table><thead><tr><th>Documento</th><th>Motivo</th><th>Treino</th><th class="n">Atos</th><th class="n">Taxa</th><th>Situação</th></tr></thead><tbody>'+L.map(function(a){ var R=aprAval(a);
      return '<tr><td>'+esc(a.pop)+'</td><td>'+esc(APR_MOTIVOS[a.motivo]||'')+'</td><td>'+(a.treino?fmtData(a.treino):'—')+'</td><td class="n">'+(R.mede?R.n:'—')+'</td><td class="n">'+(R.mede?aprPct(R.taxa):'—')+'</td><td>'+(a.status==='concluido'?esc((APR_RES[a.res]||['','—'])[1]):'em aprendizagem')+'</td></tr>'; }).join('')+'</tbody></table>'; }
