/* Painel SGQ · CRCO — js/relatorios.js (0.12.0: o app.js foi dividido por página; tudo continua no mesmo escopo global, na ordem do index.html) */
(window.PAINEL_ARQ=window.PAINEL_ARQ||{})['js/relatorios.js']='0.27.0';
  function nomePeriodo(){ if (state.periodo!=='todos') return nomeMes(state.periodo); var m=Object.keys(state.docs).sort(); return m.length?nomeMes(m[0])+' a '+nomeMes(m[m.length-1]):'todos os meses'; }
  function mesesPeriodo(){ return Object.keys(state.docs).sort().filter(function(m){ return state.periodo==='todos'||state.periodo===m; }); }
  // produção detalhada por pessoa (chave = nome sem acento, para casar VHL e Tri7)
  function prodPessoas(){
    var P={};
    mesesPeriodo().forEach(function(m){ var pr=(state.docs[m].raw||{}).producao||{};
      Object.keys(pr).forEach(function(nome){ var v=pr[nome], k=semAc(nome), x=P[k]=P[k]||{nome:nome,docs:0,et:{},pz:{},mes:{}};
        var d=typeof v==='number'?v:v.d; x.docs+=d; x.mes[m]=(x.mes[m]||0)+d;
        if (v&&v.e) Object.keys(v.e).forEach(function(e){ x.et[e]=(x.et[e]||0)+v.e[e]; });
        if (v&&v.z) Object.keys(v.z).forEach(function(e){ x.pz[e]=(x.pz[e]||0)+v.z[e]; }); }); });
    return P;
  }
  // ═════════ v1.9.1: produção média diária (dias ativos) ═════════
  // Dia ativo = dia útil em que a pessoa teve ao menos 1 execução na Produção por Etapa (dados brutos etapa-AAAA-MM, todas as execuções).
  // Documentos = códigos distintos que a pessoa trabalhou no mês (mesma regra do total do VHL). Segue o filtro Serventia.
  function etapasBrutas(){
    if (state.etB) return state.etB;
    if (!state.etBCarr && window.nuvem && dbPronto){ state.etBCarr=true;
      window.nuvem.lerColecao('brutos').then(function(rows){ var E=[], info={};
        rows.forEach(function(x){ if (x.id.indexOf('prazo-')===0) brutoDecod(x.dados).forEach(function(o){ info[String(o['codigo'])]={t:String(o['tipo de documento']||'').trim(), nat:String(o['natureza']||'').trim()}; }); });
        rows.forEach(function(x){ if (x.id.indexOf('etapa-')!==0) return; brutoDecod(x.dados).forEach(function(o){ var c=String(o['codigo']==null?'':o['codigo']).trim(), d=Motor.paraDia(o['data execucao'],window.XLSX?XLSX.SSF:null), rp=pesNome(String(o['responsavel']||'').trim(),'vhl'); if (!c||d==null||!rp) return; var i=info[c]||{}; E.push({c:c,d:d,rp:rp,t:i.t||null,nat:i.nat||''}); }); });
        state.etB=E; state._pd=null; render(); if (state.aba==='rel') renderRel(); })
      .catch(function(){ state.etBCarr=false; toast('Não consegui ler as execuções para a média diária'); }); }
    return null;
  }
  function execOk(x){ var modo=svModo(); if (modo==='todas') return true; var t=x.t?semAc(x.t):'';
    if (!t) return modo==='ri' && /^\d+$/.test(x.c); // protocolo ainda não finalizado: código só de números = RI
    if (modo==='ri') return t==='ri'; if (modo==='cert') return t==='certidao - ri'; return docOk({t:x.t, nat:x.nat}); }
  function prodDiaria(){
    var E=etapasBrutas(); if (!E) return null;
    var chave=[svModo(),svAtual(),subAtual(),E.length,(state.extras||[]).length,Object.keys(state.senhas).length,Object.keys(state.cert).length,state.andVer||0].join('|'); if (state._pd&&state._pd.k===chave) return state._pd.v;
    var P={};
    E.forEach(function(x){ if (!execOk(x)) return; var m=Motor.isoDeDia(x.d).slice(0,7), k=semAc(x.rp), p=P[k]=P[k]||{nome:x.rp,m:{}}, q=p.m[m]=p.m[m]||{docs:{},dias:{}};
      q.docs[x.c]=1; });
    Object.keys(P).forEach(function(k){ var ck=chavePessoa(P[k].nome); Object.keys(P[k].m).forEach(function(m){ var q=P[k].m[m]; q.nd=Object.keys(q.docs).length; q.na=Math.max(1,diasAtivosN(ck,m)); delete q.docs; delete q.dias; }); }); // 0.24.0: dia ativo = DIA_ATIVO_DEF
    state._pd={k:chave,v:P}; return P;
  }
  function mesesProd(){ var o={}; [state.docs,state.serv].forEach(function(x){ Object.keys(x||{}).forEach(function(m){ if (state.periodo==='todos'||state.periodo===m) o[m]=1; }); }); return Object.keys(o).sort(); }
  function mediaDiaria(k, meses){ var P=prodDiaria(); if (!P) return null; var p=P[k], X=0, Y=0, Z=0;
    (meses||mesesProd()).forEach(function(m){ Z+=duMes(m); var q=p&&p.m[m]; if (q){ X+=q.nd; Y+=q.na; } });
    return {X:X, Y:Y, Z:Z, W:Y?X/Y:null}; }
  function fraseDiaria(r, nMeses){ if (!r) return '<span class="mut">calculando a média diária (lendo as execuções do VHL)…</span>';
    if (!r.X) return '<span class="mut">Sem execuções na Produção por Etapa nesta serventia e período.</span>';
    return '<b>'+r.X.toLocaleString('pt-BR')+'</b> documentos em <b>'+r.Y+'</b> dias ativos (de '+r.Z+' dias úteis '+(nMeses>1?'no período':'do mês')+') → média de <b>'+numBR(r.W,1)+'</b> documentos por dia ativo'; }
  // mediana da equipe por dia ativo no mês (pessoas com 5+ dias ativos)
  function equipeDiaria(m){ var P=prodDiaria(); if (!P) return null; var v=[]; Object.keys(P).forEach(function(k){ if (typeof eqOculto==='function'&&(eqOculto(k)||eqEmApr(k))) return; var q=P[k].m[m]; if (q&&q.na>=5) v.push(q.nd/q.na); }); return v.length?mediana(v):null; }

  function relDados(){
    var P=prodPessoas(), meses=mesesPeriodo(), recs=incRecs().filter(function(r){ return atrAtual()!=='RI'?incOk(r):(state.incSetor==='todos'||r.t==='RI'); });
    if (atrAtual()!=='RI' && svModo()!=='todas'){ P={}; selDocs().forEach(function(d){ var vist={}; d.ets.forEach(function(x){ if (!x.rp) return; var k=semAc(x.rp), q=P[k]=P[k]||{nome:x.rp,docs:0,et:{},pz:{},mes:{}}; if (!vist[k]){ vist[k]=1; q.docs++; q.mes[d.mes]=(q.mes[d.mes]||0)+1; } q.et[x.et]=(q.et[x.et]||0)+1; q.pz[x.et]=(q.pz[x.et]||0)+x.pz; }); }); }
    var I={}; recs.forEach(function(r){ var k=semAc(r.r), x=I[k]=I[k]||{nome:r.r,recs:[]}; x.recs.push(r); });
    var cr=certCalc(certRecs()), C={}; cr.forEach(function(c){ if (!c.u || c.u==='Tri7') return; var k=semAc(c.u), x=C[k]=C[k]||{nome:c.u,recs:[]}; x.recs.push(c); });
    var S={}, LS=senhasLista(state.periodo).filter(senhaOk); if (LS.length){ var ANs=atendAnalise(LS); Object.keys(ANs.P).forEach(function(n){ S[semAc(n)]=ANs.P[n]; }); }
    var T={}; if (Object.keys(state.andam).length){ var TP=tri7PorPessoa(); Object.keys(TP).forEach(function(l){ if (!l||l==='TRI7') return; var n=nomeLogin(l), k=semAc(n), x=TP[l]; if (T[k]){ ['PN','PA','RA','REx','NE','CI','AP','SG'].forEach(function(c){ T[k][c]+=x[c]; }); T[k].tEx=T[k].tEx.concat(x.tEx); T[k].tRv=T[k].tRv.concat(x.tRv); } else { T[k]=Object.assign({},x,{nome:n}); } }); }
    var pessoas={}; [P,I,C,S,T].forEach(function(o){ Object.keys(o).forEach(function(k){ if (!pessoas[k]) pessoas[k]=(P[k]||o[k]).nome; }); });
    // médias da equipe: taxa e dias por etapa
    var tn=0, td=0; Object.keys(P).forEach(function(k){ if (P[k].docs>=MIN_PROD){ td+=P[k].docs; tn+=((I[k]||{}).recs||[]).filter(incConta).length; } });
    var eqE={}, eqZ={}; Object.keys(P).forEach(function(k){ Object.keys(P[k].et).forEach(function(e){ eqE[e]=(eqE[e]||0)+P[k].et[e]; eqZ[e]=(eqZ[e]||0)+(P[k].pz[e]||0); }); });
    var itR=Object.keys(P).filter(function(k){ return P[k].docs>=MIN_PROD; }).map(function(k){ return {key:k, n:P[k].docs, k:((I[k]||{}).recs||[]).filter(incConta).length}; });
    funilTaxa(itR); var LT={}; itR.forEach(function(x){ LT[x.key]=x.lt; });
    var eqT={tEx:est([].concat.apply([],Object.keys(T).map(function(k){return T[k].tEx;}))), tRv:est([].concat.apply([],Object.keys(T).map(function(k){return T[k].tRv;})))};
    return {LT:LT,P:P,I:I,C:C,S:S,T:T,eqT:eqT,pessoas:pessoas,meses:meses,taxaEq:td?tn/td*100:null,eqE:eqE,eqZ:eqZ};
  }
  function chaveFeedback(k){ return idDoc(k.replace(/\s+/g,'-')+'_'+state.periodo); }
  function cabecalhoRel(titulo, sub){
    return '<header><div><div class="org">CRCO · Sistema de Gestão da Qualidade</div><h1>'+esc(titulo)+'</h1><div class="rmeta">'+sub+'</div></div>'+
      '<div class="rmeta" style="text-align:right">Emitido em '+new Date().toLocaleDateString('pt-BR')+'<br>Fontes: VHL (Produção, Inconformidades, Senhas) e Tri7</div></header>';
  }
  function tilesRel(arr){ return '<div class="tiles">'+arr.map(function(t){ return '<div class="tile"><span>'+t[0]+'</span><b>'+t[1]+'</b>'+(t[2]?'<div class="rmeta">'+t[2]+'</div>':'')+'</div>'; }).join('')+'</div>'; }
  function tabErros(recs){
    var c={}; recs.forEach(function(r){ var k=catDe(r); c[k]=(c[k]||0)+1; }); var ks=Object.keys(c).sort(function(a,b){return c[b]-c[a];}), mx=ks.length?c[ks[0]]:1;
    return '<table><thead><tr><th>Erro</th><th class="n">Qtd.</th><th class="n">%</th><th style="width:28%"></th></tr></thead><tbody>'+ks.map(function(k){ return '<tr><td>'+esc(k)+'</td><td class="n">'+c[k]+'</td><td class="n">'+pct(c[k]/recs.length*100)+'</td><td><div class="bar" style="width:'+(c[k]/mx*100).toFixed(0)+'%"></div></td></tr>'; }).join('')+'</tbody></table>';
  }
  function corpoPessoa(k, D, paraImprimir){
    var p=D.P[k]||{nome:D.pessoas[k],docs:0,et:{},pz:{},mes:{}}, nome=D.pessoas[k];
    var inc=((D.I[k]||{}).recs)||[], incProd=inc.filter(incConta), ext=inc.filter(function(r){return grupoDe(r)==='E';}).length;
    var taxa=p.docs>=MIN_PROD?incProd.length/p.docs*100:null, cer=((D.C[k]||{}).recs)||[];
    var cerCalc=cer.filter(function(c){return !c.intim;}), cerOk=cerCalc.filter(function(c){return c.ok;}).length;
    var totEt=Object.keys(p.et).reduce(function(s,e){return s+p.et[e];},0);
    var h=cabecalhoRel('Relatório de desempenho — qualidade e produção','<b>'+esc(nome)+'</b> · Período: '+nomePeriodo()+' · Serventia: '+esc(selNome())+(atrAtual()==='RI'?' · inconformidades do RI':''));
    var msP=mesesProd(), md=mediaDiaria(k,msP);
    var eqMd=(function(){ var P=prodDiaria(); if (!P) return null; var v=[]; Object.keys(P).forEach(function(j){ if (eqOculto(j)) return; var r=mediaDiaria(j,msP); if (r&&r.Y>=5) v.push(r.W); }); return v.length?mediana(v):null; })();
    h+='<h2>Resumo</h2>'+(md&&md.X?'<div class="dest"><div class="t1"><span>Média por dia com atividade</span><b>'+numBR(md.W,1)+'</b><small>documentos por dia'+(eqMd!=null?' · equipe (mediana) '+numBR(eqMd,1):'')+'</small></div><div><span>Dias com atividade no VHL</span><b>'+md.Y+'</b><small>de '+md.Z+' dias úteis · mede atividade no sistema, não presença</small></div></div>':'')+'<div class="diaria">'+fraseDiaria(md,msP.length)+'</div>'+tilesRel([
      (md&&md.X?['Documentos trabalhados',md.X.toLocaleString('pt-BR'),'no VHL · '+esc(selNome())]:['Documentos trabalhados',p.docs||'—','no VHL']),['Execuções de etapa',totEt||'—',Object.keys(p.et).length+' tipos de etapa'],
      ['Taxa de inconformidade',taxa==null?'—':pct(taxa),(taxa==null?'':incProd.length+' internas ÷ '+p.docs+' documentos · ')+'média da equipe '+pct(D.taxaEq)+(function(){ var lt=taxa!=null?D.LT[k]:null; return lt?' · '+lt.txt+' (esperado ≈ '+Math.round(lt.esp)+', normal até '+lt.hi+')':''; })()],['Inconformidades',inc.length,(inc.length-ext)+' internas · '+ext+' externas']])+
      (cer.length?'<div style="height:8px"></div>'+tilesRel([['Certidões emitidas',cer.length,'Tri7'],['No prazo',cerCalc.length?pct(cerOk/cerCalc.length*100):'—',cerCalc.length?cerOk+' de '+cerCalc.length:'fluxo de intimação'],['Mediana',fmtH(mediana(cer.map(function(c){return c.hu;}))),'horas úteis'],['Fora do prazo',cerCalc.length-cerOk,'']]):'')+
      (function(){ var t=D.T&&D.T[k]; if (!t) return ''; var a=[], ex=est(t.tEx), rv=est(t.tRv);
        if (t.PN+t.PA) a.push(['Entradas (prenotou)',t.PN+t.PA,'Tri7']); if (t.RA) a.push(['Re-análises recebidas',t.RA,'título voltou']);
        if (t.REx) a.push(['Exigências redigidas',t.REx,ex.n>=MIN_N?'mediana '+fmtH(ex.mediana)+' após a entrada · equipe '+fmtH(D.eqT.tEx.mediana):'viraram nota de exigência']);
        if (t.NE) a.push(['Notas de exigência emitidas',t.NE,rv.n>=MIN_N?'revisão em '+fmtH(rv.mediana)+' (mediana) · equipe '+fmtH(D.eqT.tRv.mediana):'revisão']);
        if (t.CI+t.AP) a.push(['Custas informadas',t.CI+t.AP,'ONR']); if (t.SG) a.push(['Registros (selos gerados)',t.SG,'protocolos de RI']);
        return a.length?'<div style="height:8px"></div>'+tilesRel(a.slice(0,4))+(a.length>4?'<div style="height:8px"></div>'+tilesRel(a.slice(4)):''):''; })()+
      (taxa==null&&inc.length?'<p class="nota">Taxa não calculada: menos de '+MIN_PROD+' documentos da pessoa no VHL no período.</p>':'');
    // mês a mês
    if (msP.length>1 || D.meses.length>1){ var PDk=(prodDiaria()||{})[k];
      h+='<h2>Mês a mês</h2><table><thead><tr><th>Mês</th><th class="n">Documentos</th><th class="n">Dias ativos</th><th class="n">Dias úteis</th><th class="n">Por dia ativo</th><th class="n">Equipe (mediana)</th><th class="n">Internas</th><th class="n">Taxa</th>'+(cer.length?'<th class="n">Certidões</th>':'')+'</tr></thead><tbody>'+
      msP.map(function(m){ var q=PDk&&PDk.m[m], d=q?q.nd:(p.mes[m]||0), n=inc.filter(function(r){return r.d.slice(0,7)===m&&grupoDe(r)==='I';}).length, c=cer.filter(function(x){return x.mes===m;}).length, eq=equipeDiaria(m);
        return '<tr><td>'+nomeMes(m)+'</td><td class="n">'+(d||'—')+'</td><td class="n">'+(q?q.na:'—')+'</td><td class="n">'+duMes(m)+'</td><td class="n"><b>'+(q&&q.na?numBR(q.nd/q.na,1):'—')+'</b></td><td class="n">'+(eq==null?'—':numBR(eq,1))+'</td><td class="n">'+n+'</td><td class="n">'+(d>=10?pct(n/d*100):'—')+'</td>'+(cer.length?'<td class="n">'+c+'</td>':'')+'</tr>'; }).join('')+'</tbody></table>'+
      '<p class="nota">Dia ativo = '+DIA_ATIVO_DEF+'. Por dia ativo = documentos ÷ dias ativos (quem tirou férias tem a média só dos dias trabalhados). Equipe = mediana das pessoas com 5+ dias ativos no mês.</p>'; }
    h+=relGraficos(k, D, p, inc);
    h+=aprRelHTML(k); // 0.18.0
    h+=eqRelHTML(k); // 0.15.0: funções, comparação com os colegas, mês a mês, qualidade por função e "só você faz"
    // produção por etapa com tempo
    var ets=Object.keys(p.et).sort(function(a,b){return p.et[b]-p.et[a];});
    h+='<h2>Produção por etapa</h2>'+(ets.length?'<table><thead><tr><th>Etapa</th><th class="n">Execuções</th><th class="n">%</th><th class="n">Dias úteis na etapa (média)</th><th class="n">Média da equipe</th><th class="n">Meta</th></tr></thead><tbody>'+
      ets.map(function(e){ var med=p.pz[e]!=null?p.pz[e]/p.et[e]:null, eq=D.eqE[e]?D.eqZ[e]/D.eqE[e]:null, meta=etapaMeta(e), cls=meta!=null&&med!=null&&p.et[e]>=MIN_N?(med>meta?' class="n acima"':' class="n bom"'):' class="n"';
        return '<tr><td>'+esc(e)+'</td><td class="n">'+p.et[e]+'</td><td class="n">'+pct(p.et[e]/totEt*100)+'</td><td'+cls+'>'+(med==null?'—':f1(med))+'</td><td class="n">'+(eq==null?'—':f1(eq))+'</td><td class="n">'+(meta==null?'—':f1(meta))+'</td></tr>'; }).join('')+
      '<tr><td><b>Total</b></td><td class="n"><b>'+totEt+'</b></td><td></td><td></td><td></td><td></td></tr></tbody></table><p class="nota">Dias úteis na etapa = tempo que o documento ficou na etapa até a pessoa executar. Verde dentro da meta pelo nome da etapa, vermelho acima.</p>':'<p class="nota">Sem etapas registradas no VHL no período.</p>');
    if (D.S&&D.S[k]) h+='<h2>Atendimento no balcão (senhas)</h2>'+atendPessoaHTML(D.S[k],null,true);
    // erros
    h+='<h2>Inconformidades por tipo de erro</h2>'+(inc.length?tabErros(inc):'<p class="nota">Nenhuma inconformidade registrada no período.</p>');
    if (inc.length) h+='<h2>Registros de inconformidade</h2><table><thead><tr><th>Data</th><th>Documento</th><th>Tipo</th><th>Erro</th><th>Observação</th></tr></thead><tbody>'+
      inc.slice().sort(function(a,b){return a.d<b.d?-1:1;}).map(function(r){ return '<tr><td>'+fmtData(r.d)+'</td><td>'+esc(r.c)+' '+esc(r.t)+'</td>'+(grupoDe(r)==='E'?'<td class="ext">Externo</td>':'<td>Interno</td>')+'<td>'+esc(catDe(r))+'</td><td>'+esc(r.o)+'</td></tr>'; }).join('')+'</tbody></table>';
    // devolutiva
    var fb=state.feedback[chaveFeedback(k)]||{}, campos=[['fortes','Pontos fortes'],['atencao','Pontos de atenção'],['acoes','Ações combinadas e prazo']];
    var outrosP=Object.keys(state.feedback).filter(function(id){ var f=state.feedback[id]; return f&&f.periodo&&f.periodo!==state.periodo&&semAc(f.pessoa||'')===k&&(f.fortes||f.atencao||f.acoes); }).map(function(id){ var p=state.feedback[id].periodo; return p==='todos'?'todos os meses':nomeMes(p); });
    var sug=(!paraImprimir&&!(fb.fortes||fb.atencao))?eqSugestoes(eqPessoa(k)):{fortes:'',atencao:''};
    h+='<h2>Devolutiva · '+esc(nomePeriodo())+'</h2>'+(outrosP.length&&!paraImprimir?'<p class="nota">Há devolutiva salva desta pessoa também em: '+esc(outrosP.join(', '))+'. Mude o Período, no topo, para ver.</p>':'')+campos.map(function(c){ var v=fb[c[0]]||'';
      var sv=!v&&sug[c[0]]?sug[c[0]]:''; return '<div class="dlab">'+c[1]+(sv?'<span class="sug">sugerido pelo painel · revise antes de salvar</span>':'')+'</div>'+(paraImprimir?'<div class="devol'+(v?'':' vazio')+'">'+esc(v)+'</div>':'<textarea data-fb="'+c[0]+'" aria-label="'+c[1]+'" rows="'+(sv?Math.min(8,sv.split('\n').length+1):3)+'" placeholder="Escreva aqui — sai no relatório impresso">'+esc(v||sv)+'</textarea>'); }).join('')+
      '<div class="ass"><div>Gestor(a) responsável</div><div>'+esc(nome)+' — ciência em ___/___/______</div></div>';
    return h;
  }
  // gráficos do relatório individual (tela e arquivo impresso)
  function relGraficos(k, D, p, inc){
    var msP=eqUlt6(), PDk=(prodDiaria()||{})[k], g=[]; // 0.15.0: tendência sempre com os últimos 6 meses, mesmo com um mês escolhido
    var parc=msP.map(function(m){ var q=PDk&&PDk.m[m]; return !!(q&&q.na&&q.na<duMes(m)/2); });
    function card(t,sub,corpo,w){ return '<div class="rg'+(w?' w':'')+'"><b>'+esc(t)+'</b>'+(sub?'<small>'+sub+'</small>':'')+corpo+'</div>'; }
    var nome=D.pessoas[k];
    if (msP.length>1){
      g.push(card('Documentos por mês','documentos trabalhados no VHL · últimos 6 meses',gLinhas(msP,[{nome:nome,cor:'var(--c1)',vazio:parc,v:msP.map(function(m){ var q=PDk&&PDk.m[m]; return q?q.nd:(p.mes[m]||null); }),extra:msP.map(function(m){ var q=PDk&&PDk.m[m]; return q?q.na+' dias ativos':''; })}],{titulo:'Documentos por mês',zero:true,area:true,irMes:'rel',W:420,H:200})));
      if (PDk) g.push(card('Média por dia com atividade','pessoa × mediana da equipe · ponto vazado = mês parcial (menos da metade dos dias úteis com atividade no VHL): compare pela média',gLinhas(msP,[{nome:String(nome).split(' ')[0],cor:'var(--c1)',vazio:parc,v:msP.map(function(m){ var q=PDk.m[m]; return q&&q.na?q.nd/q.na:null; }),extra:msP.map(function(m){ var q=PDk.m[m]; return q?q.nd+' docs em '+q.na+' de '+duMes(m)+' dias':''; })},{nome:'Equipe',cor:'var(--c2)',tracejado:true,v:msP.map(equipeDiaria)}],{titulo:'Média por dia ativo',zero:true,irMes:'rel',W:420,H:200})));
    }
    var ets=Object.keys(p.et||{}).sort(function(a,b){ return p.et[b]-p.et[a]; }).slice(0,10);
    if (ets.length) g.push(card('Execuções por etapa','as 10 etapas que mais fez',gBarrasH(ets.map(function(e){ var med=p.pz&&p.pz[e]!=null?p.pz[e]/p.et[e]:null, eq=D.eqE[e]?D.eqZ[e]/D.eqE[e]:null; return {nome:e, v:p.et[e], extra:(med!=null?'média '+numBR(med,1)+' d.u. na etapa':'')+(eq!=null?' · equipe '+numBR(eq,1):'')}; }))));
    if (svModo()!=='cert'){ var X=desExecs(), ms=mesesPeriodo().concat(Object.keys(state.serv)).filter(function(m,i,a){ return a.indexOf(m)===i&&(state.periodo==='todos'||state.periodo===m); }), cel={};
      X.forEach(function(x){ if (x.k!==k||x.dv==null||ms.indexOf(x.m)<0) return; (cel[x.et]=cel[x.et]||[]).push(x.dv); });
      var ek=Object.keys(cel).filter(function(e){ return cel[e].length>=5; }).sort(function(a,b){ return cel[b].length-cel[a].length; }).slice(0,10);
      if (ek.length) g.push(card('Tempo na etapa × equipe','d.u. a mais (+) ou a menos (−) que a equipe na mesma etapa e natureza · 5+ execuções',gBarrasH(ek.map(function(e){ var d=media(cel[e]); return {nome:e, v:Math.round(d*100)/100, cor:d>DES_MIN_DIF?'var(--c2)':'var(--c1)', extra:cel[e].length+' execuções'}; }).sort(function(a,b){ return b.v-a.v; }))));
      if (X.length){ var J=desJanelas(X), P=desPessoas(X,J).filter(function(q){ return q.k===k; })[0]; if (P&&P.an.length) g.push(card('Carta de controle · '+nomeMes(J.agora),'desvio por mês × linha normal dela (faixa cinza); ponto vermelho = fora da faixa',desCarta(P,J,'rel'),true)); }
    }
    if (inc.length){ var pc={}; inc.forEach(function(r){ var c=catDe(r); (pc[c]=pc[c]||[]).push(r); });
      g.push(card('Inconformidades por tipo',inc.length+' registros no período',gBarrasH(Object.keys(pc).sort(function(a,b){ return pc[b].length-pc[a].length; }).slice(0,10).map(function(c){ return {nome:c, v:pc[c].length, cor:'var(--c2)', go:goLista(nome+' · '+c,'inc',pc[c])}; })))); }
    return g.length?'<h2>Gráficos</h2><div class="rgraf">'+g.join('')+'</div>':'';
  }
  function corpoGeral(D){
    var k1=kpi1Mes(todosAtos(), incTodos()), recs=[]; Object.keys(D.I).forEach(function(k){ recs=recs.concat(D.I[k].recs); });
    var cr=certCalc(certRecs()).filter(function(c){return !c.intim;}), cok=cr.filter(function(c){return c.ok;}).length;
    var linhas=Object.keys(D.pessoas).map(function(k){ var p=D.P[k]||{docs:0,et:{}}, inc=((D.I[k]||{}).recs)||[], ip=inc.filter(incConta).length, ext=inc.filter(function(r){return grupoDe(r)==='E';}).length, c=((D.C[k]||{}).recs)||[];
      var t=(D.T||{})[k]||{}, md=mediaDiaria(k); return {md:md,lt:D.LT[k],nome:D.pessoas[k],docs:p.docs,ex:Object.keys(p.et).reduce(function(s,e){return s+p.et[e];},0),inc:inc.length,ext:ext,taxa:p.docs>=MIN_PROD?ip/p.docs*100:null,cert:c.length,ent:(t.PN||0)+(t.PA||0),rex:t.REx||0,sg:t.SG||0}; })
      .sort(function(a,b){ return b.docs-a.docs; });
    var h=cabecalhoRel('Relatório geral — qualidade e produção da equipe','Período: '+nomePeriodo()+(atrAtual()==='RI'?' · inconformidades do RI':''));
    h+='<h2>Indicadores</h2>'+tilesRel([['KPI-01',pct(k1.k),k1.c+' de '+k1.n+' atos RI'],['KPI-01 complementar',pct(k1.ke),'erro externo'],['Taxa da equipe',pct(D.taxaEq),'internas ÷ documentos trabalhados'],['Certidões no prazo',cr.length?pctK(cok/cr.length*100):'—',cr.length?cok+' de '+cr.length:'']]);
    h+='<h2>Por pessoa</h2><table><thead><tr><th>Pessoa</th><th class="n">Documentos</th><th class="n">Dias ativos</th><th class="n">Por dia ativo</th><th class="n">Execuções</th><th class="n">Inconf.</th><th class="n">Taxa</th><th>Leitura</th><th class="n">Externas</th><th class="n">Certidões</th><th class="n">Entradas</th><th class="n">Exig. redigidas</th><th class="n">Registros</th></tr></thead><tbody>'+
      linhas.map(function(x){ var lt=x.taxa!=null?x.lt:null; return '<tr><td>'+esc(x.nome)+'</td><td class="n">'+(x.docs||'—')+'</td><td class="n">'+(x.md&&x.md.Y?x.md.Y+' <span style="color:#6f695f">de '+x.md.Z+'</span>':'—')+'</td><td class="n"><b>'+(x.md&&x.md.W!=null?numBR(x.md.W,1):'—')+'</b></td><td class="n">'+(x.ex||'—')+'</td><td class="n">'+x.inc+'</td><td class="n">'+(x.taxa==null?'—':pct(x.taxa))+'</td><td class="'+(lt&&lt.sig==='acima'?'acima':lt&&lt.sig==='abaixo'?'bom':'')+'">'+(lt?lt.txt:'—')+'</td><td class="n">'+(x.ext||'')+'</td><td class="n">'+(x.cert||'')+'</td><td class="n">'+(x.ent||'')+'</td><td class="n">'+(x.rex||'')+'</td><td class="n">'+(x.sg||'')+'</td></tr>'; }).join('')+'</tbody></table>'+
      '<p class="nota">'+(prodDiaria()?'Dias ativos = '+DIA_ATIVO_DEF+' (de quantos dias úteis teve o período); por dia ativo = documentos dessa serventia ÷ dias ativos. ':'Média por dia ativo ainda carregando. ')+'Entradas, exigências redigidas (que viraram nota) e registros (selos gerados) vêm do Tri7. Taxa = inconformidades ÷ documentos trabalhados no VHL, só com '+MIN_PROD+'+ documentos no período. Leitura: "acima" ou "abaixo do esperado" só quando a pessoa foge, com 95% de confiança, da faixa normal para o volume dela (já contando a variação natural entre funções).</p>';
    var ld=linhas.filter(function(x){ return x.md&&x.md.Y>=5; }).sort(function(a,b){ return b.md.W-a.md.W; });
    if (ld.length) h+='<h2>Produção média por dia ativo</h2><div class="rg">'+gBarrasH(ld.map(function(x){ return {nome:x.nome, v:Math.round(x.md.W*10)/10, extra:x.md.X+' documentos em '+x.md.Y+' dias ativos (de '+x.md.Z+' dias úteis)', go:goPessoa(x.nome)}; }))+'</div><p class="nota">Só pessoas com 5 ou mais dias ativos no período.</p>';
    h+='<h2>Erros mais frequentes</h2>'+(recs.length?tabErros(recs):'<p class="nota">Nenhuma inconformidade no período.</p>');
    // etapas da equipe
    var ets=Object.keys(D.eqE).sort(function(a,b){return D.eqE[b]-D.eqE[a];}).slice(0,15);
    h+='<h2>Tempo médio por etapa (equipe)</h2><table><thead><tr><th>Etapa</th><th class="n">Execuções</th><th class="n">Dias úteis (média)</th><th class="n">Meta</th></tr></thead><tbody>'+
      ets.map(function(e){ var med=D.eqZ[e]/D.eqE[e], meta=etapaMeta(e); return '<tr><td>'+esc(e)+'</td><td class="n">'+D.eqE[e]+'</td><td class="n'+(meta!=null?(med>meta?' acima':' bom'):'')+'">'+f1(med)+'</td><td class="n">'+(meta==null?'—':f1(meta))+'</td></tr>'; }).join('')+'</tbody></table>';
    return h;
  }
  function renderRel(){
    var D=relDados(), ks=Object.keys(D.pessoas).sort(function(a,b){ return D.pessoas[a].localeCompare(D.pessoas[b]); });
    if (!ks.length){ $('tabRel').innerHTML='<div class="empty"><b>Sem dados de pessoas ainda</b>Importe a Produção por Etapa (e, se quiser, Inconformidades e Andamentos do Tri7).</div>'; return; }
    if (state.relSel!=='__geral' && !D.pessoas[state.relSel]) state.relSel='__geral';
    var h='<style>'+REL_CSS+'.relwrap{background:var(--surface-2);border-radius:12px;padding:16px;overflow-x:auto}.relsheet{box-shadow:0 2px 14px rgba(0,0,0,.12);border-radius:4px}</style>'+
      '<div class="search"><select id="relSel" aria-label="Relatório de"><option value="__geral"'+(state.relSel==='__geral'?' selected':'')+'>Equipe (relatório geral)</option>'+
      ks.map(function(k){ return '<option value="'+esc(k)+'"'+(state.relSel===k?' selected':'')+'>'+esc(D.pessoas[k])+'</option>'; }).join('')+'</select>'+
      
      '<span class="spacer"></span>'+(state.relSel!=='__geral'&&dbPronto?'<button class="btn sm" type="button" id="fbSalvar">Salvar devolutiva</button>':'')+'<button class="btn primary sm" type="button" id="relBaixar">Baixar para imprimir</button></div>'+
      '<p class="hint" style="margin:0 0 10px">O período segue o seletor do topo ('+nomePeriodo()+'). O arquivo baixado abre no navegador: Ctrl+P para imprimir ou salvar em PDF.</p>'+
      '<div class="relwrap"><div class="relsheet">'+(state.relSel==='__geral'?corpoGeral(D):corpoPessoa(state.relSel,D,false))+'</div></div>';
    $('tabRel').innerHTML=h;
  }
  function lerDevolutiva(){ var o={}; document.querySelectorAll('#tabRel textarea[data-fb]').forEach(function(t){ o[t.dataset.fb]=t.value.trim(); }); return o; }
  function baixarRelatorio(){
    var D=relDados(), geral=state.relSel==='__geral';
    if (!geral){ var fb=lerDevolutiva(); state.feedback[chaveFeedback(state.relSel)]=Object.assign({},state.feedback[chaveFeedback(state.relSel)]||{},fb); }
    var corpo=geral?corpoGeral(D):corpoPessoa(state.relSel,D,true), nome=geral?'Relatório geral':D.pessoas[state.relSel];
    var html='<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+esc(nome)+' — '+esc(nomePeriodo())+'</title><style>body{margin:0;background:#fff}'+REL_CSS+'@media print{.noprint{display:none}.relsheet{padding:0}}</style></head><body>'+
      '<div class="noprint" style="font-family:Segoe UI,Arial,sans-serif;background:#fde8da;padding:8px 12px;margin:12px auto;max-width:860px;border-radius:6px;font-size:12px">Para imprimir ou salvar em PDF: Ctrl+P (Cmd+P no Mac).</div><div class="relsheet">'+corpo+'</div></body></html>';
    var arq=(geral?'Relatorio geral':'Relatorio - '+nome)+' - '+nomePeriodo().replace(/\//g,'-')+'.html';
    if (!downloads){ toast('Download indisponível nesta visualização'); return; }
    downloads.save({filename:arq, data:html}).then(function(){ toast('Relatório baixado — abra e use Ctrl+P'); }).catch(function(e){ if (e&&e.code!=='declined') toast('Não consegui gerar o arquivo'); });
  }
  function salvarDevolutiva(){
    var k=state.relSel, fb=lerDevolutiva(), id=chaveFeedback(k), dados=Object.assign({pessoa:(relDados().pessoas[k]||k),periodo:state.periodo,em:new Date().toISOString()},fb);
    state.feedback[id]=dados;
    if (!dbPronto){ toast('Guardado só nesta sessão'); return; }
    db.doc('feedback/'+id).set(dados).then(function(){ toast('Devolutiva salva'); }).catch(function(){ toast('Não consegui salvar'); });
  }
