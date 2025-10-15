// src/app/api/operadoras/route.js
import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";

const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

export async function GET() {
    try {
        const command = new ListObjectsV2Command({
            Bucket: process.env.S3_BUCKET_NAME,
            Prefix: "processados/", // Onde seus JSONs estão
            Delimiter: "/", // Isso agrupa por "pastas"
        });

        const response = await s3Client.send(command);

        // CommonPrefixes contém as "pastas" que representam as operadoras
        const operadorasData = response.CommonPrefixes.map(prefix => {
            const name = prefix.Prefix.replace("processados/", "").replace("/", "");
            return {
                label: name.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase()), // Ex: "aurora_saude" -> "Aurora Saude"
                value: name 
            };
        });

        return NextResponse.json(operadorasData);

    } catch (error) {
        console.error("Erro ao buscar operadoras no S3:", error);
        return NextResponse.json({ error: "Falha ao buscar dados no S3" }, { status: 500 });
    }
}