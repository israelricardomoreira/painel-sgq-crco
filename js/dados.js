/* Painel SGQ · CRCO — js/dados.js (0.12.0: o app.js foi dividido por página; tudo continua no mesmo escopo global, na ordem do index.html) */
(window.PAINEL_ARQ=window.PAINEL_ARQ||{})['js/dados.js']='0.25.0';
 // 0.x = em validação; vira 1.0.0 depois da apresentação ao Oficial
  // 0.11.0: proteção de versão — index.html, motor.js e nuvem.js levam a versão; se algum arquivo ficou de outra entrega, avisa no topo
  function checarVersoes(ver){ ver=ver||APP_VERSAO; var el=document.getElementById('avisoVersao'); if (!el) return; var meta=document.querySelector('meta[name="painel-versao"]'), dif=[];
    var v={'index.html':meta?meta.getAttribute('content'):'(sem versão)','motor.js':(window.Motor&&Motor.VERSAO)||'(antigo)'}; if (window.nuvem) v['nuvem.js']=window.NUVEM_VERSAO||'(antigo)';
    var A=window.PAINEL_ARQ||{}; (typeof ARQUIVOS_APP!=='undefined'?ARQUIVOS_APP:[]).forEach(function(f){ v[f]=A[f]||'(faltando)'; });
    Object.keys(v).forEach(function(f){ if (v[f]!==ver) dif.push(f+' '+v[f]); });
    el.hidden=!dif.length; if (dif.length) el.innerHTML='<b>Arquivos de versões diferentes.</b> O painel é da '+esc(ver)+', mas '+esc(dif.join(', '))+'. Suba de novo todos os arquivos da entrega e recarregue a página. Até lá, não importe nem lance nada.'; }
  function precisaXLSX(){ if (window.XLSX) return Promise.resolve(window.XLSX); if (xlsxProm) return xlsxProm;
    xlsxProm=new Promise(function(ok,falha){ var sc=document.createElement('script'); sc.src=XLSX_URL; if (XLSX_SRI){ sc.integrity=XLSX_SRI; sc.crossOrigin='anonymous'; }
      sc.onload=function(){ window.XLSX?ok(window.XLSX):falha(new Error('biblioteca de planilhas não carregou')); }; sc.onerror=function(){ xlsxProm=null; falha(new Error('não consegui baixar a biblioteca de planilhas (verifique a internet)')); }; document.head.appendChild(sc); });
    return xlsxProm; }
  // Dados brutos: só as colunas que o cálculo usa (sem título, solicitante ou nome de parte)
  function brutosMontar(){
    var S=XLSX.SSF, out={};
    function mesDe(v){ var d=Motor.paraDia(v,S); return d==null?null:Motor.isoDeDia(d).slice(0,7); }
    function bloco(k,tipo,mes){ return out[k]=out[k]||{tipo:tipo,mes:mes,rows:new Map()}; }  // Map preserva a ordem original (importa para etapas do mesmo dia)
    Motor.linhas(state.arquivos.prazo||[]).forEach(function(r){ var t=Motor.semAcento(r['tipo de documento']); if (!t || t.indexOf('x ')===0) return; // todas as serventias (sem título nem solicitante)
      var m=mesDe(r['finalizacao']); if (!m) return; bloco('prazo-'+m,'prazo',m).rows.set(String(r['tipo de documento']).trim()+'|'+String(r['codigo']),[r['tipo de documento'],r['codigo'],r['natureza'],r['ingresso'],r['finalizacao'],r['prazo'],r['tempo']]); });
    Motor.linhas(state.arquivos.etapa||[]).forEach(function(r){ var m=mesDe(r['data execucao']); if (!m) return;
      var row=[r['codigo'],r['data execucao'],r['etapa'],r['responsavel'],r['prazo']]; bloco('etapa-'+m,'etapa',m).rows.set(row.join('|'),row); });
    var D=Motor.linhas(state.arquivos.demanda||[]); if (D.length){ var b=bloco('demanda','demanda',null);
      D.forEach(function(r){ if (Motor.semAcento(r['tipo de documento'])!=='ri') return; b.rows.set(String(r['codigo']),[r['codigo'],r['status']]); }); }
    return out;
  }
  function brutoCod(b){ // dicionário de textos repetidos para ocupar menos espaço
    var dic=[], di={}, rows=Array.from(b.rows.values()).map(function(r){ return r.map(function(v){ if (typeof v!=='string') return v; if (!(v in di)){ di[v]=dic.length; dic.push(v); } return '~'+di[v]; }); });
    return {v:1, tipo:b.tipo, mes:b.mes, cols:BRUTO_COLS[b.tipo], dic:dic, rows:rows, em:new Date().toISOString(), versao:APP_VERSAO}; }
  function brutoDecod(doc){ return (doc.rows||[]).map(function(r){ var o={}; doc.cols.forEach(function(c,i){ var v=r[i]; o[c]=(typeof v==='string'&&v.charAt(0)==='~')?doc.dic[+v.slice(1)]:v; }); return o; }); }
  function brutoChave(tipo,o){ return tipo==='etapa'?[o['codigo'],o['data execucao'],o['etapa'],o['responsavel'],o['prazo']].join('|'):tipo==='prazo'?String(o['tipo de documento']).trim()+'|'+String(o['codigo']):String(o['codigo']); }
  function brutosSalvar(){
    if (!window.nuvem || !dbPronto || !podeEscrever) return Promise.resolve(0);
    var novos=brutosMontar(), ks=Object.keys(novos), p=Promise.resolve();
    ks.forEach(function(k){ p=p.then(function(){ return window.nuvem.ler('brutos',k).then(function(ex){
      var b=novos[k], merged=new Map(); if (ex) brutoDecod(ex).forEach(function(o){ merged.set(brutoChave(b.tipo,o),BRUTO_COLS[b.tipo].map(function(c){ return o[c]; })); });
      b.rows.forEach(function(v,x){ merged.set(x,v); }); b.rows=merged; return window.nuvem.gravar('brutos',k,brutoCod(b)); }); }); });
    return p.then(function(){ return ks.length; });
  }
  function recalcularTudo(){
    if (!window.nuvem) return;
    if (!confirm('Recalcular todos os meses com a regra atual do painel, a partir dos dados brutos guardados?\n\nOs resultados salvos serão substituídos pelos recalculados. Justificativas, avaliações e lançamentos continuam como estão.')) return;
    var b=$('btnRecalc'); b.disabled=true; b.textContent='Recalculando…';
    precisaXLSX().then(function(){ return window.nuvem.lerColecao('brutos'); }).then(function(rows){
      var P=[], E=[], D=[]; rows.forEach(function(x){ var d=brutoDecod(x.dados); if (x.id.indexOf('prazo-')===0) P=P.concat(d); else if (x.id.indexOf('etapa-')===0) E=E.concat(d); else if (x.id==='demanda') D=D.concat(d); });
      if (!P.length || !E.length) throw new Error('Não há dados brutos guardados ainda. Importe as planilhas (ou restaure o backup inicial).');
      return recalcDeBrutos(function(t){ b.textContent=t; }).then(function(r){ return r.ri; });
    }).then(function(n){ toast(n+' mês(es) recalculado(s) com a versão '+APP_VERSAO); render(); }).catch(function(e){ toast(e.message||'Não consegui recalcular'); })
      .then(function(){ b.disabled=false; b.textContent='Recalcular tudo com a regra atual'; });
  }
  function exportarBackup(){
    if (!window.nuvem) return; var b=$('btnBackup'); b.disabled=true; b.textContent='Gerando…';
    window.nuvem.lerTudo().then(function(rows){
      var hoje=new Date().toISOString().slice(0,10), dados={app:'painel-sgq-crco', versao:APP_VERSAO, geradoEm:new Date().toISOString(), docs:rows};
      return downloads.save({filename:'backup-painel-sgq-'+hoje+'.json', data:JSON.stringify(dados)}).then(function(){ return db.doc('config/backup').set({em:new Date().toISOString(), registros:rows.length}); }).then(function(){ toast('Backup baixado ('+rows.length+' registros). Guarde fora do Supabase.'); renderBackupInfo(); });
    }).catch(function(e){ toast('Não consegui gerar o backup: '+(e.message||'')); }).then(function(){ b.disabled=false; b.textContent='Baixar backup (.json)'; });
  }
  function restaurarBackup(file){
    file.text().then(function(txt){ var o=JSON.parse(txt);
      if (!o || o.app!=='painel-sgq-crco' || !Array.isArray(o.docs)) throw new Error('Este arquivo não é um backup do painel.');
      var cont={}; o.docs.forEach(function(d){ cont[d.colecao]=(cont[d.colecao]||0)+1; });
      if (!confirm('Restaurar backup de '+(o.geradoEm||'').slice(0,10)+' com '+o.docs.length+' registros?\n\n'+Object.keys(cont).map(function(k){return k+': '+cont[k];}).join(', ')+'\n\nRegistros com o mesmo nome serão substituídos pelos do backup; os demais continuam.')) return;
      var b=$('btnRestaurar'); b.disabled=true; var i=0, p=Promise.resolve();
      o.docs.forEach(function(d){ p=p.then(function(){ i++; b.textContent='Restaurando '+i+'/'+o.docs.length+'…'; return window.nuvem.gravar(d.colecao,d.id,d.dados); }); });
      return p.then(function(){ toast('Backup restaurado. Recarregando…'); setTimeout(function(){ location.reload(); },1200); });
    }).catch(function(e){ toast(e.message||'Não consegui restaurar'); var b=$('btnRestaurar'); b.disabled=false; b.textContent='Restaurar backup'; });
  }
  function renderBackupInfo(){
    var el=$('backupInfo'); if (!el||!db) return;
    db.doc('config/backup').get().then(function(s){ var d=s.exists?s.data():null, dias=d?Math.floor((Date.now()-new Date(d.em).getTime())/864e5):null;
      el.innerHTML=d?'Último backup baixado em '+fmtData(d.em.slice(0,10))+' ('+dias+' dia'+(dias===1?'':'s')+' atrás).':'Nenhum backup baixado ainda.';
      var av=$('avisoBackup'); if (av){ av.hidden=!(podeEscrever && (dias==null||dias>30)); av.innerHTML='<b>Backup:</b> '+(d?'o último foi há '+dias+' dias':'você ainda não baixou nenhum')+'. O plano gratuito do Supabase não faz backup automático — abra <b>Importar dados</b> e clique em <b>Baixar backup</b>.'; } });
  }

  // ——— memória de cálculo auditável (.xlsx com fórmulas do próprio Excel)
  function xSerial(iso){ if (!iso) return null; var p=String(iso).slice(0,10).split('-'); return Date.UTC(+p[0],+p[1]-1,+p[2])/864e5+25569; }
  function xFolha(cab, linhas, larguras){ var ws=XLSX.utils.aoa_to_sheet([cab].concat(linhas.map(function(l){ return l.map(function(v){ return v&&typeof v==='object'?null:v; }); })));
    linhas.forEach(function(l,i){ l.forEach(function(v,j){ if (v&&typeof v==='object'){ var a=XLSX.utils.encode_cell({r:i+1,c:j}); ws[a]=v; } }); });
    ws['!ref']=XLSX.utils.encode_range({s:{r:0,c:0},e:{r:Math.max(1,linhas.length),c:cab.length-1}}); ws['!cols']=(larguras||[]).map(function(w){ return {wch:w}; }); ws['!autofilter']={ref:XLSX.utils.encode_range({s:{r:0,c:0},e:{r:Math.max(1,linhas.length),c:cab.length-1}})}; return ws; }
  function xData(iso){ var s=xSerial(iso); return s==null?'':{t:'n',v:s,z:'dd/mm/yyyy'}; }
  function xF(f){ return {t:'n',f:f}; }
  function baixarMemoria(m){
    var d=state.docs[m]; if (!d){ toast('Sem dados do painel para '+compLabel(m)); return; } aplicarTri7();
    var wb=XLSX.utils.book_new(), resumo=[], atos=d.atos, R=atos.filter(function(a){return a.cat==='R';}), nR=R.length;
    // feriados usados (nacionais + locais)
    var fer=Motor.feriadoSet(state.extras), fl=Object.keys(fer).map(Number).filter(function(n){ var y=+Motor.isoDeDia(n).slice(0,4); return y>=2025&&y<=2027; }).sort(function(a,b){return a-b;});
    var nF=fl.length+1;
    // KPI-02
    var l2=R.map(function(a,i){ var r=i+2, j=justDe(a);
      return [a.c, a.natOrig||a.nat, xData(a.ing), xData(a.reg), a.bruto, xF('IF(D'+r+'="","",NETWORKDAYS(C'+r+',D'+r+',Feriados!$A$2:$A$'+nF+')-1)'), xF('IF(F'+r+'="","sem Revisão Oficial (Prazo do VHL)",IF(E'+r+'=F'+r+',"OK","DIFERENTE"))'), a.lim, j?(MOT_JUST[j.motivo]||j.motivo):'', xF('IF(OR(E'+r+'<=H'+r+',I'+r+'<>""),1,0)'), a.retUsado?xData(a.retUsado):'', a.retDu!=null?a.retDu:'', a.retFonte||'']; });
    XLSX.utils.book_append_sheet(wb, xFolha(['Protocolo','Natureza','Ingresso','Registro (selo do Tri7 ou última Revisão Oficial)','Dias úteis (painel)','Dias úteis (Excel)','Confere?','Limite (d.u.)','Justificativa','Dentro do prazo','Retorno (exigência cumprida)','Retorno no dia útil nº','Fonte do retorno'], l2, [11,40,11,14,10,10,14,8,30,10,14,10,10]), 'KPI-02');
    resumo.push(['KPI-02','Finalizados na vigência da prenotação', xF("SUM('KPI-02'!J2:J"+(nR+1)+')'), xF("COUNTA('KPI-02'!A2:A"+(nR+1)+')'), 'Aba KPI-02: um ato registrado por linha. "Dias úteis (Excel)" refaz a conta com NETWORKDAYS e a aba Feriados. Limite = 20 d.u.; com retorno, dia útil do retorno + 5 (mínimo 20, máximo 25).']);
    // KPI-02 complementar
    var SITX={R:'Registrado',N:'Não registrado (cancelado/devolvido)',E:'Abertura + outros (especial)',I:'Sem histórico'};
    var lc=atos.map(function(a){ return [a.c, a.natOrig||a.nat, SITX[a.cat]||a.cat, a.cat==='N'?(MOTIVOS[a.motivo]||''):'', a.cat==='N'?1:0]; }).concat(cancSoTri7Mes(m,true).map(function(a){ return [a.c, '(sem finalização no VHL)', 'Cancelado no Tri7, ainda aberto no VHL', MOTIVOS.T, 1]; }));
    XLSX.utils.book_append_sheet(wb, xFolha(['Protocolo','Natureza','Situação','Motivo','Não registrado'], lc, [11,40,30,40,12]), 'KPI-02 Comp');
    resumo.push(['KPI-02 (Comp.)','Protocolos cancelados', xF("SUM('KPI-02 Comp'!E2:E"+(lc.length+1)+')'), xF("COUNTA('KPI-02 Comp'!A2:A"+(lc.length+1)+')'), 'Aba KPI-02 Comp: todos os protocolos arquivados no mês, mais os cancelados no Tri7 no mês que ainda não foram finalizados no VHL.']);
    // KPI-01
    var todos=incTodos(), porCod={}; todos.forEach(function(r){ if (r.t==='RI') porCod[r.c]=(porCod[r.c]||0)+1; });
    var l1=R.map(function(a,i){ return [a.c, a.natOrig||a.nat, porCod[a.c]||0, xF('IF(C'+(i+2)+'>0,1,0)')]; });
    XLSX.utils.book_append_sheet(wb, xFolha(['Protocolo','Natureza','Inconformidades RI ligadas ao protocolo','Teve inconformidade'], l1, [11,40,18,14]), 'KPI-01');
    var incMes=(state.inconf[m]||[]).filter(function(r){return r.t==='RI';});
    var lf=incMes.map(function(r){ return [xData(r.d), r.c, grupoDe(r)==='E'?'Externo':'Interno', catDe(r), r.o]; });
    XLSX.utils.book_append_sheet(wb, xFolha(['Data','Documento','Tipo','Erro','Observação'], lf, [11,11,9,30,80]), 'Inconformidades do mês');
    resumo.push(['KPI-01','Taxa de não conformidade interna (RI) — atos com inconformidade', xF("SUM('KPI-01'!D2:D"+(nR+1)+')'), xF("COUNTA('KPI-01'!A2:A"+(nR+1)+')'), 'Aba KPI-01: atos registrados no mês com ao menos 1 inconformidade (de qualquer data) ÷ atos registrados.']);
    // KPI-09 (sem nomes: só matrícula)
    var k9=state.k9[m];
    if (k9){ var l9=k9.pessoas.map(function(p){ return [p.mat, p.h, p.hl]; });
      var ws9=xFolha(['Matrícula','Horas de ausência gerenciável','Horas de licença (fora da meta)'], l9, [12,24,26]);
      XLSX.utils.sheet_add_aoa(ws9,[['Headcount',k9.headcount],['Jornada mensal (h)',k9.jornada],['Período da folha',k9.periodo]],{origin:'E1'}); ws9['!cols'].push({wch:2},{wch:20},{wch:24});
      XLSX.utils.book_append_sheet(wb, ws9, 'KPI-09');
      resumo.push(['KPI-09','Absenteísmo', xF("SUM('KPI-09'!B2:B"+(l9.length+1)+')'), xF("'KPI-09'!F1*'KPI-09'!F2"), 'Horas de atestado + faltas abonadas ÷ (headcount × jornada). Só colaboradores com ausência aparecem na lista.']); }
    // KPI-13
    var sm=state.senhas[m];
    if (sm){ var at=sm.L.filter(function(s){ return s.c!=null&&s.e!=null; });
      var l13=at.map(function(s){ return [xData(s.dia), s.fila, s.pri?'Sim':'Não', Math.round(s.e/60*10000)/10000]; });
      XLSX.utils.book_append_sheet(wb, xFolha(['Data','Fila','Prioritária','Espera (min)'], l13, [11,36,11,12]), 'KPI-13');
      resumo.push(['KPI-13','Tempo de espera médio para início do atendimento', xF("ROUND(AVERAGE('KPI-13'!D2:D"+(l13.length+1)+'),2)'), 100, 'Média da espera (minutos) das senhas chamadas, lançada como numerador ÷ 100.']); }
    // demais KPIs (lançamento manual no painel)
    KPIS.forEach(function(K){ if (['k1','k2','k2c','k9','k13'].indexOf(K.auto)>=0 && (K.auto!=='k9'||k9) && (K.auto!=='k13'||sm)) return; var o=kpiValor(K.id,m); if (!o) return;
      resumo.push([K.id, K.nome, o.n, o.d, (o.fonte||'Manual')+' — valor informado no painel.']); });
    var lr=resumo.map(function(x,i){ var r=i+2, tv=kpiTravado(m,x[0]); return [x[0],x[1],x[2],x[3], xF('IF(D'+r+'=0,"—",C'+r+'/D'+r+'*100)'), tv&&tv.n!=null?numBR(tv.n)+' / '+numBR(tv.d)+' em '+fmtDataHora(tv.em)+' (painel '+(tv.ver||'?')+')':'', x[4]]; });
    var wsR=xFolha(['KPI','Indicador','Numerador','Denominador','Resultado','Lançado no ANOREG+ (travado)','Como conferir'], lr, [14,48,12,12,11,30,90]);
    XLSX.utils.book_append_sheet(wb, wsR, 'Resumo'); wb.SheetNames.unshift(wb.SheetNames.pop());
    var wsF=xFolha(['Feriado (dias sem expediente considerados)'], fl.map(function(n){ return [{t:'n',v:n+25569,z:'dd/mm/yyyy'}]; }), [34]);
    XLSX.utils.book_append_sheet(wb, wsF, 'Feriados');
    var leia=[['Memória de cálculo — Painel SGQ · CRCO'],['Competência',compLabel(m)],['Gerado em',new Date().toLocaleString('pt-BR')],['Versão do painel',APP_VERSAO],['Fontes','VHL: Prazo e Tempo Médio, Produção por Etapa, Demanda (Suspensos), Consulta de inconformidades, Consulta de senhas. Folha: Rel. Eventos de Apuração.'],
      ['Como auditar','1) Confira na aba Resumo que Numerador e Denominador são fórmulas sobre as abas de cada KPI. 2) Na aba KPI-02, a coluna "Dias úteis (Excel)" recalcula com NETWORKDAYS: "Confere?" deve dar OK. 3) Sorteie protocolos e compare datas com o VHL. 4) Quem quiser refazer do zero sobe as mesmas planilhas do VHL no painel e compara.'],
      ['Regras','KPI-02: 20 dias úteis do ingresso à última Revisão Oficial (Art. 205 c/c Art. 9º §1º da Lei 6.015/73); com reingresso, dia útil do retorno + 5 (art. 188, §1º, III), mínimo 20 e máximo 25. Registro = Selos Gerados do Tri7 quando antes da última Revisão Oficial. Dia do ingresso não conta. Cancelados, pesquisas qualificadas e Informação Verbal - Visualização de Matrícula fora da base.'],
      ['Valor travado','Quando o KPI já foi lançado no ANOREG+, a coluna "Lançado no ANOREG+ (travado)" mostra o valor guardado no dia. Se for diferente do calculado nesta planilha, vale o travado: a diferença vem de dados ou regras posteriores ao lançamento. A evidência anexada no ANOREG+ é a memória baixada no dia do lançamento.'],
      ['Privacidade','Sem nomes de partes ou colaboradores; absenteísmo só por matrícula.']];
    var wsL=XLSX.utils.aoa_to_sheet(leia); wsL['!cols']=[{wch:18},{wch:120}]; XLSX.utils.book_append_sheet(wb, wsL, 'Leia-me');
    XLSX.writeFile(wb, 'Memoria de calculo KPIs - '+compLabel(m).replace(/[\/. ]+/g,'-')+'.xlsx');
    toast('Memória de cálculo baixada');
  }
  // ——— 0.14.0: histórico de gravações (versão anterior de cada registro) ———
  var HV_NOME={meses:'RI · atos',logs:'RI · linha do tempo',brutos:'dados brutos do VHL',serv:'outras serventias',andam:'Tri7 · andamentos',cert:'certidões',inconf:'inconformidades',senhas:'senhas',trab:'tempo de trabalho',kpi09:'folha (KPI-09)',kpis:'lançamento de KPI',justificativas:'justificativa',avaliacoes:'avaliação de exigências',inc_cat:'categoria de erro',config:'configuração',feedback:'feedback',aprendiz:'aprendizagem',paineis:'Meus painéis'};
  var HV_IMPORT={meses:1,logs:1,brutos:1,serv:1,andam:1,cert:1,inconf:1,senhas:1,trab:1,kpi09:1};
  function hvRotulo(v){ var n=HV_NOME[v.colecao]||v.colecao, id=String(v.doc_id); var m=id.match(/(\d{4}-\d{2})$/); return n+(m?' · '+nomeMes(m[1]):(v.colecao==='config'?' · '+id:v.colecao==='brutos'?' · '+id:'')); }
  // agrupa as versões por gravação: mesma pessoa, mesmo tipo (importação ou ajuste manual) e menos de 90 s entre uma e outra
  function hvGrupos(L){ var G=[], ab={}; L.forEach(function(v){ var t=Date.parse(v.substituida_em), cl=HV_IMPORT[v.colecao]?'imp':'man', k=cl+'|'+v.email, g=ab[k];
      if (g && g.tMin-t<90000){ g.L.push(v); g.tMin=t; } else { g=ab[k]={email:v.email, tMax:t, tMin:t, L:[v]}; G.push(g); } });
    G.sort(function(a,b){ return b.tMax-a.tMax; });
    G.forEach(function(g,i){ var por={}; g.L.forEach(function(v){ var k=v.colecao+'/'+v.doc_id; if (!por[k]||v.id<por[k].id) por[k]=v; }); g.docs=Object.keys(por).map(function(k){ return por[k]; }); g.i=i;
      g.imp=g.docs.some(function(v){ return HV_IMPORT[v.colecao]; });
      var depois={}; G.slice(0,i).forEach(function(h){ h.L.forEach(function(v){ depois[v.colecao+'/'+v.doc_id]=1; }); }); g.depois=g.docs.filter(function(v){ return depois[v.colecao+'/'+v.doc_id]; }).length; });
    return G; }
  function hvData(ms){ var d=new Date(ms); return ('0'+d.getDate()).slice(-2)+'/'+('0'+(d.getMonth()+1)).slice(-2)+'/'+String(d.getFullYear()).slice(2)+' '+('0'+d.getHours()).slice(-2)+':'+('0'+d.getMinutes()).slice(-2); }
  function renderHist(){
    var el=$('histVersoes'); if (!el) return; if (!window.nuvem||!window.nuvem.versoes){ el.innerHTML='<p class="hint">Disponível só no painel publicado.</p>'; return; }
    el.innerHTML='<p class="hint">Carregando…</p>';
    window.nuvem.versoes(300).then(function(L){ state.hvL=L; var G=state.hvG=hvGrupos(L), tudo=!!state.hvTudo, V=G.filter(function(g){ return tudo||g.imp; });
      var h='<div class="ctl" style="margin:0 0 8px"><label class="lc-chk"><input type="checkbox" id="hvTudo"'+(tudo?' checked':'')+'> mostrar também lançamentos, justificativas e configuração</label></div>';
      if (!L.length){ el.innerHTML=h+'<p class="hint">Nenhuma versão guardada ainda. Elas começam a aparecer na primeira gravação depois de rodar o <b>versoes.sql</b>.</p>'; return; }
      h+=V.slice(0,30).map(function(g,k){
        return '<details class="hv-g"'+(k===0?' open':'')+'><summary><b>'+hvData(g.tMax)+'</b> · '+esc(g.email||'?')+' · '+g.docs.length+' registro'+(g.docs.length>1?'s':'')+(g.imp?' <span class="chip">importação</span>':'')+'</summary><ul>'+
          g.docs.map(function(v){ return '<li>'+esc(hvRotulo(v))+' <span class="mut">— '+(v.acao==='criou'?'era novo (desfazer arquiva)':v.acao==='arquivou'?'foi arquivado':'alterado')+'</span></li>'; }).join('')+'</ul>'+
          (g.depois?'<p class="hint">Atenção: '+g.depois+' destes registros foram gravados de novo depois. Desfazer volta eles para antes desta gravação, e as mudanças posteriores deles também saem.</p>':'')+
          (podeEscrever?'<div class="hv-acoes"><button class="btn sm" type="button" data-hvdesfazer="'+g.i+'">Desfazer esta gravação</button></div>':'')+'</details>'; }).join('')+
        (V.length>30?'<p class="hint">Mostrando as 30 gravações mais recentes.</p>':'')+(V.length?'':'<p class="hint">Nenhuma importação nas versões guardadas.</p>');
      el.innerHTML=h;
    }).catch(function(e){ el.innerHTML=e.code==='sem_tabela'?'<div class="banner warn">O histórico ainda não foi ligado no banco. Rode o arquivo <b>versoes.sql</b> no Supabase (SQL Editor › New query › colar › Run) e clique de novo.</div>':'<p class="hint">Não consegui ler o histórico: '+esc(e.message)+'</p>'; });
  }
  function hvDesfazer(i){
    var g=(state.hvG||[])[i]; if (!g) return;
    var txt='Desfazer a gravação de '+hvData(g.tMax)+'?\n\n'+g.docs.map(function(v){ return '• '+hvRotulo(v)+(v.acao==='criou'?' (será arquivado)':' (volta como era antes)'); }).join('\n')+(g.depois?'\n\nAtenção: '+g.depois+' registro(s) foram gravados de novo depois e também voltam.':'')+'\n\nO estado de agora também fica guardado no histórico, então dá para refazer.';
    if (!confirm(txt)) return;
    var b=document.querySelector('[data-hvdesfazer="'+i+'"]'); if (b){ b.disabled=true; b.textContent='Desfazendo…'; }
    var p=Promise.resolve(), n=0, recalc=g.docs.some(function(v){ return v.colecao==='brutos'; });
    g.docs.forEach(function(v){ p=p.then(function(){ return window.nuvem.versaoDados(v.id); }).then(function(x){ if (!x) throw new Error('versão '+v.id+' não encontrada'); n++; if (b) b.textContent='Desfazendo '+n+'/'+g.docs.length+'…'; return window.nuvem.voltarVersao(x); }); });
    p.then(function(){ toast('Gravação desfeita: '+n+' registro(s) voltaram'+(recalc?'. Os dados brutos voltaram também; use Recalcular só se quiser refazer os meses com a versão atual do painel':'')); render(); renderExcluir(); renderHist(); })
     .catch(function(e){ toast('Parei no meio ('+n+' de '+g.docs.length+'): '+(e&&e.message||'erro')+'. Confira e tente de novo'); renderHist(); });
  }
