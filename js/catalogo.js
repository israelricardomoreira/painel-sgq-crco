/* Painel SGQ · CRCO — js/catalogo.js (0.21.0: catálogo de POPs e ITs para a Aprendizagem)
 * Vem da Lista Mestra (M1) e do teor dos POPs (M4). Cada documento tem o escopo que o painel mede:
 * naturezas do VHL (a tabela "Natureza Principal" da IT de recepção do ato) + etapas da fase
 * (REC = Prenotação no Tri7 · QLF = Análise, Re-Análise e Revisão de exigência do Tri7 · MIN = Minuta · REV = Revisão Oficial).
 * Editável em Configuração › POPs e escopo, com motivo no histórico. Ajustes ficam em config/pops {map:{código:{…}}}. */
(window.PAINEL_ARQ=window.PAINEL_ARQ||{})['js/catalogo.js']='0.21.1';
  var POP_BASE=[{"c":"IT-PJ-AVB-ENT","t":"Averbação em PJ · Entrega (Reg. Civil de Pessoas Jurídicas)","sv":"RCPJ","v":"1.0.1","fase":"ENT","nats":["Associações em geral"],"ets":["Registrar pedido / Envio Cliente"],"med":1,"conf":0},
    {"c":"IT-PJ-AVB-REC","t":"Averbação em PJ · Recepção (Reg. Civil de Pessoas Jurídicas)","sv":"RCPJ","v":"1.0.0","fase":"REC","med":0},
    {"c":"IT-RC-CAS-HAB","t":"Casamento · Habilitação (Registro Civil)","sv":"RC","v":"1.0.0","fase":"HAB","med":0},
    {"c":"IT-RC-NAS-LAV","t":"Nascimento · Lavratura (Registro Civil)","sv":"RC","v":"1.0.0","fase":"LAV","med":0},
    {"c":"IT-RC-OBI-LAV","t":"Óbito · Lavratura (Registro Civil)","sv":"RC","v":"","fase":"LAV","med":0},
    {"c":"IT-RI-ABM-MIN","t":"Abertura de Matrícula · Minuta (Registro de Imóveis)","sv":"RI","v":"1.0.1","ato":"Abertura de Matrícula","fase":"MIN","nats":["Abertura de Matrícula","ONR - Abertura de Matrícula","Abertura de matrícula + Outros atos"],"ets":["Minuta"],"med":1,"conf":1},
    {"c":"IT-RI-ABM-REC","t":"Abertura de Matrícula · Recepção (Registro de Imóveis)","sv":"RI","v":"1.0.0","ato":"Abertura de Matrícula","fase":"REC","nats":["Abertura de Matrícula","ONR - Abertura de Matrícula","Abertura de matrícula + Outros atos"],"ets":["Prenotação (Tri7)"],"med":1,"conf":1},
    {"c":"IT-RI-CADASTRO-REAL","t":"Saneamento da Ficha Real (Registro de Imóveis)","sv":"RI","v":"","fase":"REAL","med":0},
    {"c":"IT-RI-COBRANCA","t":"Cobrança de Emolumentos e Baixa de Pagamentos (Registro de Imóveis)","sv":"RI","v":"","fase":"","med":0},
    {"c":"IT-RI-COP-MIN","t":"Consolidação de Propriedade · Minuta (Registro de Imóveis)","sv":"RI","v":"1.0.0","ato":"Consolidação de Propriedade","fase":"MIN","nats":["Consolidação","ONR - Consolidação"],"ets":["Minuta"],"med":1,"conf":1},
    {"c":"IT-RI-COP-REC","t":"Consolidação de Propriedade · Recepção (Registro de Imóveis)","sv":"RI","v":"1.0.0","ato":"Consolidação de Propriedade","fase":"REC","nats":["Consolidação","ONR - Consolidação"],"ets":["Prenotação (Tri7)"],"med":1,"conf":1},
    {"c":"IT-RI-CVA-MIN","t":"Compra e Venda c/ Alienação · Minuta (Registro de Imóveis)","sv":"RI","v":"1.0.0","ato":"Compra e Venda c/ Alienação","fase":"MIN","nats":["Escritura Pública - Compra e Venda/Alienação Fiduciária","ONR - Escritura Pública c/ Cláusulas","Contrato","Contrato - PMCMV","ONR - Contrato"],"ets":["Minuta"],"med":1,"conf":1},
    {"c":"IT-RI-CVA-REC","t":"Compra e Venda c/ Alienação · Recepção (Registro de Imóveis)","sv":"RI","v":"1.0.0","ato":"Compra e Venda c/ Alienação","fase":"REC","nats":["Escritura Pública - Compra e Venda/Alienação Fiduciária","ONR - Escritura Pública c/ Cláusulas","Contrato","Contrato - PMCMV","ONR - Contrato"],"ets":["Prenotação (Tri7)"],"med":1,"conf":1},
    {"c":"IT-RI-CVD-MIN","t":"Compra e Venda Simples · Minuta (Registro de Imóveis)","sv":"RI","v":"1.0.0","ato":"Compra e Venda Simples","fase":"MIN","nats":["Escritura Pública - Compra e Venda","ONR - Escritura Pública Simples","Contrato","ONR - Instrumento Particular"],"ets":["Minuta"],"med":1,"conf":1},
    {"c":"IT-RI-CVD-REC","t":"Compra e Venda Simples · Recepção (Registro de Imóveis)","sv":"RI","v":"1.0.0","ato":"Compra e Venda Simples","fase":"REC","nats":["Escritura Pública - Compra e Venda","ONR - Escritura Pública Simples","Contrato","ONR - Instrumento Particular"],"ets":["Prenotação (Tri7)"],"med":1,"conf":1},
    {"c":"IT-RI-DOI-COAF","t":"Validação de DOI e Comunicação ao COAF (Registro de Imóveis)","sv":"RI","v":"1.0.0","fase":"COAF","med":0},
    {"c":"IT-RI-GED","t":"Cadastro e Gestão de Documentos no GED 2.0 (Registro de Imóveis)","sv":"RI","v":"","fase":"","med":0},
    {"c":"IT-RI-INC-MIN","t":"Inclusão e Modificação de Dados de Qualificação Pessoal · Minuta (Registro de Imóveis)","sv":"RI","v":"1.0.0","ato":"Inclusão/Modificação de Dados de Qualificação Pessoal","fase":"MIN","nats":["Requerimento Averbação Retificação","ONR - Requerimento de Averbação"],"ets":["Minuta"],"med":1,"conf":1},
    {"c":"IT-RI-INC-REC","t":"Inclusão e Modificação de Dados de Qualificação Pessoal · Recepção (Registro de Imóveis)","sv":"RI","v":"1.0.0","ato":"Inclusão/Modificação de Dados de Qualificação Pessoal","fase":"REC","nats":["Requerimento Averbação Retificação","ONR - Requerimento de Averbação"],"ets":["Prenotação (Tri7)"],"med":1,"conf":1},
    {"c":"IT-RI-LEN-MIN","t":"Leilão Negativo · Minuta (Registro de Imóveis)","sv":"RI","v":"","ato":"Leilão Negativo","fase":"MIN","nats":["Averbação de Leilão Extrajudicial","ONR - Leilão Negativo"],"ets":["Minuta"],"med":1,"conf":1},
    {"c":"IT-RI-LEN-REC","t":"Leilão Negativo · Recepção (Registro de Imóveis)","sv":"RI","v":"1.0.1","ato":"Leilão Negativo","fase":"REC","nats":["Averbação de Leilão Extrajudicial","ONR - Leilão Negativo"],"ets":["Prenotação (Tri7)"],"med":1,"conf":1},
    {"c":"IT-RI-MAT-CER","t":"Emissão de Certidão de Matrícula","sv":"RI","v":"1.0.0","fase":"CER","med":0},
    {"c":"IT-RI-MAT-PENDENTE","t":"Abrir Matrícula Pendente (Registro de Imóveis)","sv":"RI","v":"","fase":"PENDENTE","med":0},
    {"c":"IT-RI-REB-MIN","t":"REURB (Regularização Fundiária) · Minuta (Registro de Imóveis)","sv":"RI","v":"1.0.0","ato":"REURB","fase":"MIN","nats":["REURB"],"ets":["Minuta"],"med":1,"conf":1},
    {"c":"IT-RI-REB-REC","t":"REURB (Regularização Fundiária) · Recepção (Registro de Imóveis)","sv":"RI","v":"","ato":"REURB","fase":"REC","nats":["REURB"],"ets":["Prenotação (Tri7)"],"med":1,"conf":1},
    {"c":"IT-RTD-ATA-REC","t":"Ata de Condomínio · Recepção (Reg. de Títulos e Documentos)","sv":"RTD","v":"","fase":"REC","med":0},
    {"c":"IT-RTD-NOT-CER","t":"Notificação Extrajudicial · Certificação (Reg. de Títulos e Documentos)","sv":"RTD","v":"1.0.1","fase":"CER","nats":["Notificação"],"ets":["Emissão Certidão Diligência"],"med":1,"conf":0},
    {"c":"IT-RTD-NOT-REC","t":"Notificação Extrajudicial · Recepção (Reg. de Títulos e Documentos)","sv":"RTD","v":"1.0.1","fase":"REC","med":0},
    {"c":"POP-PJ-AVB-QLF","t":"Averbação em PJ · Qualificação (Reg. Civil de Pessoas Jurídicas)","sv":"RCPJ","v":"1.0.0","fase":"QLF","nats":["Associações em geral"],"ets":["Análise","Re-Análise"],"med":1,"conf":0},
    {"c":"POP-RC-CAS-CEL","t":"Casamento · Celebração (Registro Civil)","sv":"RC","v":"","fase":"CEL","nats":["Casamento Civil"],"ets":["Minuta / Celebração"],"med":1,"conf":0},
    {"c":"POP-RC-CAS-QLF","t":"Casamento · Qualificação (Registro Civil)","sv":"RC","v":"1.0.0","fase":"QLF","med":0},
    {"c":"POP-RC-NAS-QLF","t":"Nascimento · Qualificação (Registro Civil)","sv":"RC","v":"","fase":"QLF","med":0},
    {"c":"POP-RC-OBI-QLF","t":"Óbito · Qualificação (Registro Civil)","sv":"RC","v":"1.0.0","fase":"QLF","med":0},
    {"c":"POP-RI-ABM-QLF","t":"Abertura de Matrícula · Qualificação (Registro de Imóveis)","sv":"RI","v":"1.0.0","ato":"Abertura de Matrícula","fase":"QLF","nats":["Abertura de Matrícula","ONR - Abertura de Matrícula","Abertura de matrícula + Outros atos"],"ets":["Análise","Re-Análise","Revisão de exigência (Tri7)"],"med":1,"conf":1},
    {"c":"POP-RI-ABM-REV","t":"Abertura de Matrícula · Revisão (Registro de Imóveis)","sv":"RI","v":"1.0.0","ato":"Abertura de Matrícula","fase":"REV","nats":["Abertura de Matrícula","ONR - Abertura de Matrícula","Abertura de matrícula + Outros atos"],"ets":["Revisão Oficial"],"med":1,"conf":1},
    {"c":"POP-RI-COP-QLF","t":"Consolidação de Propriedade · Qualificação (Registro de Imóveis)","sv":"RI","v":"1.0.0","ato":"Consolidação de Propriedade","fase":"QLF","nats":["Consolidação","ONR - Consolidação"],"ets":["Análise","Re-Análise","Revisão de exigência (Tri7)"],"med":1,"conf":1},
    {"c":"POP-RI-COP-REV","t":"Consolidação de Propriedade · Revisão (Registro de Imóveis)","sv":"RI","v":"1.0.0","ato":"Consolidação de Propriedade","fase":"REV","nats":["Consolidação","ONR - Consolidação"],"ets":["Revisão Oficial"],"med":1,"conf":1},
    {"c":"POP-RI-CVA-QLF","t":"Compra e Venda c/ Alienação · Qualificação (Registro de Imóveis)","sv":"RI","v":"1.0.1","ato":"Compra e Venda c/ Alienação","fase":"QLF","nats":["Escritura Pública - Compra e Venda/Alienação Fiduciária","ONR - Escritura Pública c/ Cláusulas","Contrato","Contrato - PMCMV","ONR - Contrato"],"ets":["Análise","Re-Análise","Revisão de exigência (Tri7)"],"med":1,"conf":1},
    {"c":"POP-RI-CVA-REV","t":"Compra e Venda c/ Alienação · Revisão (Registro de Imóveis)","sv":"RI","v":"","ato":"Compra e Venda c/ Alienação","fase":"REV","nats":["Escritura Pública - Compra e Venda/Alienação Fiduciária","ONR - Escritura Pública c/ Cláusulas","Contrato","Contrato - PMCMV","ONR - Contrato"],"ets":["Revisão Oficial"],"med":1,"conf":1},
    {"c":"POP-RI-CVD-QLF","t":"Compra e Venda Simples · Qualificação (Registro de Imóveis)","sv":"RI","v":"1.0.1","ato":"Compra e Venda Simples","fase":"QLF","nats":["Escritura Pública - Compra e Venda","ONR - Escritura Pública Simples","Contrato","ONR - Instrumento Particular"],"ets":["Análise","Re-Análise","Revisão de exigência (Tri7)"],"med":1,"conf":1},
    {"c":"POP-RI-CVD-REV","t":"Compra e Venda Simples · Revisão (Registro de Imóveis)","sv":"RI","v":"1.0.1","ato":"Compra e Venda Simples","fase":"REV","nats":["Escritura Pública - Compra e Venda","ONR - Escritura Pública Simples","Contrato","ONR - Instrumento Particular"],"ets":["Revisão Oficial"],"med":1,"conf":1},
    {"c":"POP-RI-INC-QLF","t":"Inclusão e Modificação de Dados de Qualificação Pessoal · Qualificação (Registro de Imóveis)","sv":"RI","v":"1.0.0","ato":"Inclusão/Modificação de Dados de Qualificação Pessoal","fase":"QLF","nats":["Requerimento Averbação Retificação","ONR - Requerimento de Averbação"],"ets":["Análise","Re-Análise","Revisão de exigência (Tri7)"],"med":1,"conf":1},
    {"c":"POP-RI-INC-REV","t":"Inclusão e Modificação de Dados de Qualificação Pessoal · Revisão (Registro de Imóveis)","sv":"RI","v":"1.0.0","ato":"Inclusão/Modificação de Dados de Qualificação Pessoal","fase":"REV","nats":["Requerimento Averbação Retificação","ONR - Requerimento de Averbação"],"ets":["Revisão Oficial"],"med":1,"conf":1},
    {"c":"POP-RI-LEN-QLF","t":"Leilão Negativo · Qualificação (Registro de Imóveis)","sv":"RI","v":"1.0.1","ato":"Leilão Negativo","fase":"QLF","nats":["Averbação de Leilão Extrajudicial","ONR - Leilão Negativo"],"ets":["Análise","Re-Análise","Revisão de exigência (Tri7)"],"med":1,"conf":1},
    {"c":"POP-RI-LEN-REV","t":"Leilão Negativo · Revisão (Registro de Imóveis)","sv":"RI","v":"1.0.1","ato":"Leilão Negativo","fase":"REV","nats":["Averbação de Leilão Extrajudicial","ONR - Leilão Negativo"],"ets":["Revisão Oficial"],"med":1,"conf":1},
    {"c":"POP-RI-REB-QLF","t":"REURB (Regularização Fundiária) · Qualificação (Registro de Imóveis)","sv":"RI","v":"1.0.1","ato":"REURB","fase":"QLF","nats":["REURB"],"ets":["Análise","Re-Análise","Revisão de exigência (Tri7)"],"med":1,"conf":1},
    {"c":"POP-RI-REB-REV","t":"REURB (Regularização Fundiária) · Revisão (Registro de Imóveis)","sv":"RI","v":"1.0.1","ato":"REURB","fase":"REV","nats":["REURB"],"ets":["Revisão Oficial"],"med":1,"conf":1},
    {"c":"POP-RTD-ATA-QLF","t":"Ata de Condomínio · Qualificação (Reg. de Títulos e Documentos)","sv":"RTD","v":"1.0.0","fase":"QLF","med":0},
    {"c":"POP-RTD-NOT-QLF","t":"Notificação Extrajudicial · Qualificação (Reg. de Títulos e Documentos)","sv":"RTD","v":"1.0.1","fase":"QLF","med":0},
    {"c":"POP-SGQ-ARQ-001","t":"Procedimento de Guarda e Preservação do Acervo","sv":"SGQ","v":"1.0.0","fase":"001","med":0},
    {"c":"POP-SGQ-ATD-001","t":"Procedimento Operacional Padrão de Atendimento ao Usuário","sv":"SGQ","v":"1.0.0","fase":"001","med":0},
    {"c":"POP-SGQ-ATN-001","t":"Monitoramento de Alterações Regulamentares e Comunicação Interna","sv":"SGQ","v":"1.0.0","fase":"001","med":0},
    {"c":"POP-SGQ-CTR-001","t":"Contratação de Colaboradores","sv":"SGQ","v":"","fase":"001","med":0},
    {"c":"POP-SGQ-FDB-001","t":"Feedback e Acompanhamento de Desempenho","sv":"SGQ","v":"1.0.0","fase":"001","med":0},
    {"c":"POP-SGQ-GOO-001","t":"Procedimento - Resposta a Avaliações no Google (Business Profile)","sv":"SGQ","v":"1.0.1","fase":"001","med":0},
    {"c":"POP-SGQ-KPI-001","t":"Procedimento para apuração dos Indicadores KPI-01 e KPI-02","sv":"SGQ","v":"1.0.0","fase":"001","med":0},
    {"c":"POP-SGQ-MNC-001","t":"Procedimento de Tratamento de Manifestações de Clientes","sv":"SGQ","v":"1.0.1","fase":"001","med":0},
    {"c":"POP-SGQ-ONB-001","t":"Integração de Novos Colaboradores (Onboarding)","sv":"SGQ","v":"1.0.0","fase":"001","med":0},
    {"c":"POP-SGQ-PES-001","t":"Procedimento de Consolidação Mensal da Pesquisa de Satisfação","sv":"SGQ","v":"1.0.1","fase":"001","med":0}];

  var POP_FASE_NOME={REC:'Recepção',QLF:'Qualificação',MIN:'Minuta',REV:'Revisão',ENT:'Entrega',CEL:'Celebração',CER:'Certificação',HAB:'Habilitação',LAV:'Lavratura'};
  // etapas de cada fase do RI (para saber se a mesma pessoa fez outra fase no mesmo documento)
  var POP_FASE_ETS={REC:['Prenotação (Tri7)'],QLF:['Análise','Re-Análise','Revisão de exigência (Tri7)'],MIN:['Minuta'],REV:['Revisão Oficial']};
  // tipo do erro que pertence a cada fase (categorias do Motor.nomearErro). Erro sem fase definida ("Outros", prazo…) fica com a fase avaliada.
  var POP_FASE_CAT={REC:/^prenotacao|^atos do protocolo|^cobranca|^ged|^cadastro|^fluxo/, QLF:/^qualificacao|^exigencia|^reingresso|^go-reurb|^ged|^fluxo|^cobranca/,
    MIN:/^minuta|^cadastro|^atos do protocolo|^go-reurb/, REV:/^selo|^certidao|^fluxo/};
  // nomes tolerantes: sem acento, maiúscula, "p/", "de/do/da" e pontuação (ex.: "ONR - Requerimento de Averbação" = "ONR - Requerimento Averbação")
  function popNorm(s){ return semAc(s).replace(/\bp\//g,' ').replace(/\b(de|do|da|dos|das|e)\b/g,' ').replace(/[^a-z0-9+]+/g,' ').trim().replace(/\s+/g,' '); }
  function popEtNorm(raw){ var e=semAc(raw).replace(/^\d+\s*[dh]\s*-\s*/,'').replace(/\s*-\s*\d+\s*[dh]\.?\s*$/,'').replace(/^onr\s*-\s*/,''); return popNorm(e); }
  function popsTodos(){ var M=(state.popsCfg&&state.popsCfg.map)||{}, out=[], vistos={};
    POP_BASE.forEach(function(b){ var o=Object.assign({},b,M[b.c]||{}); vistos[b.c]=1; if (!o.oc) out.push(o); });
    Object.keys(M).forEach(function(c){ if (!vistos[c] && M[c].novo && !M[c].oc) out.push(Object.assign({c:c},M[c])); });
    return out.sort(function(a,b){ var o=['RI','RC','RTD','RCPJ','SGQ']; return (o.indexOf(a.sv)-o.indexOf(b.sv)) || (a.c<b.c?-1:1); }); }
  function popDe(c){ var L=popsTodos(); for (var i=0;i<L.length;i++) if (L[i].c===c) return L[i]; return null; }
  function popMede(p){ return !!(p&&p.med&&(p.nats||[]).length&&(p.ets||[]).length); }
  function popEscopo(p){ var k=p.c+'|'+state.popsVer; state._popEsc=state._popEsc||{}; if (state._popEsc[k]) return state._popEsc[k];
    var n={}, e={}; (p.nats||[]).forEach(function(x){ n[popNorm(x)]=1; }); (p.ets||[]).forEach(function(x){ e[popEtNorm(x)]=1; });
    return (state._popEsc[k]={nats:n, ets:e}); }
  function popNoEscopo(p,x){ var E=popEscopo(p); return !!(E.nats[x.natN]&&E.ets[x.etN]); }
  function popFaseDeEt(etN){ var f=null; Object.keys(POP_FASE_ETS).forEach(function(F){ POP_FASE_ETS[F].forEach(function(e){ if (popEtNorm(e)===etN) f=F; }); }); return f; }
  function popTitulo(p){ return p.c+' — '+(p.t||''); }
  function popSalvarCfg(){ state.popsVer++; state._popEsc=null; state._aprC=null; if (dbPronto&&podeEscrever) db.doc('config/pops').set({map:state.popsCfg.map, em:new Date().toISOString(), por:nomeUsuario()}).catch(function(){ toast('Não consegui salvar o catálogo de POPs'); }); }

  // ——— Configuração › POPs e escopo ———
  function popContagens(){ var k=state.popsVer+'|'+aprExecs().length; if (state._popCnt&&state._popCnt.k===k) return state._popCnt;
    var corte=aprMesesAtras(12), nat={}, et={}, nomeN={}, nomeE={};
    aprExecs().forEach(function(x){ if (x.m<corte) return; nat[x.natN]=(nat[x.natN]||0)+1; et[x.etN]=(et[x.etN]||0)+1; nomeN[x.natN]=nomeN[x.natN]||x.nat; nomeE[x.etN]=nomeE[x.etN]||x.raw; });
    return (state._popCnt={k:k, nat:nat, et:et, nomeN:nomeN, nomeE:nomeE}); }
  function popListaHTML(L, campo, C){ return (L||[]).map(function(x){ var n=campo==='nats'?popNorm(x):popEtNorm(x), q=(campo==='nats'?C.nat:C.et)[n]||0;
      return '<span class="pop-it'+(q?'':' falta')+'" title="'+esc(q?q+' execuções nos últimos 12 meses (no VHL: '+((campo==='nats'?C.nomeN:C.nomeE)[n]||x)+')':'Não encontrei este nome nos últimos 12 meses do VHL/Tri7')+'">'+esc(x)+' <span class="mut">'+(q||'não encontrada')+'</span></span>'; }).join(''); }
  function popCfgHTML(){
    var L=popsTodos(), C=popContagens(), med=L.filter(popMede), conf=med.filter(function(p){ return !p.conf; });
    var h='<div class="sub-h" style="margin-top:16px">POPs e escopo (Aprendizagem)</div><details class="cfg-det"'+(state.popEd||state.popNovo?' open':'')+'><summary>'+L.length+' documentos · '+med.length+' com medição automática'+(conf.length?' · '+conf.length+' a conferir':'')+'</summary>'+
      '<p class="hint" style="margin:6px 0">O escopo de cada documento é o que a Aprendizagem mede: naturezas do VHL (tabela da IT de recepção) e etapas da fase. Os nomes casam sem acento, maiúscula, "p/" e "de". O número ao lado é quantas execuções aparecem nos últimos 12 meses; <b>não encontrada</b> = conferir o nome. <b>A conferir</b> = escopo sugerido pelo painel e ainda não confirmado por você. Subir a <b>versão</b> abre a lista "Quem precisa ser treinado" na Aprendizagem.</p>'+
      (podeEscrever?'<div class="ctl" style="margin:6px 0 8px"><button type="button" class="btn sm" data-popnovo="1">Adicionar documento</button></div>':'')+(state.popNovo?popNovoHTML():'')+
      '<div class="tbl-wrap"><table class="cfg-t pop-t"><thead><tr><th class="tleft">Documento</th><th class="tleft">Escopo medido</th><th>Versão</th><th></th></tr></thead><tbody>';
    var sv=null;
    L.forEach(function(p){ if (p.sv!==sv){ sv=p.sv; h+='<tr class="pop-sv"><td colspan="4">'+esc(sv)+'</td></tr>'; }
      var m=popMede(p), ed=state.popEd===p.c;
      h+='<tr><td class="tleft"><b>'+esc(p.c)+'</b>'+(p.fase&&POP_FASE_NOME[p.fase]?' <span class="pill mute">'+esc(POP_FASE_NOME[p.fase])+'</span>':'')+(m&&!p.conf?' <span class="pill warn">a conferir</span>':'')+'<div class="hint" style="margin:2px 0 0">'+esc(p.t||'')+'</div></td>'+
        '<td class="tleft">'+(m?'<div class="pop-l"><span class="mut">Naturezas:</span> '+popListaHTML(p.nats,'nats',C)+'</div><div class="pop-l"><span class="mut">Etapas:</span> '+popListaHTML(p.ets,'ets',C)+'</div>':'<span class="mut">Sem medição automática: a eficácia é avaliada por quem acompanhou (o painel registra e gera o relatório).</span>')+'</td>'+
        '<td>'+esc(p.v||'—')+(p.verDesde?'<div class="hint" style="margin:2px 0 0">desde '+fmtData(p.verDesde)+'</div>':'')+'</td><td>'+(podeEscrever?'<button type="button" class="btn sm" data-poped="'+esc(p.c)+'">Alterar</button>':'')+'</td></tr>'+(ed?'<tr class="cfg-ed"><td colspan="4">'+popFormHTML(p)+'</td></tr>':''); });
    return h+'</tbody></table></div></details>'; }
  // 0.21.1: etapas e naturezas escolhidas numa lista (o que existe no VHL/Tri7), sem digitar
  function popEtLimpo(raw){ return String(raw||'').replace(/^\s*\d+\s*[DHdh]\s*-\s*/,'').replace(/\s*-\s*\d+\s*[DHdh]\.?\s*$/,'').replace(/^ONR\s*-\s*/i,'').trim(); }
  function popOpcoes(cont, nomes, atuais, normF, limpar, minQ){ var o={};
    Object.keys(cont).forEach(function(n){ if (!n||cont[n]<minQ) return; o[n]={nome:limpar?popEtLimpo(nomes[n]):nomes[n], q:cont[n], on:false}; });
    (atuais||[]).forEach(function(x){ var n=normF(x); if (o[n]) o[n].on=true; else o[n]={nome:x, q:0, on:true}; });
    return Object.keys(o).map(function(n){ return o[n]; }).sort(function(a,b){ return (b.on-a.on)||(b.q-a.q)||a.nome.localeCompare(b.nome,'pt-BR'); }); }
  function popCaixaHTML(titulo, campo, L, ajuda){
    return '<div class="pop-box"><div class="pop-bh"><b>'+titulo+'</b> <span class="mut" data-popcont="'+campo+'">'+L.filter(function(x){ return x.on; }).length+' marcada(s)</span><input type="search" class="mini" data-popbusca="'+campo+'" placeholder="filtrar…" aria-label="Filtrar '+esc(titulo)+'"></div>'+
      (ajuda?'<p class="hint" style="margin:2px 0 6px">'+ajuda+'</p>':'')+'<div class="apr-chk pop-lista" data-poplista="'+campo+'">'+L.map(function(x){ return '<label data-popnome="'+esc(semAc(x.nome))+'"><input type="checkbox" data-pop'+campo+'="'+esc(x.nome)+'"'+(x.on?' checked':'')+'> '+esc(x.nome)+' <span class="mut">'+(x.q||'não encontrada')+'</span></label>'; }).join('')+'</div></div>'; }
  function popFormHTML(p){ var C=popContagens();
    var E=popOpcoes(C.et,C.nomeE,p.ets,popEtNorm,true,3), N=popOpcoes(C.nat,C.nomeN,p.nats,popNorm,false,1);
    return '<div class="pop-f2"><label class="pop-tit">Título <input id="popT" type="text" class="mini" value="'+esc(p.t||'')+'"></label><label>Versão <input id="popV" type="text" class="mini" value="'+esc(p.v||'')+'" placeholder="ex.: 1.0.2"></label>'+
      '<label>Medição <select id="popMed" class="mini"><option value="1"'+(p.med?' selected':'')+'>Automática</option><option value="0"'+(p.med?'':' selected')+'>Sem medição automática</option></select></label>'+
      '<label class="pop-ck"><span><input type="checkbox" id="popConf"'+(p.conf?' checked':'')+'> Escopo conferido</span></label>'+
      popCaixaHTML('Etapas','et',E,'Etapas do VHL (sem o prazo no nome; "ONR - X" conta como X) e andamentos do Tri7. O número é de execuções nos últimos 12 meses.')+
      popCaixaHTML('Naturezas','nat',N,'Naturezas do VHL. As marcadas aparecem primeiro.')+
      '<label class="pop-mot">Motivo (obrigatório) <input id="popMot" type="text" class="mini" maxlength="300" placeholder="ex.: POP revisado, nome da natureza no VHL"></label>'+
      '<span class="cfg-bt pop-acoes"><button type="button" class="btn sm primary" data-popsalvar="'+esc(p.c)+'">Salvar</button>'+(p.novo?'<button type="button" class="btn sm" data-poparq="'+esc(p.c)+'">Tirar do catálogo</button>':'')+'<button type="button" class="btn sm" data-popcancel="1">Cancelar</button></span>'+
      '<p class="hint pop-nota">Subir a versão marca a data de hoje e lista quem executou esse escopo nos últimos 12 meses para treinar de novo.</p></div>'; }
  function popFiltrar(t){ var q=semAc(t.value||''), box=document.querySelector('[data-poplista="'+t.dataset.popbusca+'"]'); if (!box) return;
    box.querySelectorAll('label').forEach(function(l){ l.hidden=!!q&&l.dataset.popnome.indexOf(q)<0; }); }
  function popMarcados(campo){ return [].slice.call(document.querySelectorAll('[data-pop'+campo+']:checked')).map(function(x){ return x.getAttribute('data-pop'+campo); }); }
  function popNovoHTML(){ return '<div class="cfg-form pop-f" style="margin-bottom:8px"><label>Código <input id="popNC" type="text" class="mini" placeholder="ex.: POP-RI-HIP-QLF"></label><label>Título <input id="popNT" type="text" class="mini"></label>'+
      '<label>Serventia <select id="popNS" class="mini">'+['RI','RC','RTD','RCPJ','SGQ'].map(function(s){ return '<option>'+s+'</option>'; }).join('')+'</select></label>'+
      '<label>Fase <select id="popNF" class="mini"><option value="">—</option>'+Object.keys(POP_FASE_NOME).map(function(f){ return '<option value="'+f+'">'+POP_FASE_NOME[f]+'</option>'; }).join('')+'</select></label>'+
      '<label class="cfg-mot">Motivo (obrigatório) <input id="popNM" type="text" class="mini" maxlength="300" placeholder="ex.: POP publicado no M4"></label>'+
      '<span class="cfg-bt"><button type="button" class="btn sm" data-popcriar="1">Adicionar</button><button type="button" class="btn sm" data-popcancel="1">Cancelar</button></span>'+
      '<p class="hint" style="margin:6px 0 0">Na fase do RI (Recepção, Qualificação, Minuta, Revisão) as etapas já vêm preenchidas; depois é só informar as naturezas em "Alterar".</p></div>'; }
  function popClique(t){ var d=t.dataset||{};
    if (d.poped){ state.popEd=state.popEd===d.poped?null:d.poped; state.popNovo=false; renderCfg(); return true; }
    if (d.popcancel){ state.popEd=null; state.popNovo=false; renderCfg(); return true; }
    if (d.popnovo){ state.popNovo=!state.popNovo; state.popEd=null; renderCfg(); return true; }
    if (d.popcriar){ var c=String(($('popNC')||{}).value||'').trim().toUpperCase(), mot=String(($('popNM')||{}).value||'').trim(), f=($('popNF')||{}).value||'';
      if (!/^(POP|IT)-[A-Z0-9-]+$/.test(c)){ toast('Código no formato POP-… ou IT-…'); return true; } if (popDe(c)){ toast('Esse código já está no catálogo'); return true; } if (!mot){ toast('Escreva o motivo'); return true; }
      var sv=($('popNS')||{}).value||'RI', o={novo:true, t:String(($('popNT')||{}).value||'').trim(), sv:sv, fase:f, v:'', med:0, conf:0, nats:[], ets:sv==='RI'&&POP_FASE_ETS[f]?POP_FASE_ETS[f].slice():[]};
      state.popsCfg.map[c]=o; popSalvarCfg(); state.popNovo=false; state.popEd=c; apurLog('Catálogo de POPs: '+c,'—','incluído','imediato',mot); apurSalvar(); return true; }
    if (d.poparq){ var mo=String(($('popMot')||{}).value||'').trim(); if (!mo){ toast('Escreva o motivo'); return true; }
      state.popsCfg.map[d.poparq]=Object.assign({},state.popsCfg.map[d.poparq],{oc:true}); popSalvarCfg(); state.popEd=null; apurLog('Catálogo de POPs: '+d.poparq,'incluído','retirado','imediato',mo); apurSalvar(); return true; }
    if (d.popsalvar){ var p=popDe(d.popsalvar), mot2=String(($('popMot')||{}).value||'').trim(); if (!mot2){ toast('Escreva o motivo da mudança'); var mm=$('popMot'); if (mm) mm.focus(); return true; }
      var novo={t:String(($('popT')||{}).value||'').trim(), v:String(($('popV')||{}).value||'').trim(), med:($('popMed')||{}).value==='1'?1:0, nats:popMarcados('nat'), ets:popMarcados('et'), conf:($('popConf')||{}).checked?1:0};
      var mud=[]; if (novo.t!==(p.t||'')) mud.push('título'); if (novo.v!==(p.v||'')) mud.push('versão '+(p.v||'—')+' → '+(novo.v||'—')); if (novo.med!==(p.med?1:0)) mud.push(novo.med?'medição automática':'sem medição');
      if (novo.nats.join('|')!==(p.nats||[]).join('|')) mud.push('naturezas'); if (novo.ets.join('|')!==(p.ets||[]).join('|')) mud.push('etapas'); if (novo.conf!==(p.conf?1:0)) mud.push(novo.conf?'conferido':'a conferir');
      if (!mud.length){ toast('Nada mudou'); return true; }
      if (novo.v!==(p.v||'')) novo.verDesde=new Date().toISOString().slice(0,10);
      state.popsCfg.map[p.c]=Object.assign({},state.popsCfg.map[p.c]||{},novo); popSalvarCfg(); state.popEd=null; apurLog('Catálogo de POPs: '+p.c,'—',mud.join(', '),'imediato',mot2); apurSalvar(); return true; }
    return false; }
