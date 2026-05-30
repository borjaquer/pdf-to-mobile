import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import type { MobileContent } from '../types';
import { MOBILE_REFORMAT_SYSTEM_PROMPT, MOBILE_REFORMAT_SCHEMA } from '../prompts/mobileReformat';
import { chunkText } from '../utils/textChunker';

/**
 * Cliente Gemini 2.5 Flash con Structured Outputs.
 * Rate limit free tier: 10 RPM, 250 RPD, 250K TPM.
 */

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string;

function getClient(): GoogleGenerativeAI {
  if (!API_KEY) throw new Error('VITE_GEMINI_API_KEY no configurada');
  return new GoogleGenerativeAI(API_KEY);
}

function buildPrompt(pdfText: string): string {
  return `${MOBILE_REFORMAT_SYSTEM_PROMPT}

TEXTO DEL PDF A REFORMATEAR:
---
${pdfText}
---`;
}

/**
 * Convierte el schema TypeScript al formato que espera Gemini (usando SchemaType enum).
 */
function toGeminiSchema(tsSchema: Record<string, unknown>): Record<string, unknown> {
  const convert = (node: unknown): unknown => {
    if (typeof node !== 'object' || node === null) return node;

    const obj = node as Record<string, unknown>;

    if (obj.type === 'string' || obj.type === 'number' || obj.type === 'integer' ||
        obj.type === 'boolean' || obj.type === 'array' || obj.type === 'object') {
      const result: Record<string, unknown> = {};

      // Mapear type string → SchemaType enum
      const typeMap: Record<string, SchemaType> = {
        string: SchemaType.STRING,
        number: SchemaType.NUMBER,
        integer: SchemaType.INTEGER,
        boolean: SchemaType.BOOLEAN,
        array: SchemaType.ARRAY,
        object: SchemaType.OBJECT,
      };
      result.type = typeMap[obj.type as string] ?? SchemaType.STRING;

      if (obj.description) result.description = obj.description;
      if (obj.enum) result.enum = obj.enum;
      if (obj.properties) {
        result.properties = {};
        for (const [key, val] of Object.entries(obj.properties as Record<string, unknown>)) {
          (result.properties as Record<string, unknown>)[key] = convert(val);
        }
      }
      if (obj.items) result.items = convert(obj.items);
      if (obj.required) result.required = obj.required;

      return result;
    }

    return obj;
  };

  return convert(tsSchema) as Record<string, unknown>;
}

/**
 * Reformatea texto de PDF usando Gemini 2.5 Flash con Structured Outputs.
 * Si el texto es muy largo, lo divide en chunks y consolida.
 */
export async function reformatWithGemini(pdfText: string): Promise<MobileContent> {
  const genAI = getClient();
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 8192,
    },
  });

  const chunks = chunkText(pdfText);
  const geminiSchema = toGeminiSchema(MOBILE_REFORMAT_SCHEMA);

  if (chunks.length === 1) {
    // Caso simple: una sola petición
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: buildPrompt(chunks[0]) }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: geminiSchema as any, // eslint-disable-line @typescript-eslint/no-explicit-any
      },
    });

    const responseText = result.response.text();
    const parsed = JSON.parse(responseText) as MobileContent;
    return parsed;
  }

  // Caso multi-chunk: procesar cada chunk y consolidar
  const allResults: MobileContent[] = [];
  for (let i = 0; i < chunks.length; i++) {
    const chunkPrompt = `${MOBILE_REFORMAT_SYSTEM_PROMPT}

Este es el CHUNK ${i + 1} de ${chunks.length} del PDF. Extrae SOLO los días/itinerario de este fragmento.

TEXTO (CHUNK ${i + 1}/${chunks.length}):
---
${chunks[i]}
---`;

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: chunkPrompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: geminiSchema as any, // eslint-disable-line @typescript-eslint/no-explicit-any
      },
    });

    const responseText = result.response.text();
    const parsed = JSON.parse(responseText) as MobileContent;
    allResults.push(parsed);
  }

  // Consolidar: merge de days, accommodations, services
  const consolidated: MobileContent = {
    title: allResults[0]?.title ?? 'Documento PDF',
    days: allResults.flatMap(r => r.days ?? []),
    accommodations: allResults.flatMap(r => r.accommodations ?? []),
    services: allResults.flatMap(r => r.services ?? []),
    notes: allResults.flatMap(r => r.notes ?? []),
  };

  return consolidated;
}

export default reformatWithGemini;
