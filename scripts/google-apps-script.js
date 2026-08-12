/* =========================================================
   Apps Script — recebe os leads da Operação Alvorada

   POR QUE ESTE ARQUIVO EXISTE
   Não existe como gravar direto numa URL do Google Sheets. O site só consegue
   fazer POST para um endpoint HTTP, e quem escreve na planilha é um Apps
   Script publicado como aplicativo web. A URL que aparece no navegador
   (docs.google.com/spreadsheets/d/...) não serve para isso.

   COMO PUBLICAR — na planilha de destino, não em outra
     1. Abra a planilha 1AP1wrKkmAi2LPLtrCahlbbU36M67Z_-CYv-RYGkCthA
     2. Extensões > Apps Script
     3. Apague o conteúdo e cole ESTE arquivo inteiro
     4. Implantar > Nova implantação > tipo "App da Web"
          Executar como:        Eu
          Quem pode acessar:    Qualquer pessoa          ← sem isto, 401
     5. Copie a URL terminada em /exec
     6. Cole em CONFIG.sheetEndpointExtra, no script.js do site, acrescentando
        ?aba=OPERACAO no fim

   O `Qualquer pessoa` do passo 4 é o que mais erra: o visitante do site não
   está logado no Google, então qualquer coisa mais restritiva rejeita o POST.

   AO REPUBLICAR: use "Gerenciar implantações" e edite a implantação existente.
   Criar uma nova gera uma URL diferente e o site continua postando na antiga.

   COMPATIBILIDADE DE FORMATO
   Aceita corpo JSON e corpo urlencoded. A versão anterior só fazia
   JSON.parse(), então um POST urlencoded estourava no parse, caía no catch e
   não gravava linha nenhuma — sem erro visível no site, porque o `no-cors`
   esconde a resposta.
   ========================================================= */

function doPost(e) {
  try {
    var dados = lerCorpo(e);
    var arquivo = SpreadsheetApp.getActiveSpreadsheet();

    // ?aba=NOME escolhe a aba de destino. Se não existir, é criada.
    var aba = (e && e.parameter && e.parameter.aba) ? String(e.parameter.aba).trim() : "";
    var planilha = aba ? arquivo.getSheetByName(aba) : null;
    if (aba && !planilha) planilha = arquivo.insertSheet(aba);
    if (!planilha) planilha = arquivo.getActiveSheet();

    var COLUNAS = ["Data e Hora", "Nome", "E-mail", "Telefone", "Produto", "Origem"];

    if (planilha.getLastRow() === 0) {
      planilha.appendRow(COLUNAS);
      var h = planilha.getRange(1, 1, 1, COLUNAS.length);
      h.setFontWeight("bold");
      h.setBackground("#AF9256");
      h.setFontColor("#0A0A0A");
      planilha.setFrozenRows(1);
      [160, 220, 250, 180, 200, 320].forEach(function (px, i) {
        planilha.setColumnWidth(i + 1, px);
      });
    }

    var agora = Utilities.formatDate(new Date(), "America/Recife", "dd/MM/yyyy HH:mm:ss");

    planilha.appendRow([
      agora,
      dados.nome || "",
      dados.email || "",
      // aceita as duas grafias: o site manda `telefone`, mas versões antigas
      // da landing mandavam `whatsapp`
      dados.telefone || dados.whatsapp || "",
      dados.produto || "",
      dados.origem || ""
    ]);

    return json({ status: "ok" });

  } catch (err) {
    return json({ status: "erro", mensagem: err.message });
  }
}

/* Lê o corpo do POST em JSON ou urlencoded, e cai para os parâmetros da query
   string se não vier corpo nenhum. */
function lerCorpo(e) {
  if (!e) return {};

  var bruto = (e.postData && e.postData.contents) ? e.postData.contents : "";

  if (bruto) {
    try {
      return JSON.parse(bruto);
    } catch (semJson) {
      var saida = {};
      bruto.split("&").forEach(function (par) {
        if (!par) return;
        var i = par.indexOf("=");
        var k = decodeURIComponent((i < 0 ? par : par.slice(0, i)).replace(/\+/g, " "));
        var v = i < 0 ? "" : decodeURIComponent(par.slice(i + 1).replace(/\+/g, " "));
        saida[k] = v;
      });
      return saida;
    }
  }

  return e.parameter || {};
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet() {
  return ContentService.createTextOutput("CPPEM Sheets — funcionando.");
}
