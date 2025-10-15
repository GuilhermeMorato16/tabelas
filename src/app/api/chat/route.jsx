// Arquivo: src/app/api/chat/route.js

import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { GoogleGenerativeAI } from '@google/generative-ai';

// --- INICIALIZAÇÃO (sem alterações) ---
if (!process.env.FIREBASE_SERVICE_ACCOUNT_BASE64 || !process.env.GEMINI_API_KEY) {
  throw new Error('As variáveis de ambiente não foram carregadas corretamente.');
}
const serviceAccountJson = Buffer.from(
  process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64'
).toString('utf-8');
const serviceAccount = JSON.parse(serviceAccountJson);
if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const db = admin.firestore();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// --- ROTA DA API ---
export async function POST(request) {
  try {
    const body = await request.json();
    // AGORA SÓ PRECISAMOS DA MENSAGEM DO FRONTEND
    const { message } = body;

    if (!message) {
      return NextResponse.json({ error: 'A mensagem é obrigatória' }, { status: 400 });
    }

    // --- ETAPA 1: BUSCAR A LISTA DE OPERADORAS DISPONÍVEIS ---
    const operadorasSnapshot = await db.collection('operadoras').get();
    const listaDeOperadoras = operadorasSnapshot.docs.map(doc => doc.data().label); // Ex: ['Aurora Saúde', 'QualiPRO Unimed BH']

    // --- ETAPA 2: PRIMEIRA CHAMADA À IA PARA IDENTIFICAR A OPERADORA ---
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    
    const promptDeIdentificacao = `
Você é um assistente virtual especialista em planos de saúde, focado em ajudar usuários a encontrar informações precisas sobre os planos disponíveis.

---

### CONTEXTO COM DADOS DO BANCO
# Use as informações abaixo para responder a TODAS as perguntas sobre planos, operadoras e valores.
# Responda APENAS com base nos dados fornecidos aqui. Não invente informações.

[
  {
    "operadora": "Aurora Saúde",
    "planos": [
      {
        "nome": "A100 AMBULATORIAL",
        "acomodacao": "N/A",
        "precos": [
          { "faixa": "00-18", "valor": 127.62 },
          { "faixa": "19-23", "valor": 153.15 }
          // ...outras faixas
        ]
      },
      {
        "nome": "A200 AMB. + HOSP. ENFERMARIA",
        "acomodacao": "Enfermaria",
        "precos": [
          { "faixa": "00-18", "valor": 127.62 },
          { "faixa": "19-23", "valor": 153.15 },
          { "faixa": "24-28", "valor": 189.89 },
          { "faixa": "29-33", "valor": 220.28 },
          { "faixa": "34-38", "valor": 246.70 },
          { "faixa": "39-43", "valor": 278.78 },
          { "faixa": "44-48", "valor": 345.69 },
          { "faixa": "49-53", "valor": 394.09 },
          { "faixa": "54-58", "valor": 496.54 },
          { "faixa": "59+", "valor": 759.69 }
        ]
      }
      // ...outros planos da Aurora Saúde
    ]
  },
  {
    "operadora": "QualiPRO Unimed BH ABRACEM",
    "planos": [
      // ...dados dos planos da QualiPRO
    ]
  }
  // ...outras operadoras e seus dados
]


---

### REGRAS DE COMPORTAMENTO

1.  **Fonte da Verdade**: Baseie TODAS as suas respostas sobre preços e planos EXCLUSIVAMENTE nas informações fornecidas na seção [CONTEXTO COM DADOS DO BANCO].

2.  **Interação Inicial**: Se o usuário não especificar o que busca, faça perguntas para entender suas necessidades (faixa etária, número de pessoas, tipo de plano desejado).

3.  **Consulta de Preços**:
    * Ao ser perguntado sobre valores, identifique a operadora e o plano no CONTEXTO.
    * Se o usuário informar **apenas uma faixa etária** (ex: "27 anos"), mostre **apenas o valor correspondente a essa faixa**.
    * Se o usuário informar **múltiplos beneficiários** (ex: "um adulto de 30 e um de 45"), mostre o valor detalhado para cada faixa etária correspondente.
    * Sempre formate os valores em moeda brasileira (R$).

4.  **Planos a Ignorar**: Ignore completamente os planos "Aeromédico" e "Plenus 1", mesmo que o usuário pergunte sobre eles. Aja como se não existissem no contexto fornecido. Se o usuário insistir, responda: "Desculpe, não tenho informações sobre este plano. Posso ajudar com as opções disponíveis?"

5.  **Tom e Estilo**:
    * Seja sempre amigável, claro e objetivo.
    * Evite respostas longas. Vá direto ao ponto.
    * Se não encontrar a informação no CONTEXTO, diga que não possui essa informação no momento.

### EXEMPLOS DE EXECUÇÃO

**Entrada do usuário:** "Qual o valor do plano A200 da Aurora Saúde para quem tem 35 anos?"
**Sua Resposta:** "O valor do plano A200 AMB. + HOSP. ENFERMARIA para a faixa de 34-38 anos é de R$ 246,70."

**Entrada do usuário:** "quais operadoras voce trabalha?"
**Sua Resposta:** "Trabalho com as seguintes operadoras: Aurora Saúde, QualiPRO Unimed BH ABRACEM e SINDINAPI." (Esta lista deve ser extraída do CONTEXTO).

**Entrada do usuário:** "quanto custa para um casal de 30 e 55 anos?"
**Sua Resposta:** "Para qual plano e operadora você gostaria da cotação? Assim posso verificar os valores para as faixas de 29-33 anos e 54-58 anos."
      `;

    const resultIdentificacao = await model.generateContent(promptDeIdentificacao);
    const responseIdentificacao = await resultIdentificacao.response;
    let operadoraIdentificada = responseIdentificacao.text().trim();

    // Se a IA não identificar, verificamos se alguma palavra chave existe na mensagem
    if (operadoraIdentificada === "Nenhuma") {
        const encontrada = listaDeOperadoras.find(op => message.toLowerCase().includes(op.toLowerCase().split(' ')[0]));
        if(encontrada) operadoraIdentificada = encontrada;
    }
    
    if (operadoraIdentificada === "Nenhuma") {
      return NextResponse.json({ reply: `Não consegui identificar sobre qual de nossas operadoras parceiras (${listaDeOperadoras.join(', ')}) você está perguntando. Poderia especificar?` });
    }

    // --- ETAPA 3: BUSCAR OS DADOS DA OPERADORA IDENTIFICADA ---
    let contextoDosPrecos = "Nenhuma informação de preço encontrada.";
    const planosSnapshot = await db.collection('planos_saude_extraidos')
      .where('empresa', '==', operadoraIdentificada) // Usa a operadora que a IA identificou
      .limit(1)
      .get();

    if (!planosSnapshot.empty) {
        const dadosDaEmpresa = planosSnapshot.docs[0].data();
        const planos = dadosDaEmpresa.planos || [];
        let textoDosPlanos = "";
        planos.forEach(plano => {
            textoDosPlanos += `\nPlano: "${plano.produto}"\n`;
            textoDosPlanos += `Acomodação: ${plano.acomodacao}\n`;
            const precosObj = plano.acomodacao_preco.enfermaria?.[0] || plano.acomodacao_preco.apartamento?.[0] || plano.acomodacao_preco.nenhum?.[0];
            if (precosObj) {
                textoDosPlanos += "Preços por faixa etária:\n";
                Object.keys(precosObj).sort((a, b) => parseInt(a) - parseInt(b)).forEach(faixa => {
                    textoDosPlanos += `- ${faixa.replace('-', ' a ')} anos: R$ ${precosObj[faixa]}\n`;
                });
            }
        });
        if (textoDosPlanos) {
            contextoDosPrecos = textoDosPlanos;
        }
    }
    
    // --- ETAPA 4: SEGUNDA CHAMADA À IA PARA RESPONDER À PERGUNTA ---
    const promptDeResposta = `
      Você é um assistente virtual de atendimento da empresa de planos de saúde chamada '${operadoraIdentificada}'.
      Use SOMENTE as informações de contexto abaixo para responder à pergunta do cliente.
      Se a pergunta não puder ser respondida com o contexto, diga que você não tem essa informação.
      Seja breve e amigável.

      --- CONTEXTO COM DADOS DOS PLANOS E PREÇOS ---
      ${contextoDosPrecos}
      --- FIM DO CONTEXTO ---

      PERGUNTA DO CLIENTE: "${message}"
    `;

    const resultResposta = await model.generateContent(promptDeResposta);
    const responseResposta = await resultResposta.response;
    const botReply = responseResposta.text();
    
    await db.collection('conversas_chat').add({
      empresa: operadoraIdentificada,
      pergunta_usuario: message,
      resposta_ia: botReply,
      timestamp: new Date(),
    });

    return NextResponse.json({ reply: botReply });

  } catch (error) {
    console.error("ERRO DENTRO DO POST:", error);
    return NextResponse.json({ error: 'Ocorreu um erro ao processar a requisição.' }, { status: 500 });
  }
}