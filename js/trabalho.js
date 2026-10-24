/* Painel SGQ · CRCO — js/trabalho.js (0.24.0: tempo de trabalho cronometrado no VHL · relatório "Desempenho Usuário")
 * Cada planilha = 1 pessoa × 1 mês: Tipo de Documento, Etapa, Natureza, Tempo (média por ato, cronômetro do VHL) e Quantidade.
 * A pessoa e o período vêm do nome do arquivo que o VHL gera ("Desempenho Usuário - Nome - AAAA-MM-DD - AAAA-MM-DD-…").
 * Daqui sai: tempo-padrão de cada ato (mediana da equipe), ocupação (horas com trabalho registrado ÷ horas disponíveis),
 * ritmo (tempo dela ÷ tempo-padrão da equipe nas mesmas etapas e naturezas), carga × capacidade dos setores e o trabalho que entrou.
 * As faixas "normais" saem dos próprios dados (quartis da equipe), nada é fixado à mão. */
(window.PAINEL_ARQ=window.PAINEL_ARQ||{})['js/trabalho.js']='0.24.0';
  var TR_CAB=['Tipo de Documento','Etapa','Natureza','Tempo','Quantidade'];
  var TR_MIN_CEL=10;      // atos cronometrados para uma célula (etapa × natureza) ter tempo-padrão
  var TR_COB_OK=0.8;      // parte dos atos da pessoa em etapas que o cronômetro cobre, para entrar na faixa e na leitura
  var TR_DIAS_OK=10;      // dias ativos no mês para o mês entrar na faixa
  var TR_MARGEM=0.05;     // ocupação: só aponta abaixo da faixa a partir de 5 p.p. abaixo dela
  function trEhArquivo(cab){ return TR_CAB.every(function(c){ return cab.indexOf(c)>=0; }); }
  // nome do arquivo: corrige acentos de zip (UTF-8 lido como latin1, ou #U00e1) e lê pessoa + período
  function trNomeArq(n){ var s=String(n||'').split(/[\\/]/).pop();
    if (/[ÃÂ]/.test(s)){ try{ s=decodeURIComponent(escape(s)); }catch(e){} }
    s=s.replace(/#U([0-9a-fA-F]{4})/g,function(_,h){ return String.fromCharCode(parseInt(h,16)); });
    var m=s.match(/Desempenho Usu.rio\s*-\s*(.+?)\s*-\s*(\d{4}-\d{2}-\d{2})\s*-\s*(\d{4}-\d{2}-\d{2})(?:-(\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}))?/i);
    if (!m) return {arq:s};
    return {arq:s, nome:m[1].trim(), ini:m[2], fim:m[3], ger:m[4]||''}; }
  function trUltimoDia(m){ var p=m.split('-').map(Number); return new Date(Date.UTC(p[0],p[1],0)).getUTCDate(); }
  function trSeg(v){ if (v==null||v==='') return null; if (typeof v==='number') return Math.round(v*86400); var p=String(v).trim().split(':').map(Number); if (p.length<2||p.some(isNaN)) return null; return p[0]*3600+p[1]*60+(p[2]||0); }
  function trLinhas(rows){ var out=[]; (rows||[]).forEach(function(r){ var et=String(r['Etapa']||'').trim(), q=+r['Quantidade']; if (!et||!(q>0)) return;
    out.push({tipo:String(r['Tipo de Documento']||'').trim(), et:et, nat:String(r['Natureza']||'').trim()||'(sem natureza)', seg:trSeg(r['Tempo'])||0, q:q}); }); return out; }
  // ——— banco: trab/AAAA-MM = {v, mes, dic, p:{nome:{arq, ger, ini, fim, r:"ti,ei,ni,seg,q;…"}}}
  function trCodificar(m, P){ var dic=[], ix={}; function d(s){ if (ix[s]==null){ ix[s]=dic.length; dic.push(s); } return ix[s]; }
    var p={}; Object.keys(P).forEach(function(n){ var x=P[n]; p[n]={arq:x.arq, ger:x.ger||'', ini:x.ini, fim:x.fim, r:x.L.map(function(l){ return [d(l.tipo),d(l.et),d(l.nat),l.seg,l.q].join(','); }).join(';')}; });
    return {v:1, mes:m, dic:dic, p:p, em:new Date().toISOString()}; }
  function trDecodificar(doc){ var P={}; Object.keys(doc.p||{}).forEach(function(n){ var x=doc.p[n];
      P[n]={arq:x.arq, ger:x.ger, ini:x.ini, fim:x.fim, L:String(x.r||'').split(';').filter(Boolean).map(function(s){ var f=s.split(','); return {tipo:doc.dic[+f[0]], et:doc.dic[+f[1]], nat:doc.dic[+f[2]], seg:+f[3], q:+f[4]}; })}; });
    return {mes:doc.mes, p:P}; }
  // ——— importação: várias planilhas (ou um .zip com elas) de uma vez
  function trImportar(lista){
    var av=[], porPM={}, nomesVHL={};
    try{ eqExecs().forEach(function(x){ if (x.src==='VHL') nomesVHL[chavePessoa(x.nome)]=1; }); }catch(e){}
    lista.forEach(function(f){ var n=trNomeArq(f.nome);
      if (!n.nome){ av.push({t:'crit', s:'<b>'+esc(n.arq)+'</b>: não achei a pessoa e o período no nome do arquivo. Não renomeie o arquivo que o VHL gera.'}); return; }
      var m=n.ini.slice(0,7);
      if (n.fim.slice(0,7)!==m){ av.push({t:'crit', s:'<b>'+esc(n.nome)+'</b>: o período '+fmtData(n.ini)+' a '+fmtData(n.fim)+' passa de um mês. Exporte um mês por arquivo.'}); return; }
      var L=trLinhas(f.rows), x={arq:n.arq, nome:n.nome, ini:n.ini, fim:n.fim, ger:n.ger, L:L, m:m}, k=n.nome+'|'+m;
      if (porPM[k]){ var a=porPM[k], igual=JSON.stringify(a.L)===JSON.stringify(L);
        av.push({t:'warn', s:'<b>'+esc(n.nome)+' · '+nomeMes(m)+'</b> veio 2 vezes'+(igual?' com o mesmo conteúdo — talvez outro mês tenha ficado de fora':' com conteúdo diferente')+'. Usei o gerado por último.'});
        if ((a.ger||'')>(n.ger||'')) return; }
      porPM[k]=x; });
    var P=Object.keys(porPM).map(function(k){ return porPM[k]; });
    P.forEach(function(x){
      if (x.ini.slice(8)!=='01'||+x.fim.slice(8)!==trUltimoDia(x.m)) av.push({t:'warn', s:'<b>'+esc(x.nome)+' · '+nomeMes(x.m)+'</b>: o arquivo vai de '+fmtData(x.ini)+' a '+fmtData(x.fim)+', não o mês inteiro. Entrou assim; exporte de novo do dia 1 ao último dia para completar.'});
      if (Object.keys(nomesVHL).length && !nomesVHL[chavePessoa(x.nome)]) av.push({t:'warn', s:'<b>'+esc(x.nome)+'</b> não aparece na Produção por Etapa do painel. Entrou, mas confira o nome.'});
      if (!x.L.length) av.push({t:'', s:'<b>'+esc(x.nome)+' · '+nomeMes(x.m)+'</b>: planilha sem linhas (nenhum ato no mês).'}); });
    var ms={}; P.forEach(function(x){ (ms[x.m]=ms[x.m]||[]).push(x); });
    var meses=Object.keys(ms).sort(), p=Promise.resolve(), substituidas=0;
    meses.forEach(function(m){ var atual=state.trab[m]?Object.assign({},state.trab[m].p):{};
      ms[m].forEach(function(x){ if (atual[x.nome]) substituidas++; atual[x.nome]={arq:x.arq, ger:x.ger, ini:x.ini, fim:x.fim, L:x.L}; });
      var doc=trCodificar(m, atual); state.trab[m]=trDecodificar(doc);
      if (dbPronto&&podeEscrever) p=p.then(function(){ return db.doc('trab/'+m).set(doc); }); });
    state.trabVer=(state.trabVer||0)+1; state._trB=null; state.impFeito.trab=(state.impFeito.trab||0)+P.length;
    state.trImp={n:P.length, pessoas:Object.keys(P.reduce(function(o,x){ o[x.nome]=1; return o; },{})).length, meses:meses, subst:substituidas, av:av, em:Date.now()};
    p.then(function(){ toast('Tempo de trabalho: '+P.length+' planilha(s) salvas'+(meses.length?' · '+(meses.length>3?nomeMes(meses[0])+' a '+nomeMes(meses[meses.length-1]):meses.map(nomeMes).join(', ')):'')); })
     .catch(function(){ toast('Li as planilhas, mas não consegui salvar o tempo de trabalho'); });
    atualizarChips(); trImpResumo(); render();
  }
  function trImpResumo(){ var el=$('trImpRes'); if (!el) return; var r=state.trImp; if (!r){ el.innerHTML=''; return; }
    el.innerHTML='<div class="banner'+(r.av.some(function(a){ return a.t==='crit'; })?' crit':r.av.length?' warn':'')+'" style="margin:10px 0 0"><b>Tempo de trabalho (Desempenho Usuário)</b>: '+r.n+' planilha(s), '+r.pessoas+' pessoa(s), '+(r.meses.length?r.meses.map(nomeMes).join(', '):'nenhum mês')+(r.subst?' · '+r.subst+' substituída(s) (mesma pessoa e mês)':'')+'.'+
      (r.av.length?'<ul style="margin:6px 0 0;padding-left:18px">'+r.av.map(function(a){ return '<li>'+a.s+'</li>'; }).join('')+'</ul>':'')+
      ' <button type="button" class="lnk" data-trimpok="1">Fechar</button> · <button type="button" class="lnk" data-trir="1">Ver no Desempenho</button></div>'; }
  // .zip com as planilhas: a biblioteca de planilhas já lê zip (é o formato do .xlsx)
  function trLerZip(f){ return precisaXLSX().then(function(){ return f.arrayBuffer(); }).then(function(buf){
      var z=XLSX.CFB.read(new Uint8Array(buf),{type:'array'}), out=[];
      z.FileIndex.forEach(function(e,i){ var nome=z.FullPaths[i]||e.name; if (e.type!==2||!/\.xlsx?$/i.test(nome)||!e.content||!e.content.length) return;
        try{ var wb=XLSX.read(e.content,{type:'array'}), ws=wb.Sheets[wb.SheetNames[0]], rows=XLSX.utils.sheet_to_json(ws,{raw:true,defval:null}), cab=rows.length?Object.keys(rows[0]):(XLSX.utils.sheet_to_json(ws,{header:1})[0]||[]);
          out.push({tipo:trEhArquivo(cab)?'trab':null, rows:rows, nome:nome}); }catch(err){ out.push({tipo:null, nome:nome}); } });
      return out; }); }

  // ═════════ cálculo ═════════
  function trJornada(){ var c=state.cfg||{}; return Math.max(1,(c.expFim!=null?c.expFim:17)-(c.expIni!=null?c.expIni:8)-1); } // expediente menos 1 h de almoço
  function trWq(E, p){ // quantil ponderado pela quantidade: E=[{v,w}]
    var a=E.filter(function(e){ return e.v!=null&&e.w>0; }).sort(function(x,y){ return x.v-y.v; }); if (!a.length) return null;
    var tot=a.reduce(function(s,e){ return s+e.w; },0), alvo=tot*p, acc=0; for (var i=0;i<a.length;i++){ acc+=a[i].w; if (acc>=alvo-1e-9) return a[i].v; } return a[a.length-1].v; }
  function trQ(v, p){ var a=v.filter(function(x){ return x!=null&&!isNaN(x); }).sort(function(x,y){ return x-y; }); if (!a.length) return null; var i=(a.length-1)*p, lo=Math.floor(i); return a[lo]+(a[Math.min(lo+1,a.length-1)]-a[lo])*(i-lo); }
  function trDiaUtil(iso, fer){ var p=String(iso).slice(0,10).split('-').map(Number), t=Date.UTC(p[0],p[1]-1,p[2]), w=new Date(t).getUTCDay(), d=Math.round(t/864e5); return w!==0&&w!==6&&!fer[d]; }
  // 0.24.0: UMA definição de dia ativo, usada em Tempo de trabalho, Relatórios e Visão geral:
  // dia útil em que a pessoa teve execução no VHL, andamento ou certidão no Tri7, ou senha atendida no balcão. {chavePessoa: {AAAA-MM: {AAAA-MM-DD:1}}}
  var DIA_ATIVO_DEF='dia útil com execução no VHL, andamento ou certidão no Tri7, ou senha atendida';
  function diasAtivos(){ var X=eqExecs(), EB=state.etB||null, fer=Motor.feriadoSet(state.extras);
    var k0=[X.length, EB?EB.length:-1, Object.keys(state.senhas).length, Object.keys(state.cert).length, state.andVer||0, (state.extras||[]).length, state.pesVer||0].join('|');
    if (state._da&&state._da.k===k0) return state._da.v;
    var DA={}; function dia(k,iso){ iso=String(iso||'').slice(0,10); if (!k||iso.length<10||!trDiaUtil(iso,fer)) return; var x=(DA[k]=DA[k]||{}), m=iso.slice(0,7); (x[m]=x[m]||{})[iso]=1; }
    X.forEach(function(x){ dia(chavePessoa(x.nome), x.d); });
    if (EB) EB.forEach(function(x){ dia(chavePessoa(x.rp), Motor.isoDeDia(x.d)); });
    Object.keys(state.senhas).forEach(function(m){ state.senhas[m].L.forEach(function(s){ if (s.at&&s.c!=null&&!/^tri7$/i.test(s.at)) dia(chavePessoa(s.at), s.dia); }); });
    Object.keys(state.cert).forEach(function(m){ state.cert[m].recs.forEach(function(r){ if (r.u&&!/^tri7$/i.test(r.u)) dia(chavePessoa(r.u), Motor.isoMin(r.f||r.i)); }); });
    state._da={k:k0,v:DA}; return DA; }
  function diasAtivosN(k,m){ return Object.keys(((diasAtivos()[k]||{})[m])||{}).length; }
  // tempo de uma certidão do Tri7 que não passa pelo VHL: o da certidão do VHL mais parecida
  var TR_CERT_MAP=[[/inteiro teor/i,/inteiro teor/i],[/[oô]nus/i,/[oô]nus/i],[/negativa/i,/negativa/i],[/descritiva|situa/i,/descritiva/i],[/c[oó]pia/i,/c[oó]pia/i]];
  function trBase(){
    var X=eqExecs(), A=state._eqA||{map:{},setor:{}}, fer=Motor.feriadoSet(state.extras||[]), EB=typeof etapasBrutas==='function'?etapasBrutas():null; // execuções brutas do VHL (inclui certidões digitais), carregadas sob demanda
    var k0=[state.trabVer||0, X.length, EB?EB.length:-1, Object.keys(state.cert).length, Object.keys(state.senhas).length, (state.extras||[]).length, state.fnVer||0, Object.keys(state.eqOcl||{}).join(','), Object.keys(state.docs).length, state.aprVer||Object.keys(state.apr||{}).length].join('|');
    if (state._trB&&state._trB.k===k0) return state._trB.v;
    var ms=Object.keys(state.trab).sort(), L=[], nomeK={};
    ms.forEach(function(m){ var P=state.trab[m].p; Object.keys(P).forEach(function(n){ var k=chavePessoa(n); nomeK[k]=nomeK[k]||n;
      var oc=typeof eqOculto==='function'&&eqOculto(semAc(n)); // 0.24.0: oculto em Equipe e funções não entra em faixa, tempo-padrão nem comparação (as horas continuam na carga)
      P[n].L.forEach(function(l){ L.push({k:k, nome:n, m:m, tipo:l.tipo, et:l.et, nat:l.nat, seg:l.seg, q:l.q, fn:eqFnDe(l.et,A), sv:eqSetorDoc(l.tipo), oc:oc}); }); }); });
    // etapas que o cronômetro cobre: metade ou mais dos atos com tempo
    var ET={}; L.forEach(function(l){ var e=ET[l.et]=ET[l.et]||{q:0,qc:0}; e.q+=l.q; if (l.seg>0) e.qc+=l.q; });
    Object.keys(ET).forEach(function(e){ ET[e].cron=ET[e].qc>=TR_MIN_CEL&&ET[e].qc/ET[e].q>=0.5; });
    // células etapa × natureza: tempo-padrão = mediana da equipe ponderada pelos atos (só linhas cronometradas)
    var C={}; L.forEach(function(l){ if (!(l.seg>0)||l.oc) return; var c=C[l.et+'|'+l.nat]=C[l.et+'|'+l.nat]||{et:l.et,nat:l.nat,fn:l.fn,E:[],q:0,ks:{}}; c.E.push({v:l.seg,w:l.q,k:l.k}); c.q+=l.q; c.ks[l.k]=1; });
    Object.keys(C).forEach(function(id){ var c=C[id]; c.np=Object.keys(c.ks).length; c.pad=c.q>=TR_MIN_CEL?trWq(c.E,.5):null; c.p25=trWq(c.E,.25); c.p75=trWq(c.E,.75); c.ex={}; });
    function padSem(c,k){ if (c.ex[k]!==undefined) return c.ex[k]; var E=c.E.filter(function(e){ return e.k!==k; }), q=E.reduce(function(s,e){ return s+e.w; },0); return c.ex[k]=(q>=TR_MIN_CEL&&c.np>=2)?trWq(E,.5):null; }
    // dias ativos: dia útil com alguma execução (VHL ou Tri7) ou senha atendida
    var DA=diasAtivos(); function dia(){} // 0.24.0: dias ativos vêm de diasAtivos() (definição única)
    // balcão: tempo de atendimento das senhas (até 1 h cada)
    var BAL={}; Object.keys(state.senhas).forEach(function(m){ state.senhas[m].L.forEach(function(s){ if (!s.at||s.c==null||s.t==null||s.t>3600||/^tri7$/i.test(s.at)) return; var k=chavePessoa(s.at); dia(k,m,s.dia); var b=(BAL[k]=BAL[k]||{}); b[m]=(b[m]||0)+s.t; nomeK[k]=nomeK[k]||s.at; }); });
    // certidões do Tri7 fora do VHL (código que não aparece em execução do VHL): tempo da certidão do VHL mais parecida
    var codVHL={}; X.forEach(function(x){ if (x.src==='VHL') codVHL[x.c]=1; }); if (EB) EB.forEach(function(x){ codVHL[x.c]=1; });
    var CN={}; L.forEach(function(l){ if (!/certid/i.test(l.tipo)) return; var c=CN[l.nat]=CN[l.nat]||{s:0,qmax:0,qe:{}}; if (l.seg>0) c.s+=l.seg*l.q; c.qe[l.et]=(c.qe[l.et]||0)+l.q; });
    var certNat=[], cS=0, cN=0; Object.keys(CN).forEach(function(n){ var c=CN[n]; c.n=Math.max.apply(null,Object.keys(c.qe).map(function(e){ return c.qe[e]; })); if (c.s>0&&c.n>=5){ certNat.push({nat:n, min:c.s/c.n/60, n:c.n}); cS+=c.s; cN+=c.n; } });
    var certGeral=cN?cS/cN/60:null;
    function minCert(nat){ for (var i=0;i<TR_CERT_MAP.length;i++){ if (!TR_CERT_MAP[i][0].test(nat||'')) continue; var alvo=certNat.filter(function(c){ return TR_CERT_MAP[i][1].test(c.nat); }), s=0, n=0; alvo.forEach(function(c){ s+=c.min*c.n; n+=c.n; }); if (n) return s/n; } return certGeral; }
    var CERT={}, certFora=0, certDentro=0; if (EB) Object.keys(state.cert).forEach(function(m){ state.cert[m].recs.forEach(function(r){ if (!r.u||/^tri7$/i.test(r.u)) return; if (codVHL[String(r.p)]){ certDentro++; return; } var mn=minCert(r.nat); if (mn==null) return;
      var iso=Motor.isoMin(r.f||r.i), mm=iso.slice(0,7), k=chavePessoa(r.u); dia(k,mm,iso); var c=(CERT[k]=CERT[k]||{}); c[mm]=c[mm]||{s:0,n:0}; c[mm].s+=mn*60; c[mm].n++; certFora++; nomeK[k]=nomeK[k]||r.u; }); });
    // pessoa × mês
    var PM={}, jor=trJornada();
    L.forEach(function(l){ var id=l.k+'|'+l.m, p=PM[id]=PM[id]||{k:l.k, nome:nomeK[l.k]||l.nome, m:l.m, sVHL:0, q:0, qCob:0, num:0, den:0, fnS:{}, svS:{}, qc:0};
      p.q+=l.q; if (ET[l.et]&&ET[l.et].cron) p.qCob+=l.q;
      if (l.seg>0){ p.sVHL+=l.seg*l.q; p.qc+=l.q; p.fnS[l.fn]=(p.fnS[l.fn]||0)+l.seg*l.q; p.svS[l.sv]=(p.svS[l.sv]||0)+l.seg*l.q; var c=C[l.et+'|'+l.nat], pd=c?padSem(c,l.k):null; if (pd){ p.num+=l.seg*l.q; p.den+=pd*l.q; } } });
    Object.keys(PM).forEach(function(id){ var p=PM[id], du=duMes(p.m), da=Object.keys(((DA[p.k]||{})[p.m])||{}).length;
      p.du=du; p.da=da; p.sCert=((CERT[p.k]||{})[p.m]||{}).s||0; p.nCert=((CERT[p.k]||{})[p.m]||{}).n||0; p.sBal=(BAL[p.k]||{})[p.m]||0;
      p.disp=(da||du)*jor*3600; p.sTot=p.sVHL+p.sCert+p.sBal; p.oc=p.disp?p.sTot/p.disp:null; p.cob=p.q?p.qCob/p.q:0; p.ritmo=p.den>=1800?p.num/p.den:null;
      p.fnP=Object.keys(p.fnS).sort(function(a,b){ return p.fnS[b]-p.fnS[a]; })[0]||null;
      p.oculto=typeof eqOculto==='function'&&eqOculto(semAc(p.nome));
      p.ferias=du&&da<du*0.6; p.ok=!p.oculto&&p.cob>=TR_COB_OK&&da>=TR_DIAS_OK&&p.q>=30; });
    // faixas tiradas dos dados: meses "bons" (cronômetro cobre a função e o mês teve dias ativos suficientes)
    var bons=Object.keys(PM).map(function(id){ return PM[id]; }).filter(function(p){ return p.ok; });
    var oc=bons.map(function(p){ return p.oc; }), ri=bons.map(function(p){ return p.ritmo; }).filter(function(v){ return v!=null; });
    function qs(v){ return {p10:trQ(v,.1),p25:trQ(v,.25),p50:trQ(v,.5),p75:trQ(v,.75),p90:trQ(v,.9)}; }
    var F={n:bons.length, oc:qs(oc), ri:qs(ri), fn:{}};
    // a ocupação só se compara dentro da mesma função principal: o cronômetro cobre partes diferentes do trabalho em cada função
    var GF={}; bons.forEach(function(p){ if (!p.fnP) return; var g=GF[p.fnP]=GF[p.fnP]||{v:[],ks:{}}; g.v.push(p.oc); g.ks[p.k]=1; });
    Object.keys(GF).forEach(function(fn){ var g=GF[fn], np=Object.keys(g.ks).length; if (np>=2&&g.v.length>=6){ var q=qs(g.v); q.n=g.v.length; q.np=np; F.fn[fn]=q; } });
    Object.keys(PM).forEach(function(id){ var p=PM[id]; p.fo=p.fnP&&F.fn[p.fnP]||null; });
    // contexto: aprendizagem aberta no mês
    var APR={}; (typeof aprLista==='function'?aprLista():[]).forEach(function(a){ if (!a.k||a.motivo==='experiencia') return; var ini=String(a.treino||'').slice(0,7), fim=String(a.status==='concluido'?(a.avalEm||a.treino):new Date().toISOString()).slice(0,7); if (!ini) return; (APR[a.k]=APR[a.k]||[]).push({ini:ini,fim:fim,pop:a.pop}); });
    Object.keys(PM).forEach(function(id){ var p=PM[id]; p.apr=(APR[p.k]||[]).filter(function(a){ return p.m>=a.ini&&p.m<=a.fim; }).map(function(a){ return a.pop; }); p.lei=trLeitura(p,F); });
    var v={EB:!!EB, L:L, ms:ms, ET:ET, C:C, PM:PM, F:F, nomeK:nomeK, jor:jor, certGeral:certGeral, certNat:certNat, certFora:certFora, certDentro:certDentro, padSem:padSem};
    state._trB={k:k0, v:v}; return v;
  }
  // leitura de um mês da pessoa (ocupação × ritmo), com a explicação provável
  function trLeitura(p, F){
    if (p.oculto) return {cod:'oculto', cls:'mut', txt:'fora da comparação', dica:'Pessoa oculta em Desempenho › Funções (gestão, apoio eventual): não entra nas faixas nem na leitura.'};
    if (!(p.cob>=TR_COB_OK)) return {cod:'cob', cls:'mut', txt:'cronômetro não cobre a função', dica:'Menos de '+Math.round(TR_COB_OK*100)+'% dos atos dela são de etapas cronometradas. Avalie por volume e pelas outras fontes.'};
    if (p.da<TR_DIAS_OK) return {cod:'dias', cls:'mut', txt:'poucos dias ativos', dica:p.da+' dias ativos de '+p.du+' úteis: provável férias ou afastamento. O mês não entra na leitura.'};
    // diferença mínima para não apontar variação pequena numa faixa estreita: 5 p.p. abaixo da faixa; "bem abaixo" = abaixo do décimo mais baixo e 15 p.p. abaixo da mediana
    var o=p.fo, r=F.ri, ocB=!!o&&p.oc<o.p25-TR_MARGEM, ocMB=!!o&&p.oc<Math.min(o.p10,o.p50-0.15), riL=r.p75!=null&&p.ritmo!=null&&p.ritmo>r.p75, riR=r.p25!=null&&p.ritmo!=null&&p.ritmo<r.p25;
    var ctx=p.apr&&p.apr.length?' Está em aprendizagem ('+p.apr.join(', ')+').':'';
    if (!o){ var sem=' Ninguém mais tem a mesma função principal com dados suficientes, então a ocupação não tem com quem ser comparada.';
      if (riL) return {cod:'lento', cls:'warn', txt:'tempo por ato acima (sem par na função)', dica:'Leva mais que a equipe nos mesmos atos.'+sem+ctx};
      if (riR) return {cod:'rapido', cls:'', txt:'tempo por ato abaixo (sem par na função)', dica:'Mais rápida que a equipe nos mesmos atos.'+sem+ctx};
      return {cod:'sempar', cls:'mut', txt:'sem par na função', dica:'Tempo por ato dentro da faixa.'+sem+ctx}; }
    if (!ocB&&!riL&&!riR) return {cod:'ok', cls:'', txt:'linha normal', dica:'Ocupação dentro da faixa de quem tem a mesma função e tempo por ato dentro da faixa da equipe.'+ctx};
    if (!ocB&&riL) return {cod:'lento', cls:'warn', txt:'dia cheio, tempo por ato acima', dica:'Trabalha o dia todo, mas leva mais que a equipe nos mesmos atos: aprendizagem, natureza mais trabalhosa dentro da etapa ou dúvida recorrente. Caminho: apoio e treinamento.'+ctx};
    if (!ocB&&riR) return {cod:'rapido', cls:'', txt:'dia cheio, tempo por ato abaixo', dica:'Mais rápida que a equipe nos mesmos atos. Vale conferir a qualidade (inconformidades) antes de tomar como referência.'+ctx};
    if (ocB&&riL) return {cod:'baixoLento', cls:'warn', txt:'ocupação abaixo, tempo por ato acima', dica:'Registra menos horas e leva mais por ato: ver se há tarefa fora do VHL, interrupções ou dificuldade com o tipo de ato.'+ctx};
    return {cod:ocMB?'baixo2':'baixo', cls:ocMB?'crit':'warn', txt:ocMB?'ocupação bem abaixo da faixa':'ocupação abaixo da faixa', dica:'O tempo por ato está normal, mas sobra tempo do dia sem trabalho registrado: tarefa fora do VHL (telefone, e-mail, apoio), cronômetro esquecido desligado ou ociosidade. Confira a função antes de concluir.'+ctx};
  }
  function trMesesPer(B){ return state.periodo==='todos'?B.ms:B.ms.filter(function(m){ return m===state.periodo; }); }
  function trH(seg){ return seg/3600; }
  function trFmtH(seg){ var h=seg/3600; return h>=100?numBR(h,0)+' h':numBR(h,1)+' h'; }
  function trFmtMin(seg){ return seg==null?'—':numBR(seg/60,seg<600?1:0)+' min'; }
  function trFmtPct(x){ return x==null||isNaN(x)?'—':numBR(x*100,0)+'%'; }
  function trFmtRi(x){ return x==null||isNaN(x)?'—':numBR(x,2).replace(/^(\d+)$/,'$1,00'); }

  // ═════════ página ═════════
  function trRender(el){
    var B=trBase(); if (!B.ms.length){ el.innerHTML+='<div class="empty"><b>Sem tempo de trabalho importado</b>No VHL, exporte o relatório <b>Desempenho Usuário</b> de cada pessoa, um mês por arquivo (do dia 1 ao último dia), e solte em Importar dados. Pode soltar as planilhas soltas ou um .zip com todas. Não renomeie os arquivos: a pessoa e o mês vêm do nome.</div>'; return; }
    var MS=trMesesPer(B); if (!MS.length){ el.innerHTML+='<div class="empty"><b>Sem tempo de trabalho em '+esc(nomeMes(state.periodo))+'</b>Escolha outro mês no Período ou importe as planilhas desse mês.</div>'; return; }
    var F=B.F, h='';
    var tot=0, q=0, qc=0; B.L.forEach(function(l){ if (MS.indexOf(l.m)<0) return; q+=l.q; if (l.seg>0){ tot+=l.seg*l.q; qc+=l.q; } });
    var pms=Object.keys(B.PM).map(function(id){ return B.PM[id]; }).filter(function(p){ return MS.indexOf(p.m)>=0; });
    h+='<div class="sec-h"><h2>Tempo de trabalho · '+esc(MS.length>1?nomeMes(MS[0])+' a '+nomeMes(MS[MS.length-1]):nomeMes(MS[0]))+'</h2><span class="note">Fonte: VHL · Desempenho Usuário (o cronômetro que a pessoa liga ao começar o documento): tempo médio por ato em cada etapa e natureza. As faixas normais saem dos próprios dados: <b>metade central</b> dos meses da equipe em que o cronômetro cobre a função ('+F.n+' meses-pessoa). Jornada considerada: '+B.jor+' h por dia ativo (expediente da Configuração menos 1 h de almoço).</span></div>';
    h+='<div class="kpis" style="margin-bottom:12px">'+
      kpi('Horas cronometradas',trFmtH(tot),q.toLocaleString('pt-BR')+' atos · '+trFmtPct(q?qc/q:null)+' com cronômetro','',(pnListasReg(),{go:goLista('Tempo de trabalho · linhas das planilhas','pnTrab',B.L.filter(function(l){ return MS.indexOf(l.m)>=0; }).sort(function(a,b){ return b.seg*b.q-a.seg*a.q; })), f:kConta('soma de (minutos por ato × atos) de cada linha das planilhas',qc.toLocaleString('pt-BR')+' atos com cronômetro',trFmtH(tot),'Desempenho Usuário do VHL (cronômetro)','Uma linha = pessoa × mês × etapa × natureza.')}))+
      kpi('Ocupação · mediana da equipe',trFmtPct(F.oc.p50),'horas com trabalho registrado ÷ horas disponíveis · a linha normal é por função (abaixo)','',{f:kConta('(horas no cronômetro do VHL + certidões do Tri7 fora do VHL × tempo da certidão parecida + balcão até 1 h por senha) ÷ (dias ativos × '+B.jor+' h)',null,null,'Desempenho Usuário do VHL (cronômetro)'+' + Relatório de andamentos do Tri7 + Consulta de senhas','Dia ativo = dia útil com execução no VHL, no Tri7 ou senha atendida. O cartão mostra a mediana dos meses-pessoa; a conta de cada pessoa está na tabela Por pessoa.')})+
      kpi('Tempo por ato × equipe · linha normal',F.ri.p25==null?'—':trFmtRi(F.ri.p25)+' a '+trFmtRi(F.ri.p75),'1,00 = igual à mediana da equipe nos mesmos atos','',{f:kConta('tempo por ato da pessoa ÷ mediana dos outros nos mesmos atos (etapa × natureza), ponderado pela quantidade',null,null,'Desempenho Usuário do VHL (cronômetro)','Linha normal = metade central dos meses-pessoa (de '+trFmtRi(F.ri.p25)+' a '+trFmtRi(F.ri.p75)+').')})+
      kpi('Certidões fora do VHL · todos os meses',B.EB?B.certFora.toLocaleString('pt-BR'):'…',B.EB?'entram na balança com o tempo da certidão parecida do VHL'+(B.certGeral!=null?' (média '+numBR(B.certGeral,1)+' min)':'')+' · '+B.certDentro.toLocaleString('pt-BR')+' já contadas no cronômetro':'lendo as execuções do VHL para não contar duas vezes…')+'</div>';
    h+=trFuncoesHTML(B);
    h+=trEtapasHTML(B,MS);
    h+=trSetoresHTML(B,MS);
    h+=trEntradaHTML(B,MS);
    if (podeEscrever) h+=trPessoasHTML(B,MS,pms); else h+='<div class="banner" style="margin-top:14px">A visão por pessoa fica só para quem administra o painel.</div>';
    el.innerHTML+=h.replace(/<div class="tbl-wrap"/g,'<div class="tbl-wrap" tabindex="0" role="region" aria-label="Tabela (role para ver tudo)"');
  }
  // ——— linha normal da ocupação por função principal (o cronômetro cobre partes diferentes do trabalho em cada função)
  function trFuncoesHTML(B){ var F=B.F, L=Object.keys(F.fn).map(function(fn){ return Object.assign({fn:fn},F.fn[fn]); }).sort(function(a,b){ return b.n-a.n; });
    if (!L.length) return '';
    return '<details class="met-sec" style="margin:0 0 12px" open><summary>Linha normal da ocupação · por função principal</summary><div class="tbl-wrap"><table class="tleft"><thead><tr><th>Função principal</th><th class="num">Pessoas</th><th class="num">Meses-pessoa</th><th class="num" title="Metade central dos meses">Linha normal</th><th class="num">Mediana</th><th class="num" title="Abaixo do décimo mais baixo e 15 p.p. abaixo da mediana">Bem abaixo de</th></tr></thead><tbody>'+
      L.map(function(x){ return '<tr><td>'+esc(x.fn)+'</td><td class="num">'+x.np+'</td><td class="num">'+x.n+'</td><td class="num"><b>'+trFmtPct(x.p25)+' a '+trFmtPct(x.p75)+'</b></td><td class="num">'+trFmtPct(x.p50)+'</td><td class="num">'+trFmtPct(Math.min(x.p10,x.p50-0.15))+'</td></tr>'; }).join('')+
      '</tbody></table></div><p class="hint">Função principal = a etapa em que a pessoa passou mais horas no mês. Cada pessoa só é comparada com quem tem a mesma função principal, porque o cronômetro cobre partes diferentes do trabalho em cada função (quem imprime ficha ou arquiva faz muito trabalho físico que o cronômetro não pega). Função com uma pessoa só fica sem faixa. Para não apontar variação pequena, "abaixo da faixa" começa 5 p.p. abaixo da linha normal.</p></details>'; }
  // ——— por etapa (função): tempo-padrão, carga, trabalho × espera
  function trEtapasHTML(B, MS){
    var FN={}; B.L.forEach(function(l){ if (MS.indexOf(l.m)<0) return; var f=FN[l.fn]=FN[l.fn]||{fn:l.fn, q:0, qc:0, s:0, E:[], ets:{}, nats:{}}; f.q+=l.q; f.ets[l.et]=1; if (l.seg>0){ f.qc+=l.q; f.s+=l.seg*l.q; if (!l.oc) f.E.push({v:l.seg,w:l.q}); var n=f.nats[l.nat]=f.nats[l.nat]||{q:0,s:0,E:[]}; n.q+=l.q; n.s+=l.seg*l.q; if (!l.oc) n.E.push({v:l.seg,w:l.q}); } });
    // dias na etapa (VHL), mesmos meses
    var PZ={}; eqExecs().forEach(function(x){ if (x.src!=='VHL'||x.pz==null||MS.indexOf(x.m)<0) return; var p=PZ[x.fn]=PZ[x.fn]||{s:0,n:0,nat:{}}; p.s+=x.pz; p.n++; var pn=p.nat[x.nat]=p.nat[x.nat]||{s:0,n:0}; pn.s+=x.pz; pn.n++; });
    var L=Object.keys(FN).map(function(k){ var f=FN[k]; f.pad=trWq(f.E,.5); f.p25=trWq(f.E,.25); f.p75=trWq(f.E,.75); f.cob=f.q?f.qc/f.q:0; var p=PZ[k]; f.dias=p&&p.n?p.s/p.n:null; return f; }).filter(function(f){ return f.qc>=TR_MIN_CEL; }).sort(function(a,b){ return b.s-a.s; });
    var top=L.slice(0,state.trEtTodas?999:12), sel=state.trEtSel&&FN[state.trEtSel]?FN[state.trEtSel]:null, jor=B.jor;
    var h='<div class="sub-h" style="margin-top:6px">Por etapa · tempo-padrão, carga e espera</div>';
    var allMs=B.ms.filter(function(m){ return state.periodo==='todos'||m<=state.periodo; }).slice(-12), top6=L.slice(0,6).map(function(f){ return f.fn; });
    var HM={}; B.L.forEach(function(l){ if (top6.indexOf(l.fn)<0||!(l.seg>0)) return; var k=l.fn+'|'+l.m; HM[k]=(HM[k]||0)+l.seg*l.q; });
    h+='<div class="vz-grid">'+vzCard('Carga de trabalho por etapa','horas cronometradas por mês',gLinhas(allMs,top6.map(function(fn,i){ return {nome:fn,cor:CAT[i%CAT.length],v:allMs.map(function(m){ return HM[fn+'|'+m]!=null?HM[fn+'|'+m]/3600:null; })}; }),{titulo:'Carga por etapa',un:'h',zero:true,rotulos:false}),'vz-wide')+
      vzCard('Trabalho × tempo na etapa','minutos de trabalho por ato e dias úteis que o documento fica na etapa',gBarrasH(L.filter(function(f){ return f.dias!=null; }).slice(0,8).map(function(f){ var pct=f.dias>0?(f.pad/3600)/(f.dias*jor)*100:null; return {nome:f.fn, v:f.dias, cor:'var(--c2)', extra:'Trabalho: '+trFmtMin(f.pad)+' por ato<br>Na etapa: '+numBR(f.dias,1)+' d.u. em média'+(pct!=null?'<br>Trabalho ≈ '+numBR(pct,pct<1?1:0)+'% do tempo na etapa; o resto é espera (fila)':'')}; }),{un:'d.u.'}),'')+'</div>';
    h+='<div class="tbl-wrap"><table class="tleft"><thead><tr><th>Etapa</th><th class="num">Atos</th><th class="num" title="Parte dos atos com o cronômetro ligado">Com cronômetro</th><th class="num" title="Mediana da equipe, ponderada pelos atos">Tempo-padrão</th><th class="num" title="Metade central dos meses-pessoa">Faixa normal</th><th class="num">Horas</th><th class="num" title="Dias úteis que o documento fica na etapa (VHL · Produção por Etapa)">Dias na etapa</th><th class="num" title="Trabalho por ato ÷ tempo na etapa (dias × jornada)">Trabalho no tempo da etapa</th></tr></thead><tbody>'+
      top.map(function(f){ var pct=f.dias>0?(f.pad/3600)/(f.dias*jor):null;
        return '<tr class="click'+(sel===f?' sel':'')+'" data-tret="'+esc(f.fn)+'"><td>'+esc(f.fn)+'</td><td class="num">'+f.q.toLocaleString('pt-BR')+'</td><td class="num">'+trFmtPct(f.cob)+'</td><td class="num"><b>'+trFmtMin(f.pad)+'</b></td><td class="num">'+trFmtMin(f.p25)+' a '+trFmtMin(f.p75)+'</td><td class="num">'+trFmtH(f.s)+'</td><td class="num">'+(f.dias==null?'—':numBR(f.dias,1))+'</td><td class="num">'+(pct==null?'—':numBR(pct*100,pct<0.01?1:0)+'%')+'</td></tr>'; }).join('')+'</tbody></table></div>'+
      (L.length>12?'<p class="hint"><button type="button" class="lnk" data-tretall="1">'+(state.trEtTodas?'Mostrar só as 12 com mais horas':'Mostrar todas as '+L.length+' etapas')+'</button></p>':'')+
      '<p class="hint">Clique numa etapa para ver o tempo-padrão por natureza. Pessoas ocultas em Desempenho › Funções contam nas horas, mas não no tempo-padrão. "Trabalho no tempo da etapa" baixo quer dizer que o documento passa a maior parte do tempo esperando a vez, não sendo trabalhado.</p>';
    if (sel){ var pz=PZ[sel.fn]||{nat:{}}, NL=Object.keys(sel.nats).map(function(n){ var x=sel.nats[n], p=pz.nat[n]; return {nat:n, q:x.q, s:x.s, pad:trWq(x.E,.5), p25:trWq(x.E,.25), p75:trWq(x.E,.75), dias:p&&p.n?p.s/p.n:null}; }).sort(function(a,b){ return b.s-a.s; }).slice(0,25);
      h+='<div class="panel" style="margin:6px 0 14px"><div class="sub-h">'+esc(sel.fn)+' · por natureza</div><div class="tbl-wrap"><table class="tleft"><thead><tr><th>Natureza</th><th class="num">Atos cronometrados</th><th class="num">Tempo-padrão</th><th class="num">Faixa normal</th><th class="num">Horas</th><th class="num">Dias na etapa</th></tr></thead><tbody>'+
        NL.map(function(n){ return '<tr><td>'+esc(n.nat)+'</td><td class="num">'+n.q.toLocaleString('pt-BR')+'</td><td class="num"><b>'+(n.q>=TR_MIN_CEL?trFmtMin(n.pad):'<span class="mut" title="Menos de '+TR_MIN_CEL+' atos">'+trFmtMin(n.pad)+'</span>')+'</b></td><td class="num">'+trFmtMin(n.p25)+' a '+trFmtMin(n.p75)+'</td><td class="num">'+trFmtH(n.s)+'</td><td class="num">'+(n.dias==null?'—':numBR(n.dias,1))+'</td></tr>'; }).join('')+'</tbody></table></div><p class="hint">Etapas do VHL juntadas nesta função: '+Object.keys(sel.ets).map(esc).join(', ')+'.</p></div>'; }
    return h;
  }
  // ——— setores: quanto da capacidade foi usada (ocupação do setor) mês a mês
  function trSetoresHTML(B, MS){
    var ms=B.ms.filter(function(m){ return state.periodo==='todos'||m<=state.periodo; }).slice(-12), S={};
    Object.keys(B.PM).forEach(function(id){ var p=B.PM[id]; if (!p.ok||!p.sVHL) return; Object.keys(p.svS).forEach(function(sv){ var sh=p.svS[sv]/p.sVHL, x=(S[sv]=S[sv]||{}); x[p.m]=x[p.m]||{c:0,d:0,n:{}}; x[p.m].c+=p.svS[sv]+(p.sCert+p.sBal)*sh; x[p.m].d+=p.disp*sh; if (sh>=0.3) x[p.m].n[p.nome]=1; }); });
    var svs=Object.keys(S).filter(function(sv){ return ms.some(function(m){ return S[sv][m]&&S[sv][m].d>=8*3600*20; }); }).sort(function(a,b){ var ta=0, tb=0; ms.forEach(function(m){ ta+=(S[a][m]||{}).c||0; tb+=(S[b][m]||{}).c||0; }); return tb-ta; });
    if (!svs.length) return '';
    var sv=svs.indexOf(state.trSetor)>=0?state.trSetor:svs[0];
    var v=ms.map(function(m){ var x=S[sv][m]; return x&&x.d>0?x.c/x.d*100:null; }), hist=B.ms.map(function(m){ var x=S[sv][m]; return x&&x.d>0?x.c/x.d*100:null; }).filter(function(x){ return x!=null; });
    var lo=trQ(hist,.25), hi=trQ(hist,.75), md=trQ(hist,.5), carga=ms.map(function(m){ var x=S[sv][m]; return x?x.c/3600:null; }), pess=ms.map(function(m){ var x=S[sv][m]; return x?Object.keys(x.n).length:null; });
    var alto=[], baixo=[]; v.forEach(function(x,i){ if (x==null||hist.length<4) return; if (x>hi) alto.push(nomeMes(ms[i])+' ('+numBR(x,0)+'%)'); else if (x<lo) baixo.push(nomeMes(ms[i])+' ('+numBR(x,0)+'%)'); });
    return '<div class="sub-h" style="margin-top:14px">Setores · capacidade usada</div><div class="search" style="margin-bottom:8px"><div class="seg seg-wrap" role="group" aria-label="Setor">'+svs.slice(0,7).map(function(x){ return '<button type="button" class="segb" data-trsetor="'+esc(x)+'" aria-pressed="'+(x===sv)+'">'+esc(x)+'</button>'; }).join('')+'</div></div><div class="vz-grid">'+
      vzCard(sv+' · ocupação do setor','horas com trabalho registrado ÷ horas disponíveis de quem trabalhou no setor (cada pessoa conta na proporção das horas dela ali) · faixa cinza = metade central dos meses do próprio setor',gLinhas(ms,[{nome:sv,cor:'var(--c1)',v:v,alerta:v.map(function(x){ return x!=null&&hist.length>=4&&x>hi; }),extra:ms.map(function(m,i){ return pess[i]!=null?pess[i]+' pessoa(s) · '+numBR(carga[i],0)+' h de trabalho':''; })}],{titulo:'Ocupação do setor',un:'%',banda:hist.length>=4?{lo:ms.map(function(){ return lo; }),hi:ms.map(function(){ return hi; })}:null,ref:md!=null?[{v:md,nome:'mediana do setor'}]:[]}),'vz-wide')+
      vzCard(sv+' · carga e gente','horas de trabalho registradas no setor por mês',gLinhas(ms,[{nome:'Horas de trabalho',cor:'var(--c2)',v:carga,extra:pess.map(function(n){ return n!=null?n+' pessoa(s) com 30%+ das horas no setor':''; })}],{titulo:'Carga do setor',un:'h',zero:true}),'vz-wide')+'</div>'+
      '<p class="hint">Ponto vermelho = mês acima da faixa do próprio setor: trabalhou no limite, candidato a receber gente'+(alto.length?' (<b>'+alto.map(esc).join('</b>, <b>')+'</b>)':'')+'. Abaixo da faixa: sobrou capacidade'+(baixo.length?' ('+baixo.map(esc).join(', ')+')':'')+'. Só entram meses em que o cronômetro cobre a função da pessoa.</p>';
  }
  // ——— trabalho que entrou (RI): protocolos que ingressaram na semana × minutos de trabalho que a natureza costuma consumir
  function trSemana(iso){ var p=String(iso).slice(0,10).split('-').map(Number), t=Date.UTC(p[0],p[1]-1,p[2]), w=(new Date(t).getUTCDay()+6)%7; return new Date(t-w*864e5).toISOString().slice(0,10); }
  function trMinNat(B){ // minutos de trabalho cronometrado por protocolo do RI, por natureza (meses com tempo de trabalho)
    var s={}, n={}; B.L.forEach(function(l){ if (l.tipo!=='RI'||!(l.seg>0)) return; s[l.nat]=(s[l.nat]||0)+l.seg*l.q; });
    B.ms.forEach(function(m){ (state.docs[m]?state.docs[m].atos:[]).forEach(function(a){ n[a.nat]=(n[a.nat]||0)+1; }); });
    var o={}; Object.keys(s).forEach(function(k){ if (n[k]>=5) o[k]={min:s[k]/n[k]/60, n:n[k]}; }); return o; }
  function trEntradaHTML(B, MS){
    var MN=trMinNat(B), geral=0, gn=0; Object.keys(MN).forEach(function(k){ geral+=MN[k].min*MN[k].n; gn+=MN[k].n; }); geral=gn?geral/gn:null; if (geral==null) return '';
    var W={}, ini=B.ms[0]+'-01', fim=B.ms[B.ms.length-1]+'-31';
    Object.keys(state.docs).forEach(function(m){ state.docs[m].atos.forEach(function(a){ if (!a.ing||a.ing<ini||a.ing>fim) return; var w=trSemana(a.ing), x=W[w]=W[w]||{n:0,h:0,nat:{}}; var mn=(MN[a.nat]||{}).min; if (mn==null) mn=geral; x.n++; x.h+=mn/60; x.nat[a.nat]=(x.nat[a.nat]||0)+1; }); });
    // capacidade do RI por semana: horas disponíveis de quem trabalha no RI × ocupação mediana, proporcional aos dias úteis da semana
    var ocRI=trQ(Object.keys(B.PM).map(function(id){ var p=B.PM[id]; return p.ok&&p.sVHL&&(p.svS['Registro (RI)']||0)/p.sVHL>=0.5?p.oc:null; }),.5)||B.F.oc.p50||0.8;
    var fer=Motor.feriadoSet(state.extras||[]), capM={}; Object.keys(B.PM).forEach(function(id){ var p=B.PM[id]; if (!p.sVHL) return; var sh=(p.svS['Registro (RI)']||0)/p.sVHL; if (sh<=0) return; capM[p.m]=(capM[p.m]||0)+p.disp/3600*sh*ocRI; });
    var ws=Object.keys(W).sort(), hoje=new Date().toISOString().slice(0,10); if (ws.length<4) return '';
    var cap=ws.map(function(w){ var t=0, ok=false; for (var i=0;i<7;i++){ var d=new Date(Date.parse(w)+i*864e5).toISOString().slice(0,10), m=d.slice(0,7); if (!trDiaUtil(d,fer)||capM[m]==null) continue; ok=true; t+=capM[m]/Math.max(1,duMes(m)); } return ok?t:null; });
    var vals=ws.map(function(w){ return W[w].h; }), recente=ws.map(function(w){ return (Date.parse(hoje)-Date.parse(w))/864e5<45; });
    var picos=ws.map(function(w,i){ return cap[i]!=null&&vals[i]>cap[i]; });
    var h='<div class="sub-h" style="margin-top:14px">Trabalho que entrou no RI · por semana</div><div class="vz-grid">'+vzCard('Horas de trabalho que entraram × capacidade','protocolos que ingressaram na semana × minutos que a natureza costuma consumir (cronômetro) · linha = capacidade do RI na semana (horas disponíveis de quem trabalha no RI × ocupação mediana do RI, '+trFmtPct(ocRI)+')',trColunas(ws,vals,cap,picos,recente,W),'vz-wide')+'</div>';
    var np=picos.filter(Boolean).length;
    h+='<p class="hint">'+(np?'<b>'+np+' semana(s)</b> em que entrou mais trabalho do que o RI dá conta numa semana normal (barras vermelhas). Compare com o prazo das semanas seguintes para ver quanto tempo depois o atraso aparece. ':'')+'Um protocolo do RI consome em média <b>'+numBR(geral,0)+' min</b> de trabalho somando todas as etapas cronometradas. Só entram protocolos já finalizados: nas últimas semanas (mais claras) ainda faltam os que estão em andamento.</p>';
    var tN=Object.keys(MN).map(function(k){ return {nat:k, min:MN[k].min, n:MN[k].n}; }).sort(function(a,b){ return b.n-a.n; }).slice(0,10);
    h+='<details class="met-sec" style="margin:0 0 10px"><summary>Minutos de trabalho por protocolo, por natureza</summary><div class="tbl-wrap"><table class="tleft"><thead><tr><th>Natureza</th><th class="num">Protocolos</th><th class="num">Trabalho por protocolo</th></tr></thead><tbody>'+tN.map(function(x){ return '<tr><td>'+esc(x.nat)+'</td><td class="num">'+x.n.toLocaleString('pt-BR')+'</td><td class="num"><b>'+numBR(x.min,0)+' min</b></td></tr>'; }).join('')+'</tbody></table></div><p class="hint">Soma do tempo cronometrado de todas as pessoas e etapas na natureza ÷ protocolos finalizados da natureza nos mesmos meses. Inclui reingressos e retrabalho.</p></details>';
    return h;
  }
  function trColunas(ws, vals, cap, picos, recente, W){
    var Wd=larg(), H=230, pl=40, pr=12, pt=14, pb=26, n=ws.length, mx=Math.max.apply(null,vals.concat(cap.filter(function(v){ return v!=null; })))*1.1||1;
    var bw=(Wd-pl-pr)/n, y=function(v){ return pt+(H-pt-pb)*(1-v/mx); }, s=dSvg(Wd,H,'Trabalho que entrou')+eixoY(0,mx,y,pl,Wd,pr,function(t){ return numBR(t,0); });
    ws.forEach(function(w,i){ var x=pl+i*bw, v=vals[i], c=picos[i]?'var(--crit)':'var(--c1)', top=Object.keys(W[w].nat).sort(function(a,b){ return W[w].nat[b]-W[w].nat[a]; }).slice(0,3);
      s+='<rect x="'+(x+1).toFixed(1)+'" y="'+y(v).toFixed(1)+'" width="'+Math.max(1,bw-2).toFixed(1)+'" height="'+Math.max(1,y(0)-y(v)).toFixed(1)+'" rx="2" pointer-events="none" style="fill:'+c+(recente[i]?';opacity:.45':'')+'"/>';
      s+=hitRect(x,pt,bw,H-pt-pb,'<b>Semana de '+fmtData(w)+'</b><br>'+W[w].n+' protocolos · '+numBR(v,0)+' h de trabalho'+(cap[i]!=null?'<br>Capacidade da semana: '+numBR(cap[i],0)+' h':'')+'<br>'+top.map(function(t){ return esc(t)+': '+W[w].nat[t]; }).join('<br>')+(recente[i]?'<br><i>semana recente: faltam os protocolos em andamento</i>':''),null);
      if (i%Math.max(1,Math.ceil(n/10))===0) s+='<text x="'+(x+bw/2).toFixed(1)+'" y="'+(H-8)+'" text-anchor="middle" font-size="11" style="fill:var(--ink-3)" pointer-events="none">'+w.slice(8)+'/'+w.slice(5,7)+'</text>'; });
    var d=''; cap.forEach(function(v,i){ if (v==null) return; var x=pl+i*bw+bw/2; d+=(d?' L':'M')+x.toFixed(1)+','+y(v).toFixed(1); });
    if (d) s+='<path d="'+d+'" fill="none" stroke="var(--ink-2)" stroke-width="2" stroke-dasharray="5 3" pointer-events="none"/>';
    return s+'</svg><div class="leg"><span><i class="dot" style="background:var(--c1)"></i>Horas que entraram</span><span><i class="dot" style="background:var(--crit)"></i>Acima da capacidade</span><span><i class="dot" style="background:var(--ink-2)"></i>Capacidade (tracejado)</span></div>';
  }
  // ——— por pessoa (só administração)
  function trPessoasHTML(B, MS, pms){
    var F=B.F, P={};
    pms.forEach(function(p){ var x=P[p.k]=P[p.k]||{k:p.k, nome:p.nome, ms:[], s:0, d:0, q:0, qCob:0, num:0, den:0, sCert:0, sBal:0, da:0, du:0, fnS:{}};
      x.ms.push(p); x.q+=p.q; x.qCob+=p.qCob; x.sCert+=p.sCert; x.sBal+=p.sBal; x.da+=p.da; x.du+=p.du; Object.keys(p.fnS).forEach(function(f){ x.fnS[f]=(x.fnS[f]||0)+p.fnS[f]; });
      if (p.ok){ x.s+=p.sTot; x.d+=p.disp; x.num+=p.num; x.den+=p.den; } });
    var L=Object.keys(P).map(function(k){ var x=P[k]; x.oc=x.d?x.s/x.d:null; x.ritmo=x.den>=1800?x.num/x.den:null; x.cob=x.q?x.qCob/x.q:0; x.fn=Object.keys(x.fnS).sort(function(a,b){ return x.fnS[b]-x.fnS[a]; }).slice(0,2); x.fo=x.fn[0]&&F.fn[x.fn[0]]||null;
      x.lei=x.ms[0]&&x.ms[0].oculto?trLeitura({oculto:true},F):x.oc==null?(x.cob<TR_COB_OK?trLeitura({cob:x.cob},F):{cls:'mut',txt:'poucos dias ativos',dica:'Nenhum mês do período com '+TR_DIAS_OK+'+ dias ativos.'}):trLeitura({oculto:x.ms[0]&&x.ms[0].oculto, cob:x.cob, da:TR_DIAS_OK, du:TR_DIAS_OK, oc:x.oc, ritmo:x.ritmo, fo:x.fo, apr:[].concat.apply([],x.ms.map(function(p){ return p.apr||[]; })).filter(function(v,i,a){ return a.indexOf(v)===i; })},F); return x; })
      .sort(function(a,b){ var ca=a.oc==null?1:0, cb=b.oc==null?1:0; return ca-cb||(b.s-a.s)||(b.q-a.q); });
    // atenção: 3 meses seguidos abaixo do limite (p10) com cronômetro cobrindo a função
    var at=[]; Object.keys(B.nomeK).forEach(function(k){ var seq=0, max=0; B.ms.forEach(function(m){ var p=B.PM[k+'|'+m]; if (p&&p.ok&&p.lei&&p.lei.cod==='baixo2'){ seq++; max=Math.max(max,seq); } else if (p&&p.ok) seq=0; }); if (max>=3) at.push(B.nomeK[k]); });
    var h='<div class="sub-h" style="margin-top:18px">Por pessoa · '+esc(MS.length>1?nomeMes(MS[0])+' a '+nomeMes(MS[MS.length-1]):nomeMes(MS[0]))+' <span class="pill mute">só administração</span></div>';
    h+='<p class="hint" style="margin-top:0">Ocupação = (horas cronometradas no VHL + certidões do Tri7 fora do VHL + atendimento no balcão) ÷ (dias ativos × '+B.jor+' h). Dia ativo = dia útil com alguma execução no VHL ou no Tri7, ou senha atendida; assim férias e afastamento não derrubam a ocupação. Tempo por ato × equipe compara cada ato com a mediana <b>das outras pessoas</b> na mesma etapa e natureza. Só entram meses com '+TR_DIAS_OK+'+ dias ativos e com o cronômetro cobrindo '+Math.round(TR_COB_OK*100)+'%+ dos atos.</p>';
    if (at.length) h+='<div class="banner warn">3 meses seguidos com ocupação abaixo do décimo mais baixo de quem tem a mesma função, com o cronômetro cobrindo a função: <b>'+at.map(esc).join('</b>, <b>')+'</b>. Antes de concluir, confira função, tarefas fora do VHL e afastamentos.</div>';
    // 0.24.0: gráfico na frente (ocupação de cada pessoa sobre a faixa da função dela); a tabela fica atrás
    h+='<div class="vz-grid">'+vzCard('Ocupação de cada pessoa','barra = ocupação no período · faixa cinza = linha normal de quem tem a mesma função principal · cor = leitura · clique para ver mês a mês',trOcBarras(L.filter(function(x){ return x.oc!=null; })),'vz-wide')+'</div>';
    h+='<details class="met-sec" style="margin:0 0 10px"><summary>Ver a tabela</summary><div class="tbl-wrap"><table class="tleft"><thead><tr><th>Pessoa</th><th>Função principal</th><th class="num" title="Linha normal da ocupação de quem tem a mesma função principal">Linha normal da função</th><th class="num">Atos</th><th class="num" title="Parte dos atos em etapas que o cronômetro cobre">Cobertura</th><th class="num">Dias ativos</th><th class="num" title="Horas com trabalho registrado (VHL + certidões fora do VHL + balcão)">Horas</th><th class="num">Ocupação</th><th class="num" title="Tempo dela ÷ mediana das outras pessoas, mesmos atos. 1,00 = igual">Tempo por ato × equipe</th><th>Leitura</th></tr></thead><tbody>'+
      L.map(function(x){ var fo=x.fo, ocC=x.oc==null||!fo?'':x.lei.cod==='baixo2'?'acima':/^baixo/.test(x.lei.cod)?'warn-t':'', riC=x.ritmo==null?'':x.ritmo>F.ri.p75?'acima':x.ritmo<F.ri.p25?'bom':'';
        return '<tr class="click'+(state.trPes===x.k?' sel':'')+'" data-trpes="'+esc(x.k)+'"><td>'+esc(x.nome)+'</td><td>'+esc(x.fn.join(', ')||'—')+'</td><td class="num">'+(x.fo?trFmtPct(x.fo.p25)+' a '+trFmtPct(x.fo.p75):'<span class="mut">sem par</span>')+'</td><td class="num">'+x.q.toLocaleString('pt-BR')+'</td><td class="num">'+trFmtPct(x.cob)+'</td><td class="num">'+x.da+' <span class="mut">de '+x.du+'</span></td><td class="num">'+(x.d?trFmtH(x.s):'—')+'</td><td class="num '+ocC+'"><b>'+trFmtPct(x.oc)+'</b></td><td class="num '+riC+'">'+trFmtRi(x.ritmo)+'</td><td class="'+(x.lei.cls==='crit'?'acima':x.lei.cls==='warn'?'warn-t':x.lei.cls)+'" data-tip="'+esc(x.lei.dica||'')+'">'+esc(x.lei.txt)+'</td></tr>'; }).join('')+'</tbody></table></div></details>';
    h+='<p class="hint">A ocupação de cada pessoa é comparada com a linha normal de quem tem a mesma função principal; o tempo por ato, com a equipe inteira nos mesmos atos ('+trFmtRi(F.ri.p25)+' a '+trFmtRi(F.ri.p75)+' é a linha normal). Passe o mouse na leitura para ver a explicação provável. Clique numa pessoa para ver mês a mês.</p>';
    var sel=state.trPes&&B.nomeK[state.trPes]?state.trPes:null; if (sel) h+=trPessoaHTML(B,sel);
    h+=trGradeHTML(B);
    return h;
  }
  function trOcBarras(L){
    if (!L.length) return '<div class="gm-vazio">Ninguém com meses comparáveis no período</div>';
    var W=larg(), lh=26, pl=Math.min(190,Math.round(W*0.34)), pr=56, pt=8, pb=24, H=pt+pb+L.length*lh, mx=Math.max(1,Math.max.apply(null,L.map(function(x){ return x.oc; }))*1.05), X=function(v){ return pl+(W-pl-pr)*Math.max(0,v)/mx; }, nch=Math.max(10,Math.floor(pl/7.6));
    var s=dSvg(W,H,'Ocupação de cada pessoa'); [0,0.25,0.5,0.75,1].forEach(function(t){ if (t>mx) return; s+='<line x1="'+X(t).toFixed(1)+'" x2="'+X(t).toFixed(1)+'" y1="'+pt+'" y2="'+(H-pb)+'" stroke="var(--line)" pointer-events="none"/><text x="'+X(t).toFixed(1)+'" y="'+(H-8)+'" text-anchor="middle" font-size="11" style="fill:var(--ink-3)" pointer-events="none">'+numBR(t*100,0)+'%</text>'; });
    L.slice().sort(function(a,b){ return b.oc-a.oc; }).forEach(function(x,i){ var cy=pt+i*lh+lh/2, cor=x.lei.cls==='crit'?'var(--crit)':x.lei.cls==='warn'?'var(--warn)':x.lei.cls==='mut'?'var(--ink-3)':'var(--c1)';
      if (x.fo) s+='<rect x="'+X(x.fo.p25).toFixed(1)+'" y="'+(cy-11)+'" width="'+Math.max(1,X(x.fo.p75)-X(x.fo.p25)).toFixed(1)+'" height="22" style="fill:var(--ink-3);opacity:.16" pointer-events="none"/>';
      s+=hitRect(0,cy-lh/2,W,lh,'<b>'+esc(x.nome)+'</b> · '+esc(x.fn.join(', ')||'—')+'<br>Ocupação: <b>'+trFmtPct(x.oc)+'</b>'+(x.fo?' · linha normal da função: '+trFmtPct(x.fo.p25)+' a '+trFmtPct(x.fo.p75):' · sem par na função')+'<br>Tempo por ato × equipe: '+trFmtRi(x.ritmo)+'<br>'+esc(x.lei.txt)+(x.lei.dica?'<br><span class=mut>'+esc(x.lei.dica)+'</span>':''),{t:'trp',k:x.k});
      s+='<text x="'+(pl-8)+'" y="'+(cy+3.5)+'" text-anchor="end" font-size="11" style="fill:var(--ink-2)" pointer-events="none">'+esc(x.nome.length>nch?x.nome.slice(0,nch-1)+'…':x.nome)+'</text>';
      s+='<rect x="'+X(0).toFixed(1)+'" y="'+(cy-6)+'" width="'+Math.max(1,X(x.oc)-X(0)).toFixed(1)+'" height="12" rx="2" style="fill:'+cor+'" pointer-events="none"/>'+(state.trPes===x.k?'<rect x="'+(X(0)-2).toFixed(1)+'" y="'+(cy-9)+'" width="'+(X(x.oc)-X(0)+4).toFixed(1)+'" height="18" fill="none" stroke="var(--ink)" stroke-width="1.5" rx="3" pointer-events="none"/>':'');
      s+='<text x="'+(X(x.oc)+6).toFixed(1)+'" y="'+(cy+4)+'" font-size="11" font-weight="700" style="fill:var(--ink)" pointer-events="none">'+trFmtPct(x.oc)+'</text>'; });
    return s+'</svg>'; }
  function trPessoaHTML(B, k){
    var F=B.F, ms=B.ms.filter(function(m){ return state.periodo==='todos'||m<=state.periodo; }).slice(-12), nome=B.nomeK[k], P=ms.map(function(m){ return B.PM[k+'|'+m]||null; });
    var ctx=function(p){ if (!p) return 'sem planilha'; var t=[]; if (p.ferias) t.push(p.da+' de '+p.du+' dias ativos'); if (p.apr&&p.apr.length) t.push('aprendizagem: '+p.apr.join(', ')); if (!(p.cob>=TR_COB_OK)) t.push('cronômetro cobre '+trFmtPct(p.cob)); return t.join(' · '); };
    var fc={}; P.forEach(function(p){ if (p&&p.fnP) fc[p.fnP]=(fc[p.fnP]||0)+1; });
    var fnP=Object.keys(fc).sort(function(a,b){ return fc[b]-fc[a]; })[0], fo=fnP&&F.fn[fnP]||null;
    var oc=P.map(function(p){ return p&&p.da?p.oc*100:null; }), vz=P.map(function(p){ return !!(p&&(!p.ok||(p.apr&&p.apr.length))); }), al=P.map(function(p){ return !!(p&&p.ok&&p.lei&&p.lei.cod==='baixo2'); });
    var ri=P.map(function(p){ return p&&p.ritmo!=null?p.ritmo:null; }), alR=P.map(function(p){ return !!(p&&p.ok&&p.ritmo!=null&&p.ritmo>F.ri.p90); });
    var mk=[]; P.forEach(function(p,i){ if (p&&p.apr&&p.apr.length) mk.push({i:i, txt:'aprendizagem'}); });
    var h='<div class="panel" style="margin:10px 0 14px"><div class="sub-h">'+esc(nome)+' · mês a mês</div><div class="vz-grid">'+
      vzCard('Ocupação',(fo?'faixa cinza = linha normal de quem tem a função '+esc(fnP)+' ('+trFmtPct(fo.p25)+' a '+trFmtPct(fo.p75)+') · vermelho = bem abaixo (menos de '+trFmtPct(Math.min(fo.p10,fo.p50-0.15))+')':'função '+esc(fnP||'—')+' sem par para comparar')+' · círculo vazado = mês com contexto (férias, aprendizagem, cronômetro não cobre)',gLinhas(ms,[{nome:nome,cor:'var(--c1)',v:oc,vazio:vz,alerta:al,extra:P.map(ctx)}],{titulo:'Ocupação',un:'%',banda:fo?{lo:ms.map(function(){ return fo.p25*100; }),hi:ms.map(function(){ return fo.p75*100; })}:null,ref:fo?[{v:fo.p50*100,nome:'mediana da função'}]:[],marcos:mk}),'vz-wide')+
      vzCard('Tempo por ato × equipe','1,00 = igual à mediana das outras pessoas nos mesmos atos · faixa = linha normal ('+trFmtRi(F.ri.p25)+' a '+trFmtRi(F.ri.p75)+')',gLinhas(ms,[{nome:nome,cor:'var(--c2)',v:ri,alerta:alR,vazio:vz,extra:P.map(ctx)}],{titulo:'Tempo por ato',un:'',banda:{lo:ms.map(function(){ return F.ri.p25; }),hi:ms.map(function(){ return F.ri.p75; })},ref:[{v:1,nome:'equipe'}],marcos:mk}),'vz-wide')+'</div>';
    // composição das horas
    var tV=0, tC=0, tB=0, tD=0; P.forEach(function(p){ if (!p) return; tV+=p.sVHL; tC+=p.sCert; tB+=p.sBal; tD+=p.disp; });
    h+='<div class="vz-grid">'+vzCard('De onde vêm as horas','período do gráfico',gRosca([{nome:'Cronômetro do VHL',v:Math.round(tV/60),cor:'var(--c1)'},{nome:'Certidões fora do VHL (estimado)',v:Math.round(tC/60),cor:'var(--c3)'},{nome:'Balcão (senhas)',v:Math.round(tB/60),cor:'var(--c4)'},{nome:'Sem trabalho registrado',v:Math.max(0,Math.round((tD-tV-tC-tB)/60)),cor:'var(--line)'}],{centro:trFmtPct(tD?(tV+tC+tB)/tD:null),sub:'ocupação'}),'');
    // atos dela × tempo-padrão das outras pessoas
    var cel={}; B.L.forEach(function(l){ if (l.k!==k||!(l.seg>0)||ms.indexOf(l.m)<0) return; var id=l.et+'|'+l.nat, c=cel[id]=cel[id]||{et:l.et,nat:l.nat,s:0,q:0}; c.s+=l.seg*l.q; c.q+=l.q; });
    var CL=Object.keys(cel).map(function(id){ var c=cel[id], C=B.C[id]; c.pad=C?B.padSem(C,k):null; c.p25=C?C.p25:null; c.p75=C?C.p75:null; c.m=c.s/c.q; return c; }).sort(function(a,b){ return b.s-a.s; }).slice(0,15);
    h+=vzCard('Onde vão as horas dela','etapas e naturezas com mais horas',gBarrasH(CL.slice(0,8).map(function(c){ return {nome:eqFnDe(c.et,state._eqA||{map:{}})+' · '+c.nat, v:c.s/3600, cor:'var(--c1)', extra:c.q+' atos · '+trFmtMin(c.m)+' por ato'+(c.pad?' · equipe '+trFmtMin(c.pad):'')}; }),{un:'h'}),'')+'</div>';
    h+='<div class="tbl-wrap"><table class="tleft"><thead><tr><th>Etapa</th><th>Natureza</th><th class="num">Atos</th><th class="num">Dela (média)</th><th class="num" title="Mediana das outras pessoas">Equipe</th><th class="num">Faixa normal</th><th class="num">× equipe</th></tr></thead><tbody>'+
      CL.map(function(c){ var r=c.pad?c.m/c.pad:null; return '<tr><td>'+esc(c.et)+'</td><td>'+esc(c.nat)+'</td><td class="num">'+c.q+'</td><td class="num">'+trFmtMin(c.m)+'</td><td class="num">'+trFmtMin(c.pad)+'</td><td class="num">'+(c.p25!=null?trFmtMin(c.p25)+' a '+trFmtMin(c.p75):'—')+'</td><td class="num '+(r!=null&&c.q>=5?(c.m>c.p75&&r>1.2?'acima':c.m<c.p25&&r<0.8?'bom':''):'')+'">'+trFmtRi(r)+'</td></tr>'; }).join('')+'</tbody></table></div>';
    // leitura mês a mês
    h+='<div class="tbl-wrap" style="margin-top:8px"><table class="tleft"><thead><tr><th>Mês</th><th class="num">Dias ativos</th><th class="num">Horas</th><th class="num">Ocupação</th><th class="num">Tempo por ato</th><th>Leitura</th><th>Contexto</th></tr></thead><tbody>'+
      ms.map(function(m,i){ var p=P[i]; if (!p) return '<tr><td>'+nomeMes(m)+'</td><td colspan="6" class="mut">sem planilha deste mês</td></tr>';
        return '<tr><td>'+nomeMes(m)+'</td><td class="num">'+p.da+' <span class="mut">de '+p.du+'</span></td><td class="num">'+trFmtH(p.sTot)+'</td><td class="num">'+trFmtPct(p.oc)+'</td><td class="num">'+trFmtRi(p.ritmo)+'</td><td class="'+(p.lei.cls==='crit'?'acima':p.lei.cls==='warn'?'warn-t':p.lei.cls)+'">'+esc(p.lei.txt)+'</td><td class="mut">'+esc(ctx(p))+'</td></tr>'; }).join('')+'</tbody></table></div><p class="hint">'+esc(P.filter(Boolean).slice(-1)[0]?P.filter(Boolean).slice(-1)[0].lei.dica:'')+'</p></div>';
    return h;
  }
  // ——— quais planilhas já entraram (pessoa × mês) e quais faltam
  function trGradeHTML(B){
    var ms=B.ms.slice(-12), exe={}; eqExecs().forEach(function(x){ if (x.src==='VHL') { var k=chavePessoa(x.nome); (exe[k]=exe[k]||{})[x.m]=(exe[k][x.m]||0)+1; B.nomeK[k]=B.nomeK[k]||x.nome; } });
    var ks=Object.keys(B.nomeK).filter(function(k){ return ms.some(function(m){ return (exe[k]||{})[m]||B.PM[k+'|'+m]; }); }).sort(function(a,b){ return B.nomeK[a].localeCompare(B.nomeK[b],'pt-BR'); });
    var falta=0, parc=0;
    var rows=ks.map(function(k){ return '<tr><td>'+esc(B.nomeK[k])+'</td>'+ms.map(function(m){ var p=B.PM[k+'|'+m], tem=false, par=false, ex=(exe[k]||{})[m]||0;
        Object.keys((state.trab[m]||{}).p||{}).forEach(function(n){ if (chavePessoa(n)===k){ tem=true; var x=state.trab[m].p[n]; if (x.ini.slice(8)!=='01'||+x.fim.slice(8)!==trUltimoDia(m)) par=true; } });
        if (tem&&par){ parc++; return '<td class="num warn-t" title="Arquivo não cobre o mês inteiro">½</td>'; }
        if (tem) return '<td class="num" title="'+(p?p.q+' atos':'')+'">✓</td>';
        if (ex){ falta++; return '<td class="num acima" title="'+ex+' execuções no VHL e nenhuma planilha">✗</td>'; }
        return '<td class="num mut">·</td>'; }).join('')+'</tr>'; }).join('');
    return '<details class="met-sec" style="margin-top:14px"'+(falta||parc?' open':'')+'><summary>Planilhas importadas · pessoa × mês'+(falta?' · <span class="acima">'+falta+' faltando</span>':'')+(parc?' · <span class="warn-t">'+parc+' incompleta(s)</span>':'')+'</summary><div class="tbl-wrap"><table class="tleft"><thead><tr><th>Pessoa</th>'+ms.map(function(m){ return '<th class="num">'+MES_AB[+m.slice(5)-1]+'</th>'; }).join('')+'</tr></thead><tbody>'+rows+'</tbody></table></div><p class="hint">✓ importada · ½ o arquivo não cobre o mês inteiro · ✗ a pessoa tem execuções no VHL no mês e falta a planilha · · sem atividade.</p></details>';
  }
