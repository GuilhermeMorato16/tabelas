// Local do arquivo: src/app/api/planos/[operadora]/route.js

import { S3Client, ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";

// A configuração do cliente S3 continua a mesma
const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

export async function GET(request, { params }) {
    const { operadora } = params; // Ex: "aurora_saude"

    if (!operadora) {
        return NextResponse.json({ error: "Nome da operadora é obrigatório" }, { status: 400 });
    }

    console.log(`Buscando planos para a operadora: ${operadora}`);

    try {
        // Passo 1: Listar os objetos para encontrar o nome do arquivo JSON na "pasta" da operadora.
        const listCommand = new ListObjectsV2Command({
            Bucket: process.env.S3_BUCKET_NAME,
            Prefix: `processados/${operadora}/`,
        });
        const listResponse = await s3Client.send(listCommand);

        // Se a pasta estiver vazia ou não existir, retorna nulo.
        if (!listResponse.Contents || listResponse.Contents.length === 0) {
            console.warn(`Nenhum arquivo encontrado para a operadora: ${operadora}`);
            return NextResponse.json(null); // O frontend tratará isso como "sem dados".
        }

        // Pega a chave (caminho completo) do primeiro arquivo encontrado.
        const objectKey = listResponse.Contents[0].Key;
        console.log(`Arquivo encontrado no S3: ${objectKey}`);

        // Passo 2: Buscar o conteúdo desse objeto específico.
        const getCommand = new GetObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: objectKey,
        });
        const getResponse = await s3Client.send(getCommand);
        
        // ✅ CORREÇÃO PRINCIPAL: Forma mais moderna e segura de ler o stream do corpo da resposta.
        const bodyString = await getResponse.Body.transformToString("utf-8");
        const jsonData = JSON.parse(bodyString);

        console.log(`JSON para '${operadora}' enviado com sucesso.`);
        
        // Retorna o conteúdo do JSON para o frontend.
        return NextResponse.json(jsonData);

    } catch (error) {
        // Log detalhado do erro no terminal do servidor (importante para debug)
        console.error(`ERRO ao buscar planos para ${operadora} no S3:`, error);
        
        // Retorna uma mensagem de erro genérica para o frontend
        return NextResponse.json({ error: "Falha ao buscar os detalhes do plano no servidor." }, { status: 500 });
    }
}