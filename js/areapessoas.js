/* Painel SGQ · CRCO — js/areapessoas.js (0.26.0: área Pessoas — Ficha, Comparar, Matriz de funções, Caso de retenção, Conferência das fontes, Fotografias)
 * Regras: compara só quem faz o mesmo serviço (faixa da função principal); critérios fixos, iguais para todos;
 * aprendizagem, mudança de função e afastamento são contexto e não pontuam; atestado e falta nunca entram.
 * O painel monta o caso; quem decide é a gestão, com motivo registrado (LGPD art. 20). Só administrador vê. */
(window.PAINEL_ARQ=window.PAINEL_ARQ||{})['js/areapessoas.js']='0.27.0';
  var PA_ABAS={pfi:'renderFicha', pcm:'renderComparar', pmt:'renderMatriz', pcs:'renderCaso', pcf:'renderConferencia', fot:'renderFotos'};
  function paRender(k){ var f=PA_ABAS[k]; if (f&&typeof window[f]==='function') window[f](); }
  function paSemDados(el, txt){ el.innerHTML='<div class="empty"><b>Sem dados para esta tela</b>'+(txt||'Importe o relatório Desempenho Usuário do VHL (um arquivo por pessoa e mês) em Importar dados.')+'</div>'; }
  function pesSitDe(nome){ if (typeof PES==='undefined') return null; var id=PES.map&&PES.map[pesNorm(nome)]; var p=id&&PES.p[id]; if (!p){ Object.keys(PES.p||{}).some(function(i){ if (PES.p[i].nome===nome){ p=PES.p[i]; return true; } return false; }); } return p?{sit:p.sit||'ativa', ate:p.ate||''}:null; }
  function paDeslig(nome){ var s=pesSitDe(nome); return !!(s&&s.sit==='desligada'); }

  // ═════════ base comum ═════════
  function paBase(){
    var B=trBase(); if (!B.ms.length) return null;
    var V=vgBase(), k0=[state._vgB&&state._vgB.k, state.periodo, Object.keys(state.apr||{}).length, Object.keys(state.eqOcl||{}).join(','), state._eqX&&state._eqX.k, state.pesVer||0].join('|');
    if (state._paB&&state._paB.k===k0&&state._paB.V===V) return state._paB.v;
    var MS=trMesesPer(B), R=vgPessoas(V,MS);
    var fech=B.ms.filter(function(m){ return m<mesHoje() && !mesParcial(m); }).slice(-6), R6=vgPessoas(V,fech);
    var M=paMatriz(B,V);
    var v={B:B, V:V, MS:MS, R:R, fech:fech, R6:R6, M:M};
    state._paB={k:k0, V:V, v:v}; return v; }
  function paPorK(R){ var o={}; R.L.forEach(function(p){ o[p.k]=p; }); return o; }
  function paPer(MS){ return MS.length>1?nomeMes(MS[0])+' a '+nomeMes(MS[MS.length-1]):MS.length?nomeMes(MS[0]):'—'; }
  // tendência: média da nota dos 3 últimos meses fechados × os 3 anteriores (5 p.p. = mudança)
  function paTend(V, k, fech){ var n=fech.map(function(m){ var x=V.PM[k+'|'+m]; var r=x?vgNota([x],VG_VAR[0]):null; return r?r.nota:null; });
    var a=n.slice(0,3).filter(function(v){ return v!=null; }), b=n.slice(3).filter(function(v){ return v!=null; });
    if (a.length<2||b.length<2) return {txt:'poucos meses', ord:null, serie:n};
    var d=media(b)-media(a); return {txt:d>0.05?'melhorando':d<-0.05?'piorando':'estável', ord:d>0.05?2:d<-0.05?0:1, d:d, serie:n}; }

  // ═════════ matriz de funções (últimos 12 meses fechados) ═════════
  var PA_MIN_FN=20, PA_FN_PRINC=500; // execuções em 12 meses: 20 para aparecer em "todas"; 500 (cerca de 2 por dia útil) para ser função principal da matriz (e contar em risco e polivalência)
  function paFnsDoPop(c){ var p=typeof popDe==='function'?popDe(c):null; return p?(p.ets||[]).map(function(e){ return eqCanon(e); }):[]; }
  function paMatriz(B, V){
    var ult=mesAnt(mesHoje()), ini=ult; for (var i=0;i<11;i++) ini=mesAnt(ini);
    var X=eqExecs().filter(function(x){ return x.m>=ini && x.m<=ult; }), Q=eqContar(X), mn=eqMin();
    var F=Object.keys(Q.F).filter(function(f){ return Q.F[f]>=PA_MIN_FN; }).sort(function(a,b){ return Q.F[b]-Q.F[a]; });
    var canon={}; F.forEach(function(f){ canon[eqCanon(f)]=f; });
    // função principal (titular): a de mais horas no tempo de trabalho dos 12 meses; sem planilha, a de mais execuções
    var ms12=B?B.ms.filter(function(m){ return m>=ini&&m<=ult; }):[], R12=V&&ms12.length?vgPessoas(V,ms12):{L:[]}, TIT={};
    R12.L.forEach(function(p){ if (p.fn) TIT[p.k]=p.fn; });
    var P={}; Object.keys(Q.PF).forEach(function(k){ var nome=Q.nomes[k], tot=0; Object.keys(Q.PF[k]).forEach(function(f){ tot+=Q.PF[k][f]; }); if (tot<mn) return;
      var ck=chavePessoa(nome), fp=TIT[ck]||Object.keys(Q.PF[k]).sort(function(a,b){ return Q.PF[k][b]-Q.PF[k][a]; })[0];
      P[k]={k:k, ck:ck, nome:nome, tit:fp, n:Q.PF[k], apta:{}, aprende:{}, oculto:eqOculto(k), deslig:paDeslig(nome)}; });
    (typeof aprLista==='function'?aprLista():[]).forEach(function(a){ var p=null; Object.keys(P).some(function(k){ if (P[k].ck===a.k||semAc(P[k].nome)===semAc(a.nome||'')){ p=P[k]; return true; } return false; }); if (!p) return;
      paFnsDoPop(a.pop).forEach(function(c){ var f=canon[c]; if (!f) return; if (a.status==='concluido'&&a.res==='apto') p.apta[f]=a.pop; else if (a.status!=='concluido') p.aprende[f]=a.pop; }); });
    function nivel(p,f){ var n=p.n[f]||0; if (p.tit===f&&n) return 'T'; if (n>=mn) return 'E'; if (p.apta[f]) return 'A'; if (p.aprende[f]) return 'P'; if (n) return 'e'; return ''; }
    var COB={}; F.forEach(function(f){ var c=Object.keys(P).filter(function(k){ var l=nivel(P[k],f); return (l==='T'||l==='E')&&!P[k].deslig; }); COB[f]={n:c.length, ks:c, aptas:Object.keys(P).filter(function(k){ return nivel(P[k],f)==='A'&&!P[k].deslig; }).length}; });
    // o que só uma pessoa cobre
    var FP=F.filter(function(f){ return Q.F[f]>=PA_FN_PRINC; });
    Object.keys(P).forEach(function(k){ P[k].so=FP.filter(function(f){ return COB[f].n===1&&COB[f].ks[0]===k; }); P[k].nf=FP.filter(function(f){ var l=nivel(P[k],f); return l==='T'||l==='E'; }).length; });
    return {ini:ini, ult:ult, X:X, Q:Q, F:F, FP:FP, P:P, COB:COB, nivel:nivel}; }
  function paMatPorCk(M, ck){ var r=null; Object.keys(M.P).some(function(k){ if (M.P[k].ck===ck){ r=M.P[k]; return true; } return false; }); return r; }
  function paGoExec(M, k, f){ pnListasReg(); return goLista((M.P[k]?M.P[k].nome:k)+' · '+f+' · '+nomeMes(M.ini)+' a '+nomeMes(M.ult),'pnExec',M.X.filter(function(x){ return x.k===k&&x.fn===f; })); }
  var NIV_TXT={T:'Titular',E:'Executa',A:'Apta (POP)',P:'Em aprendizagem',e:'Eventual'};

  function renderMatriz(){
    var el=$('tabPmt'); if (!el) return; var A=paBase(); var M=A?A.M:paMatriz(null,null);
    if (!M.F.length){ paSemDados(el,'Importe a Produção por Etapa e o Relatório de andamentos dos últimos 12 meses.'); return; }
    var ks=Object.keys(M.P).filter(function(k){ var p=M.P[k]; return (state.pmTodas?M.F:M.FP).some(function(f){ return M.nivel(p,f); }); }).sort(function(a,b){ return String(M.P[a].nome).localeCompare(String(M.P[b].nome),'pt-BR'); });
    var FV=state.pmTodas?M.F:M.FP, risco=FV.filter(function(f){ return M.COB[f].n<=1; });
    var h='<div class="sec-h"><h2>Matriz de funções · '+esc(nomeMes(M.ini))+' a '+esc(nomeMes(M.ult))+'</h2><span class="note"><b>Titular</b> = função principal (mais horas no tempo de trabalho; sem planilha, mais execuções). <b>Executa</b> = '+eqMin()+'+ execuções em 12 meses. <b>Apta</b> = aprovada no POP da função na Aprendizagem, sem execução recente. <b>Em aprendizagem</b> = acompanhamento aberto. <b>Eventual</b> = menos de '+eqMin()+' execuções. Cobertura conta quem é titular ou executa, sem as pessoas desligadas. Clique numa célula para ver as execuções.</span></div>';
    h+='<div class="kpis" style="margin-bottom:12px">'+kpi('Funções na matriz',String(FV.length),(state.pmTodas?PA_MIN_FN:PA_FN_PRINC)+'+ execuções em 12 meses')+kpi('Cobertas por 1 pessoa',String(risco.length),risco.length?'risco de parar se ela sair':'nenhuma',risco.length?'canc':'',{go:null, f:kConta('funções em que só 1 pessoa é titular ou executa',null,null,'Produção por Etapa do VHL + Relatório de andamentos do Tri7 + Aprendizagem')})+kpi('Pessoas',String(ks.length),eqMin()+'+ execuções em 12 meses')+'</div>';
    if (risco.length) h+='<div class="banner warn" style="margin:0 0 10px">Só uma pessoa cobre: '+risco.map(function(f){ var k=M.COB[f].ks[0]; return '<b>'+esc(f)+'</b> ('+(k?esc(M.P[k].nome):'ninguém')+(M.COB[f].aptas?' · '+M.COB[f].aptas+' apta(s) no POP':'')+')'; }).join(' · ')+'.</div>';
    h+='<div class="search" style="margin-bottom:6px"><div class="seg" role="group" aria-label="Funções"><button type="button" class="segb" data-pmtodas="0" aria-pressed="'+!state.pmTodas+'">Principais ('+M.FP.length+')</button><button type="button" class="segb" data-pmtodas="1" aria-pressed="'+!!state.pmTodas+'">Todas ('+M.F.length+')</button></div></div>';
    h+='<div class="tbl-wrap pa-mat"><table><thead><tr><th class="tleft pa-fix">Pessoa</th>'+FV.map(function(f){ return '<th class="pa-rot" title="'+esc(f)+' · '+M.Q.F[f]+' execuções"><span>'+esc(f)+'</span></th>'; }).join('')+'<th>Funções</th></tr></thead><tbody>'+
      ks.map(function(k){ var p=M.P[k]; return '<tr'+(p.deslig?' class="mut"':'')+'><td class="tleft pa-fix">'+esc(p.nome)+(p.deslig?' <span class="pill mute">desligada</span>':'')+(p.oculto?' <span class="pill mute" title="Fora da comparação">fora</span>':'')+'</td>'+
        FV.map(function(f){ var l=M.nivel(p,f), n=p.n[f]||0; if (!l) return '<td></td>';
          return '<td class="pa-c pa-'+l+(n?' click':'')+'"'+(n?goAttr(paGoExec(M,k,f)):'')+' title="'+esc(p.nome+' · '+f+': '+NIV_TXT[l]+(n?' · '+n+' execuções':'')+(p.apta[f]?' · apta em '+p.apta[f]:'')+(p.aprende[f]?' · aprendendo '+p.aprende[f]:''))+'">'+(l==='T'?'T':l==='E'?'E':l==='A'?'A':l==='P'?'Ap':'·')+'</td>'; }).join('')+
        '<td class="num">'+p.nf+(p.so.length?' <span class="pill warn" title="Só ela cobre: '+esc(p.so.join(', '))+'">só ela: '+p.so.length+'</span>':'')+'</td></tr>'; }).join('')+
      '<tr class="tot"><td class="tleft pa-fix"><b>Cobertura</b></td>'+FV.map(function(f){ var c=M.COB[f]; return '<td class="num'+(c.n<=1?' acima':'')+'" title="'+c.n+' pessoa(s) titular ou executa'+(c.aptas?' · '+c.aptas+' apta(s)':'')+'"><b>'+c.n+'</b>'+(c.aptas?'<small>+'+c.aptas+'A</small>':'')+'</td>'; }).join('')+'<td></td></tr></tbody></table></div>'+
      '<div class="leg" style="margin-top:6px"><span><i class="pa-lg pa-T">T</i>Titular</span><span><i class="pa-lg pa-E">E</i>Executa</span><span><i class="pa-lg pa-A">A</i>Apta (POP)</span><span><i class="pa-lg pa-P">Ap</i>Em aprendizagem</span><span><i class="pa-lg pa-e">·</i>Eventual</span></div>';
    h+=paFotoBtn('Matriz de funções · '+nomeMes(M.ini)+' a '+nomeMes(M.ult));
    el.innerHTML=h; }

  // ═════════ Ficha da pessoa ═════════
  function paListaPessoas(A){ var o={}; if (A){ A.R.L.forEach(function(p){ o[p.k]=p.nome; }); Object.keys(A.M.P).forEach(function(k){ var p=A.M.P[k]; if (!o[p.ck]) o[p.ck]=p.nome; }); }
    return Object.keys(o).map(function(k){ return {k:k, nome:o[k]}; }).sort(function(a,b){ return a.nome.localeCompare(b.nome,'pt-BR'); }); }
  function paSel(id, lista, val, rot, vazio){ return '<label class="pa-sel"><span>'+rot+'</span><select id="'+id+'" aria-label="'+esc(rot)+'">'+(vazio?'<option value="">'+vazio+'</option>':'')+lista.map(function(x){ return '<option value="'+esc(x.k)+'"'+(x.k===val?' selected':'')+'>'+esc(x.nome)+'</option>'; }).join('')+'</select></label>'; }
  function renderFicha(){
    var el=$('tabPfi'); if (!el) return; var A=paBase(); if (!A){ paSemDados(el); return; }
    var L=paListaPessoas(A); if (!L.length){ paSemDados(el); return; }
    var k=L.some(function(x){ return x.k===state.pfSel; })?state.pfSel:L[0].k; state.pfSel=k;
    var R=paPorK(A.R), p=R[k], mp=paMatPorCk(A.M,k), nome=(p||mp||{}).nome||k, sit=pesSitDe(nome);
    var h='<div class="search pa-top">'+paSel('pfSelIn',L,k,'Pessoa')+'<span class="spacer"></span>'+(podeEscrever?oclBtn(nome):'')+'<button type="button" class="btn sm" data-pacmpcom="'+esc(k)+'">Comparar com…</button><button type="button" class="btn sm" data-paver="rel" data-nome="'+esc(nome)+'">Relatório individual</button></div>';
    h+='<div class="sec-h"><h2>'+esc(nome)+(sit&&sit.sit!=='ativa'?' <span class="pill mute">'+esc(sit.sit)+(sit.ate?' em '+fmtData(sit.ate):'')+'</span>':'')+'</h2><span class="note">Período: '+esc(paPer(A.MS))+' (segue o Período do topo). Funções e cobertura: últimos 12 meses fechados.</span></div>';
    var g=p&&p.grupo, fx=g&&g.fx&&g.fx.base, td=paTend(A.V,k,A.fech);
    h+='<div class="kpis" style="margin-bottom:12px">'+
      kpi('Função principal',esc((p&&p.fn)||(mp&&mp.tit)||'—'),p&&p.grupo?p.grupo.length+' pessoa(s) na mesma função':'')+
      kpi('Nota',p&&p.R?vgPct(p.R.nota):'—',p?esc(vgCatTxt(p))+(fx?' · faixa '+vgPct(fx.p25)+' a '+vgPct(fx.p75):''):'sem tempo de trabalho no período',p&&p.cat==='abaixo'?'canc':'',{go:p?{t:'vg',k:p.k}:null, f:p&&p.R?kConta('(horas-padrão entregues − retrabalho) ÷ horas disponíveis','(horas produzidas '+trFmtH(p.R.ent+p.R.cert+p.R.bal)+' − retrabalho '+trFmtH(p.R.ret)+') ÷ disponíveis '+trFmtH(p.R.disp),vgPct(p.R.nota),'Desempenho Usuário + Produção por Etapa + Tri7 + senhas + PAINEL-04'):''})+
      kpi('Inconformidade',p&&p.taxa!=null?pct(p.taxa*100):'—',p?p.inc+' internas em '+p.docs+' documentos'+(g&&g.taxa!=null?' · função '+pct(g.taxa*100):''):'',p&&g&&p.taxa!=null&&g.taxa!=null&&p.taxa>g.taxa*1.5&&p.inc>=3?'canc':'',{go:goLista('Inconformidades internas · '+nome,'inc',incTodos().filter(function(r){ return grupoDe(r)==='I'&&chavePessoa(r.r)===k&&A.MS.indexOf(String(r.d).slice(0,7))>=0; })), f:kConta(TAXA_DEF,p?p.inc+' ÷ '+p.docs:null,p&&p.taxa!=null?pct(p.taxa*100):null,'PAINEL-04 × Produção por Etapa')})+
      kpi('Tendência',td.txt,'últimos 3 meses fechados × 3 anteriores',td.ord===0?'canc':'')+
      kpi('Funções',mp?String(mp.nf):'—',mp&&mp.so.length?'só ela cobre: '+esc(mp.so.join(', ')):'titular ou executa em 12 meses',mp&&mp.so.length?'canc':'')+
      kpi('Dias ativos',p?String(p.da):'—',p?'de '+p.du+' dias úteis':'', '', {f:kConta(DIA_ATIVO_DEF,null,null,'VHL + Tri7 + senhas','Afastamento não pontua: só muda as horas disponíveis.')})+'</div>';
    // funções
    if (mp){ h+='<div class="sub-h">Funções · '+esc(nomeMes(A.M.ini))+' a '+esc(nomeMes(A.M.ult))+'</div><div class="pend-chips" style="margin-bottom:10px">'+A.M.F.filter(function(f){ return A.M.nivel(mp,f); }).map(function(f){ var l=A.M.nivel(mp,f), n=mp.n[f]||0; return '<button type="button" class="chip pa-'+l+'"'+(n?goAttr(paGoExec(A.M,mp.k,f)):'')+'>'+esc(f)+' · '+NIV_TXT[l]+(n?' · '+n:'')+(A.M.COB[f].n===1&&A.M.COB[f].ks[0]===mp.k?' · só ela':'')+'</button>'; }).join('')+'</div>'; }
    // aprendizagem
    var ap=(typeof aprLista==='function'?aprLista():[]).filter(function(a){ return a.k===k||semAc(a.nome||'')===semAc(nome); });
    if (ap.length) h+='<div class="sub-h">Aprendizagem <span class="mut">(contexto: não pontua)</span></div><ul class="pend-l">'+ap.map(function(a){ return '<li>'+esc(a.pop||'')+' · '+(a.status==='concluido'?(a.res==='apto'?'Apto':a.res==='nao'?'Não apto':'concluído'):'em acompanhamento')+(a.treino?' · treinado em '+fmtData(a.treino):'')+'</li>'; }).join('')+'</ul>';
    // a conta (mesma da Visão geral)
    if (p) h+=vgContaHTML(A.V,A.R,p,A.MS).replace('data-vgfechar="1"','data-vgfechar="1" hidden');
    else h+='<p class="hint">Sem planilha Desempenho Usuário desta pessoa no período: a nota não é calculada.</p>';
    h+=paFotoBtn('Ficha · '+nome+' · '+paPer(A.MS));
    el.innerHTML=h; }

  // ═════════ Comparar ═════════
  function paLinhas(A, R, k, M){ var P=paPorK(R), p=P[k], mp=paMatPorCk(M,k), g=p&&p.grupo, fx=g&&g.fx&&g.fx.base, td=paTend(A.V,k,A.fech);
    return {k:k, nome:(p||mp||{}).nome||k, p:p, mp:mp, fn:(p&&p.fn)||(mp&&mp.tit)||null, fx:fx, td:td, g:g}; }
  var PA_CRIT=[
    ['Função principal', function(x){ return esc(x.fn||'—'); }],
    ['Nota', function(x){ return x.p&&x.p.R?'<b>'+vgPct(x.p.R.nota)+'</b>':'—'; }, function(x){ return x.p&&x.p.R?{t:'vg',k:x.k}:null; }],
    ['Posição na faixa da função', function(x){ return x.p?esc(vgCatTxt(x.p))+(x.fx?' <span class="mut">('+vgPct(x.fx.p25)+' a '+vgPct(x.fx.p75)+')</span>':''):'—'; }],
    ['Horas produzidas', function(x){ return x.p&&x.p.R?trFmtH(x.p.R.ent+x.p.R.cert+x.p.R.bal):'—'; }],
    ['Retrabalho', function(x){ return x.p&&x.p.R?(x.p.R.ret?'−'+trFmtH(x.p.R.ret):'0 h'):'—'; }],
    ['Horas entregues (produzidas − retrabalho)', function(x){ return x.p&&x.p.R?'<b>'+trFmtH(x.p.R.ent+x.p.R.cert+x.p.R.bal-x.p.R.ret)+'</b>':'—'; }],
    ['Horas disponíveis', function(x){ return x.p&&x.p.R?trFmtH(x.p.R.disp):'—'; }],
    ['Inconformidade', function(x){ return x.p&&x.p.taxa!=null?pct(x.p.taxa*100)+' <span class="mut">('+x.p.inc+' em '+x.p.docs+(x.g&&x.g.taxa!=null?' · função '+pct(x.g.taxa*100):'')+')</span>':'—'; }],
    ['Funções que exerce', function(x){ return x.mp?String(x.mp.nf):'—'; }],
    ['Só ela cobre', function(x){ return x.mp&&x.mp.so.length?esc(x.mp.so.join(', ')):'—'; }],
    ['Tendência', function(x){ return esc(x.td.txt); }],
    ['Robustez da posição', function(x){ return x.p&&x.p.nVal?(x.p.estavel?'firme ('+x.p.nVal+' de '+x.p.nVal+')':x.p.nMesma+' de '+x.p.nVal):'—'; }],
    ['Dias ativos', function(x){ return x.p?x.p.da+' <span class="mut">de '+x.p.du+'</span>':'—'; }],
    ['Em aprendizagem', function(x){ return x.p&&x.p.apr.length?esc(x.p.apr.join(', ')):'—'; }]
  ];
  function renderComparar(){
    var el=$('tabPcm'); if (!el) return; var A=paBase(); if (!A){ paSemDados(el); return; }
    var L=paListaPessoas(A); if (L.length<2){ paSemDados(el,'Precisa de pelo menos 2 pessoas com dados.'); return; }
    var ok=function(v){ return L.some(function(x){ return x.k===v; }); };
    if (!ok(state.pcA)) state.pcA=L[0].k; if (!ok(state.pcB)||state.pcB===state.pcA) state.pcB=L.filter(function(x){ return x.k!==state.pcA; })[0].k; if (state.pcC&&!ok(state.pcC)) state.pcC='';
    var ks=[state.pcA,state.pcB].concat(state.pcC?[state.pcC]:[]), X=ks.map(function(k){ return paLinhas(A,A.R,k,A.M); });
    var h='<div class="search pa-top">'+paSel('pcAIn',L,state.pcA,'Pessoa A')+paSel('pcBIn',L,state.pcB,'Pessoa B')+paSel('pcCIn',L,state.pcC||'','Pessoa C','(nenhuma)')+'</div>';
    h+='<div class="sec-h"><h2>Comparar · '+esc(paPer(A.MS))+'</h2><span class="note">Mesma régua para todas: a nota de cada pessoa é lida contra a faixa da própria função. Clique na nota para abrir a conta. Funções, cobertura e tendência usam os meses fechados.</span></div>';
    var fns=X.map(function(x){ return x.fn; }).filter(function(v,i,a){ return v&&a.indexOf(v)===i; });
    if (fns.length>1) h+='<div class="banner warn" style="margin:0 0 10px">Funções principais diferentes ('+fns.map(esc).join(' × ')+'): compare a <b>posição de cada uma na faixa da própria função</b>, não a nota direta.</div>';
    h+='<div class="tbl-wrap"><table class="tleft pa-cmp"><thead><tr><th></th>'+X.map(function(x){ return '<th>'+esc(x.nome)+'</th>'; }).join('')+'</tr></thead><tbody>'+
      PA_CRIT.map(function(c){ return '<tr><th scope="row">'+c[0]+'</th>'+X.map(function(x){ var go=c[2]?c[2](x):null; return '<td'+(go?' class="click"'+goAttr(go):'')+'>'+c[1](x)+'</td>'; }).join('')+'</tr>'; }).join('')+'</tbody></table></div>';
    // nota mês a mês
    var ms=A.B.ms.filter(function(m){ return m<=(state.periodo==='todos'?'9999':state.periodo); }).slice(-12), COR=['var(--c1)','var(--c2)','var(--c3)'];
    var series=X.map(function(x,i){ return {nome:x.nome, cor:COR[i], v:ms.map(function(m){ var y=A.V.PM[x.k+'|'+m]; var n=y?vgNota([y],VG_VAR[0]):null; return n?n.nota*100:null; })}; });
    h+='<div class="vz-grid" style="margin-top:12px">'+vzCard('Nota mês a mês','mês sem planilha ou com poucos dias ativos fica em branco',gLinhas(ms,series,{titulo:'Nota mês a mês',un:'%'}),'vz-wide')+'</div>';
    h+=paFotoBtn('Comparar · '+X.map(function(x){ return x.nome; }).join(' × ')+' · '+paPer(A.MS));
    el.innerHTML=h; }

  // ═════════ Caso de retenção (critérios fixos, últimos 6 meses fechados) ═════════
  function paCaso(A, ka, kb){
    var a=paLinhas(A,A.R6,ka,A.M), b=paLinhas(A,A.R6,kb,A.M), C=[];
    function cmp(va,vb,maior){ if (va==null||vb==null) return null; if (va===vb) return 0; return (maior?va>vb:va<vb)?1:-1; } // null = falta dado de uma das duas: não compara
    var ord={abaixo:0, normal:1, acima:2};
    var ea=a.p&&a.p.cat, eb=b.p&&b.p.cat;
    C.push({nome:'Entrega na função', o:'Nota contra a faixa da função, últimos 6 meses fechados', ta:a.p?vgCatTxt(a.p)+(a.p.R?' · '+vgPct(a.p.R.nota):''):'sem dado', tb:b.p?vgCatTxt(b.p)+(b.p.R?' · '+vgPct(b.p.R.nota):''):'sem dado', v:(ea&&eb)?cmp(ord[ea],ord[eb],true):null, ga:a.p&&a.p.R?{t:'vg',k:a.k}:null, gb:b.p&&b.p.R?{t:'vg',k:b.k}:null});
    var ti=0, tdc=0; A.R6.L.forEach(function(x){ if (!x.oculto){ ti+=x.inc; tdc+=x.docs; } }); var tEq=tdc?ti/tdc:null; // referência: a função (3+ pessoas) ou a equipe
    var ref=function(x){ return x.g&&x.g.length>=3&&x.g.taxa?{t:x.g.taxa,n:'a função'}:{t:tEq,n:'a equipe'}; }, fa=ref(a), fb=ref(b);
    var ra=a.p&&a.p.taxa!=null&&fa.t?a.p.taxa/fa.t:null, rb=b.p&&b.p.taxa!=null&&fb.t?b.p.taxa/fb.t:null, vq=(ra==null||rb==null)?null:0; if (ra!=null&&rb!=null&&Math.abs(ra-rb)>=0.25) vq=ra<rb?1:-1;
    C.push({nome:'Qualidade', o:'Inconformidade interna contra a da própria função (com menos de 3 na função, contra a equipe)', ta:ra==null?'sem dado':pct(a.p.taxa*100)+' · '+numBR(ra,1)+'× '+fa.n, tb:rb==null?'sem dado':pct(b.p.taxa*100)+' · '+numBR(rb,1)+'× '+fb.n, v:vq});
    var sa=a.mp?a.mp.so.length:0, sb=b.mp?b.mp.so.length:0;
    C.push({nome:'Risco de perder', o:'Funções que só ela cobre (matriz, 12 meses)', ta:sa?a.mp.so.join(', '):'nenhuma', tb:sb?b.mp.so.join(', '):'nenhuma', v:cmp(sa,sb,true)});
    var na=a.mp?a.mp.nf:0, nb=b.mp?b.mp.nf:0;
    C.push({nome:'Polivalência', o:'Funções exercidas regularmente (titular ou executa)', ta:String(na), tb:String(nb), v:(a.mp&&b.mp)?(Math.abs(na-nb)>=2?cmp(na,nb,true):0):null});
    C.push({nome:'Tendência', o:'Últimos 3 meses fechados × 3 anteriores', ta:a.td.txt, tb:b.td.txt, v:cmp(a.td.ord,b.td.ord,true)});
    var rob=function(x){ return x.p&&x.p.nVal?(x.p.estavel?'firme':x.p.nMesma+' de '+x.p.nVal+' critérios'):'—'; };
    C.push({nome:'Robustez', o:'A posição na faixa se mantém nos 5 critérios de cálculo (não soma ponto: diz se a Entrega é confiável)', ta:rob(a), tb:rob(b), v:null, info:true});
    var pa=C.filter(function(c){ return c.v===1; }), pb=C.filter(function(c){ return c.v===-1; }), em=C.filter(function(c){ return c.v===0; }), sd=C.filter(function(c){ return c.v==null&&!c.info; });
    // contexto (não pontua)
    function ctx(x){ var o=[]; if (x.p){ o.push(x.p.da+' dias ativos de '+x.p.du+' úteis'); if (x.p.apr.length) o.push('em aprendizagem: '+x.p.apr.join(', ')); }
      var f0=A.fech.slice(0,3), f1=A.fech.slice(3); if (x.p&&f0.length&&f1.length){ var r0=vgPessoas(A.V,f0), r1=vgPessoas(A.V,f1), p0=paPorK(r0)[x.k], p1=paPorK(r1)[x.k]; if (p0&&p1&&p0.fn&&p1.fn&&p0.fn!==p1.fn) o.push('mudou de função: '+p0.fn+' → '+p1.fn); }
      var s=pesSitDe(x.nome); if (s&&s.sit!=='ativa') o.push(s.sit); return o; }
    return {a:a, b:b, C:C, pa:pa, pb:pb, em:em, sd:sd, ca:ctx(a), cb:ctx(b)}; }
  function paCasoTexto(K){ var a=K.a.nome.split(' ')[0], b=K.b.nome.split(' ')[0], nm=function(L){ return L.map(function(c){ return c.nome.toLowerCase(); }).join(', '); };
    var t='Pelos critérios fixos, '+a+' fica à frente em '+K.pa.length+' de 5'+(K.pa.length?' ('+nm(K.pa)+')':'')+'; '+b+' em '+K.pb.length+(K.pb.length?' ('+nm(K.pb)+')':'')+'; empate em '+K.em.length+(K.sd.length?'; sem dado de uma das duas em '+K.sd.length+' ('+nm(K.sd)+')':'')+'.';
    var rob=K.C[5]; if (K.C[0].v!==0&&K.C[0].v!=null) t+=' A diferença na entrega é '+((rob.ta==='firme'&&rob.tb==='firme')?'firme nas duas (não muda com o critério).':'sensível ao critério em pelo menos uma das duas: leia com cuidado.');
    return t; }
  function renderCaso(){
    var el=$('tabPcs'); if (!el) return; var A=paBase(); if (!A){ paSemDados(el); return; }
    if (!A.fech.length){ paSemDados(el,'Precisa de pelo menos um mês fechado com Desempenho Usuário importado.'); return; }
    var L=paListaPessoas(A); if (L.length<2){ paSemDados(el,'Precisa de pelo menos 2 pessoas com dados.'); return; }
    var ok=function(v){ return L.some(function(x){ return x.k===v; }); };
    if (!ok(state.csA)) state.csA=L[0].k; if (!ok(state.csB)||state.csB===state.csA) state.csB=L.filter(function(x){ return x.k!==state.csA; })[0].k;
    var K=paCaso(A,state.csA,state.csB), per=paPer(A.fech);
    var h='<div class="search pa-top">'+paSel('csAIn',L,state.csA,'Pessoa A')+paSel('csBIn',L,state.csB,'Pessoa B')+'</div>';
    h+='<div class="sec-h"><h2>Caso de retenção · '+esc(per)+'</h2><span class="note">O painel monta o caso com critérios fixados antes e iguais para todos; quem decide é a gestão (LGPD art. 20: a pessoa pode pedir revisão de decisão tomada só por processamento automático). Período fixo: os 6 últimos meses fechados, qualquer que seja o Período do topo. Aprendizagem, mudança de função e afastamentos aparecem como contexto e não pontuam; atestado e falta nunca entram.</span></div>';
    if (K.a.fn&&K.b.fn&&K.a.fn!==K.b.fn) h+='<div class="banner warn" style="margin:0 0 10px">Funções principais diferentes ('+esc(K.a.fn)+' × '+esc(K.b.fn)+'): a entrega é lida contra a faixa de cada função.</div>';
    h+='<div class="pa-caso-txt" id="paCasoTxt">'+esc(paCasoTexto(K))+'</div>';
    h+='<div class="tbl-wrap"><table class="tleft pa-cmp pa-caso"><thead><tr><th>Critério</th><th>'+esc(K.a.nome)+'</th><th>'+esc(K.b.nome)+'</th><th>À frente</th></tr></thead><tbody>'+
      K.C.map(function(c){ return '<tr><th scope="row">'+c.nome+'<small>'+c.o+'</small></th><td'+(c.ga?' class="click"'+goAttr(c.ga):'')+(c.v===1?' style="font-weight:700"':'')+'>'+esc(c.ta)+'</td><td'+(c.gb?' class="click"'+goAttr(c.gb):'')+(c.v===-1?' style="font-weight:700"':'')+'>'+esc(c.tb)+'</td><td>'+(c.v==null?'<span class="mut">'+(c.info?'—':'não compara')+'</span>':c.v===1?esc(K.a.nome.split(' ')[0]):c.v===-1?esc(K.b.nome.split(' ')[0]):'empate')+'</td></tr>'; }).join('')+
      '<tr><th scope="row">Contexto<small>não pontua</small></th><td>'+esc(K.ca.join(' · ')||'—')+'</td><td>'+esc(K.cb.join(' · ')||'—')+'</td><td></td></tr></tbody></table></div>';
    if (podeEscrever) h+='<div class="panel pa-dec"><div class="sub-h" style="margin-top:0">Registrar a decisão</div><div class="pa-dec-g">'+
      '<label>Decisão<select id="csDec"><option value="">Escolha…</option><option>Manter '+esc(K.a.nome)+'</option><option>Manter '+esc(K.b.nome)+'</option><option>Manter as duas</option><option>Sem decisão agora (só registro do caso)</option></select></label>'+
      '<label>Quem decidiu<input type="text" id="csQuem" value="'+esc(nomeUsuario())+'" placeholder="Ex.: Oficial e Gestor da Qualidade"></label>'+
      '<label class="pa-dec-m">Motivo (obrigatório)<textarea id="csMot" rows="3" placeholder="O que pesou na decisão, além do caso montado pelo painel"></textarea></label></div>'+
      '<div class="ctl" style="margin-top:8px"><button class="btn primary sm" type="button" id="csGravar">Registrar decisão e fotografar</button><span class="hint" style="margin:0">Grava o caso como está agora (fotografia que não muda), com a decisão, o motivo, quem decidiu e quando.</span></div></div>';
    el.innerHTML=h; }
  function paCasoGravar(){ var dec=$('csDec').value, quem=$('csQuem').value.trim(), mot=$('csMot').value.trim();
    if (!dec){ toast('Escolha a decisão'); $('csDec').focus(); return; } if (!mot){ toast('Escreva o motivo'); $('csMot').focus(); return; }
    var A=paBase(), K=paCaso(A,state.csA,state.csB), corpo=paLimparClone($('tabPcs').cloneNode(true)); corpo.querySelectorAll('.pa-top').forEach(function(x){ x.remove(); }); var dv=corpo.querySelector('.pa-dec'); if (dv) dv.remove();
    paFotoGravar({tipo:'caso', titulo:'Caso de retenção · '+K.a.nome+' × '+K.b.nome, periodo:paPer(A.fech), decisao:dec, quem:quem, motivo:mot, texto:paCasoTexto(K), html:corpo.innerHTML}); }

  // ═════════ Conferência das fontes: Desempenho Usuário × Produção por Etapa ═════════
  function renderConferencia(){
    var el=$('tabPcf'); if (!el) return; var B=trBase(); if (!B.ms.length){ paSemDados(el); return; }
    var MS=trMesesPer(B); if (!MS.length){ paSemDados(el,'Sem Desempenho Usuário em '+esc(nomeMes(state.periodo))+'.'); return; }
    var D={}, DP={}, PL={}; B.L.forEach(function(l){ if (MS.indexOf(l.m)<0) return; D[l.fn]=(D[l.fn]||0)+l.q; var id=l.k+'|'+l.m+'|'+l.fn; (DP[id]=DP[id]||{k:l.k, nome:B.nomeK[l.k]||l.nome, m:l.m, fn:l.fn, d:0, p:0, L:[], X:[]}).d+=l.q; DP[id].L.push(l); PL[l.k+'|'+l.m]=1; });
    var P={}; eqExecs().forEach(function(x){ if (x.src!=='VHL'||MS.indexOf(x.m)<0) return; var k=chavePessoa(x.nome); if (!PL[k+'|'+x.m]) return; P[x.fn]=(P[x.fn]||0)+1; var id=k+'|'+x.m+'|'+x.fn; var o=DP[id]=DP[id]||{k:k, nome:x.nome, m:x.m, fn:x.fn, d:0, p:0, L:[], X:[]}; o.p++; o.X.push(x); });
    var fns=Object.keys(D).concat(Object.keys(P).filter(function(f){ return !D[f]; })).filter(function(f){ return (D[f]||0)+(P[f]||0)>=20; }).sort(function(a,b){ return ((D[b]||0)+(P[b]||0))-((D[a]||0)+(P[a]||0)); });
    var selo=function(d,p){ if (!d&&!p) return ''; var m=Math.max(d,p), df=m?Math.abs(d-p)/m:0; return df<=0.05?'<span class="pill good">confere</span>':df<=0.2?'<span class="pill warn">perto</span>':'<span class="pill crit">diverge</span>'; };
    var nOk=fns.filter(function(f){ var d=D[f]||0, p=P[f]||0; return Math.abs(d-p)<=0.05*Math.max(d,p); }).length;
    pnListasReg();
    var h='<div class="sec-h"><h2>Conferência das fontes · '+esc(paPer(MS))+'</h2><span class="note">Mesma pessoa, mês e função em duas fontes: quantidade de atos no <b>Desempenho Usuário</b> × execuções na <b>Produção por Etapa</b> do VHL. Só pessoas e meses com planilha do Desempenho. Confere = diferença de até 5%. Onde diverge muito, a contagem do VHL é diferente nas duas telas (a confirmar no VHL o que o Desempenho conta, por exemplo na Revisão de Exigência).</span></div>';
    h+='<div class="kpis" style="margin-bottom:12px">'+kpi('Funções que conferem',nOk+' de '+fns.length,'diferença de até 5% entre as duas fontes',nOk<fns.length?'':'')+kpi('Atos · Desempenho Usuário',Object.keys(D).reduce(function(s,f){ return s+D[f]; },0).toLocaleString('pt-BR'),'soma das planilhas')+kpi('Execuções · Produção por Etapa',Object.keys(P).reduce(function(s,f){ return s+P[f]; },0).toLocaleString('pt-BR'),'mesmas pessoas e meses')+'</div>';
    // por mês: a Produção por Etapa só traz documentos já finalizados, então o mês recente sempre fica abaixo até os documentos abertos finalizarem
    var DM={}, PM2={}; Object.keys(DP).forEach(function(id){ var o=DP[id]; DM[o.m]=(DM[o.m]||0)+o.d; PM2[o.m]=(PM2[o.m]||0)+o.p; });
    h+='<div class="sub-h">Por mês</div><div class="tbl-wrap" style="max-width:640px"><table class="tleft"><thead><tr><th>Mês</th><th class="num">Desempenho Usuário</th><th class="num">Produção por Etapa</th><th class="num">Produção ÷ Desempenho</th></tr></thead><tbody>'+
      MS.map(function(m){ var d=DM[m]||0, p=PM2[m]||0; return '<tr><td>'+esc(nomeMes(m))+'</td><td class="num">'+d.toLocaleString('pt-BR')+'</td><td class="num">'+p.toLocaleString('pt-BR')+'</td><td class="num">'+(d?pct(p/d*100):'—')+'</td></tr>'; }).join('')+'</tbody></table></div>'+
      '<p class="hint">A Produção por Etapa só traz documentos <b>já finalizados</b>: a execução de um documento ainda aberto entra quando ele finaliza. Por isso os meses mais recentes ficam abaixo e sobem com as próximas importações. Compare as funções nos meses antigos (escolha o mês no Período).</p>';
    h+='<div class="sub-h">Por função</div>';
    h+='<div class="tbl-wrap"><table class="tleft"><thead><tr><th>Função</th><th class="num">Desempenho Usuário</th><th class="num">Produção por Etapa</th><th class="num">Diferença</th><th>Selo</th></tr></thead><tbody>'+
      fns.map(function(f){ var d=D[f]||0, p=P[f]||0, LD=[], LP=[]; Object.keys(DP).forEach(function(id){ if (DP[id].fn===f){ LD=LD.concat(DP[id].L); LP=LP.concat(DP[id].X); } });
        return '<tr><td>'+esc(f)+'</td><td class="num'+(d?' click':'')+'"'+(d?goAttr(goLista(f+' · Desempenho Usuário','pnTrab',LD)):'')+'>'+d.toLocaleString('pt-BR')+'</td><td class="num'+(p?' click':'')+'"'+(p?goAttr(goLista(f+' · Produção por Etapa','pnExec',LP)):'')+'>'+p.toLocaleString('pt-BR')+'</td><td class="num">'+(d-p>0?'+':'')+(d-p).toLocaleString('pt-BR')+'</td><td>'+selo(d,p)+'</td></tr>'; }).join('')+'</tbody></table></div>';
    var div=Object.keys(DP).map(function(id){ return DP[id]; }).filter(function(o){ return Math.abs(o.d-o.p)>Math.max(5,0.2*Math.max(o.d,o.p)); }).sort(function(a,b){ return Math.abs(b.d-b.p)-Math.abs(a.d-a.p); });
    if (div.length) h+='<details class="met-sec" style="margin-top:10px"><summary>Maiores diferenças por pessoa e mês ('+div.length+')</summary><div class="tbl-wrap"><table class="tleft"><thead><tr><th>Pessoa</th><th>Mês</th><th>Função</th><th class="num">Desempenho</th><th class="num">Produção</th></tr></thead><tbody>'+
      div.slice(0,40).map(function(o){ return '<tr><td>'+esc(o.nome)+'</td><td>'+esc(nomeMes(o.m))+'</td><td>'+esc(o.fn)+'</td><td class="num'+(o.d?' click':'')+'"'+(o.d?goAttr(goLista(o.nome+' · '+o.fn+' · '+nomeMes(o.m),'pnTrab',o.L)):'')+'>'+o.d+'</td><td class="num'+(o.p?' click':'')+'"'+(o.p?goAttr(goLista(o.nome+' · '+o.fn+' · '+nomeMes(o.m),'pnExec',o.X)):'')+'>'+o.p+'</td></tr>'; }).join('')+'</tbody></table></div></details>';
    el.innerHTML=h; }

  // ═════════ Fotografias para reunião ═════════
  // um retrato datado da tela, com período, pessoas fora da comparação e versão; não muda mais (fica em fotos/)
  function paFotoBtn(titulo){ return podeEscrever?'<div class="ctl pa-foto"><button type="button" class="btn sm" data-pafoto="'+esc(titulo)+'">Congelar para reunião</button><span class="hint" style="margin:0">Grava um retrato datado desta tela, que não muda depois.</span></div>':''; }
  function paLimparClone(c){ c.querySelectorAll('.txt-q,.kpi-q').forEach(function(x){ x.remove(); }); c.querySelectorAll('.txt-enc,.kpi-f').forEach(function(x){ x.hidden=false; x.removeAttribute('hidden'); }); return c; }
  function paLimparHTML(h){ return String(h).replace(/\sdata-go="\d+"/g,'').replace(/\sdata-goh="[^"]*"/g,'').replace(/<button[^>]*data-pafoto[^>]*>.*?<\/button>/g,''); }
  function paFotoGravar(o){
    var id=new Date().toISOString().replace(/[-:T.Z]/g,'').slice(0,14)+'-'+Math.random().toString(36).slice(2,6);
    var dados=Object.assign({em:new Date().toISOString(), por:nomeUsuario(), versao:APP_VERSAO, periodoTopo:state.periodo, serventia:typeof selNome==='function'?selNome():'', fora:Object.keys(state.eqOcl||{}).map(function(k){ return state.eqOcl[k]; }), regras:(state.apur&&state.apur.hist||[]).length}, o);
    dados.html=paLimparHTML(dados.html||''); state.fotos=state.fotos||{}; state.fotos[id]=dados;
    var fim=function(){ toastDesfazer('Fotografia gravada · '+o.titulo,function(){ delete state.fotos[id]; if (dbPronto) db.doc('fotos/'+id).delete().catch(function(){}); if (state.aba==='fot') renderFotos(); toast('Fotografia apagada'); }); if (state.aba==='fot') renderFotos(); };
    if (!dbPronto){ fim(); return; }
    db.doc('fotos/'+id).set(dados).then(fim).catch(function(){ toast('Não consegui gravar a fotografia'); }); }
  function paFotoDaTela(t){ var pg=t.closest('#tabPfi,#tabPcm,#tabPmt,#tabDes,#tabPcs,#tabPcf'); if (!pg) return; var c=paLimparClone(pg.cloneNode(true)); c.querySelectorAll('.pa-foto,.pa-dec,select,.pa-top,#desAbas').forEach(function(x){ x.remove(); });
    paFotoGravar({tipo:pg.id.replace('tab','').toLowerCase(), titulo:t.dataset.pafoto, html:c.innerHTML}); }
  function paFotosCarregar(){ if (state.fotosCarregando) return; state.fotosCarregando=true;
    var p=(window.nuvem&&window.nuvem.lerColecao)?window.nuvem.lerColecao('fotos'):Promise.resolve([]);
    p.then(function(rows){ state.fotos=state.fotos||{}; (rows||[]).forEach(function(r){ state.fotos[r.id]=r.dados; }); state.fotosLidas=true; state.fotosCarregando=false; if (state.aba==='fot') renderFotos(); })
     .catch(function(){ state.fotosCarregando=false; state.fotosLidas=true; if (state.aba==='fot') renderFotos(); }); }
  function renderFotos(){
    var el=$('tabFot'); if (!el) return; if (!state.fotosLidas){ el.innerHTML='<div class="empty">Carregando as fotografias…</div>'; paFotosCarregar(); return; }
    var F=state.fotos||{}, ids=Object.keys(F).sort().reverse();
    var h='<div class="sec-h"><span class="note">Retratos datados das telas, gravados com "Congelar para reunião" (Pessoas e Visão geral) ou ao registrar a decisão de um caso. Não mudam quando a regra ou os dados mudam: mostram o que foi apresentado.</span></div>';
    if (!ids.length){ el.innerHTML=h+'<div class="empty"><b>Nenhuma fotografia ainda</b>Use "Congelar para reunião" nas telas de Pessoas.</div>'; return; }
    var sel=F[state.fotoSel]?state.fotoSel:null;
    h+='<div class="tbl-wrap"><table class="tleft"><thead><tr><th>Quando</th><th>O quê</th><th>Por</th><th>Decisão</th><th></th></tr></thead><tbody>'+ids.map(function(id){ var f=F[id];
      return '<tr class="click'+(id===sel?' sel':'')+'" data-fotosel="'+esc(id)+'" tabindex="0"><td>'+fmtData(String(f.em).slice(0,10))+' '+String(f.em).slice(11,16)+'</td><td>'+esc(f.titulo||'')+'</td><td>'+esc(f.por||'')+'</td><td>'+esc(f.decisao||'—')+'</td><td class="nw"><button type="button" class="btn sm" data-fotobaixar="'+esc(id)+'">Baixar</button></td></tr>'; }).join('')+'</tbody></table></div>';
    if (sel){ var f=F[sel]; h+='<div class="panel pa-foto-v" style="margin-top:12px"><div class="sec-h"><h2>'+esc(f.titulo||'')+'</h2><button type="button" class="btn sm" data-fotosel="">Fechar</button></div>'+
      '<p class="hint">Gravada em '+fmtData(String(f.em).slice(0,10))+' '+String(f.em).slice(11,16)+' por '+esc(f.por||'—')+' · versão '+esc(f.versao||'')+' · Período do topo: '+esc(f.periodoTopo==='todos'?'todos os meses':nomeMes(f.periodoTopo||''))+(f.periodo?' · período do caso: '+esc(f.periodo):'')+(f.fora&&f.fora.length?' · fora da comparação: '+esc(f.fora.join(', ')):'')+'</p>'+
      (f.decisao?'<div class="banner" style="margin:0 0 10px"><b>Decisão:</b> '+esc(f.decisao)+' · <b>quem decidiu:</b> '+esc(f.quem||'—')+'<br><b>Motivo:</b> '+esc(f.motivo||'')+'</div>':'')+
      '<div class="pa-foto-c" inert>'+(f.html||'')+'</div></div>'; }
    el.innerHTML=h; }
  function paFotoBaixar(id){ var f=(state.fotos||{})[id]; if (!f) return;
    var css=Array.prototype.map.call(document.querySelectorAll('style'),function(s){ return s.textContent; }).join('\n');
    var doc='<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>'+esc(f.titulo||'Fotografia')+'</title><style>'+css+'</style></head><body style="padding:20px"><h1 style="font-size:20px">'+esc(f.titulo||'')+'</h1><p class="hint">Painel SGQ · CRCO · gravada em '+esc(String(f.em).slice(0,16).replace('T',' '))+' por '+esc(f.por||'')+' · versão '+esc(f.versao||'')+'</p>'+(f.decisao?'<p><b>Decisão:</b> '+esc(f.decisao)+' · <b>quem decidiu:</b> '+esc(f.quem||'')+'<br><b>Motivo:</b> '+esc(f.motivo||'')+'</p>':'')+(f.html||'')+'</body></html>';
    var b=new Blob([doc],{type:'text/html'}), a=document.createElement('a'); a.href=URL.createObjectURL(b); a.download='fotografia-'+id+'.html'; document.body.appendChild(a); a.click(); setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); },500); }

  // ═════════ cliques e trocas ═════════
  function paClique(t){ var d=t.dataset||{};
    if (d.pafoto) return paFotoDaTela(t), true;
    if (d.pmtodas!=null){ state.pmTodas=d.pmtodas==='1'; renderMatriz(); return true; }
    if (d.pacmpcom){ state.pcA=d.pacmpcom; state.pcB=''; irAba('pcm'); return true; }
    if (d.paver==='rel'){ goGuardar(); state.relSel=semAc(d.nome); irAba('rel'); return true; }
    if (t.id==='csGravar') return paCasoGravar(), true;
    if (d.fotobaixar!=null) return paFotoBaixar(d.fotobaixar), true;
    var fs=t.closest&&t.closest('[data-fotosel]'); if (fs){ state.fotoSel=fs.dataset.fotosel||null; renderFotos(); return true; }
    return false; }
  function paMudou(t){ var id=t.id;
    if (id==='pfSelIn'){ state.pfSel=t.value; state.vgCmp=null; renderFicha(); return true; }
    if (id==='pcAIn'||id==='pcBIn'||id==='pcCIn'){ state[{pcAIn:'pcA',pcBIn:'pcB',pcCIn:'pcC'}[id]]=t.value; renderComparar(); return true; }
    if (id==='csAIn'||id==='csBIn'){ state[id==='csAIn'?'csA':'csB']=t.value; renderCaso(); return true; }
    return false; }
