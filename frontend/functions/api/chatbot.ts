/**
 * Cloudflare Pages Function — Gemini AI Chatbot Proxy
 * Keeps the API key secure on the server side.
 * 
 * Environment variable required in Cloudflare Pages:
 *   GEMINI_API_KEY = <your-key>
 */

interface Env {
  GEMINI_API_KEY?: string;
}

type PagesFunction<T = Record<string, unknown>> = (context: {
  request: Request;
  env: T;
  params: Record<string, string | string[]>;
  waitUntil: (promise: Promise<unknown>) => void;
  next: (input?: Request | string, init?: RequestInit) => Promise<Response>;
  data: Record<string, unknown>;
}) => Response | Promise<Response>;

const SYSTEM_INSTRUCTION = `You are D.I. Khan Care AI Health Assistant — a bilingual (Roman Urdu + English) medical triage chatbot for a doctor appointment portal serving D.I. Khan, KPK, Pakistan.

YOUR CORE RULES:
1. You ONLY help with: finding the right medical specialist, explaining symptoms, guiding appointment booking, and tracking appointments on this portal.
2. If the user asks ANYTHING unrelated to healthcare or this portal (politics, weather, coding, jokes, general knowledge, etc.), respond ONLY with:
   "Main D.I. Khan Care ka AI Assistant hoon. Main sirf doctors dhoondne, appointment book karne, appointment trace karne aur is application se mutalliq kaam me aapki madad ke liye mojood hoon. Baraaye meherbani apni bimari ya appointment ke baare me poochein."
3. When user describes symptoms, recommend the CORRECT medical specialty (e.g. Orthopedic for joint/back pain, Cardiologist for heart/chest issues, Pediatrician for children, Gynecologist for women's health, ENT for ear/nose/throat, etc.)
4. Always respond in Roman Urdu mixed with English medical terms. Keep responses SHORT (3-5 lines max).
5. NEVER diagnose — only recommend the right specialist type.
6. For emergencies, advise going to DHQ Hospital Emergency immediately.
7. Format your specialist recommendation clearly like: "Aapko **[Specialty Name]** se milna chahiye."
8. Do NOT generate doctor names, phone numbers, or clinic addresses — the portal will show real verified doctors.

AVAILABLE SPECIALTIES ON THIS PORTAL:
- Cardiologist (Dil, BP, Chest)
- Pediatrician (Bachon ke Doctor)
- Gynecologist (Khwateen ke Doctor)

UNAVAILABLE SPECIALTIES (recommend DHQ Hospital for these):
- ENT (Kaan Naak Gala)
- Ophthalmologist (Aankh)
- Dentist (Daant)
- Orthopedic (Haddi, Jod, Kamar)
- Dermatologist (Jild/Skin)
- Neurologist (Dimagh/Asab)
- Urologist (Gurda/Peshab)
- Gastroenterologist (Meda/Pait)

When a specialty is unavailable, say: "Aapka recommended doctor ([Specialty]) is portal par available nahi hai. [Specialty] ke ilaj ke liye DHQ Hospital D.I. Khan tashreef le jayein."`;

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': '*',
    'Content-Type': 'application/json',
  };

  try {
    const apiKey = context.env.GEMINI_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'Gemini API key not configured' }),
        { status: 500, headers: corsHeaders }
      );
    }

    const body = await context.request.json() as { message: string; history?: Array<{ role: string; parts: Array<{ text: string }> }> };
    const userMessage = body.message;

    if (!userMessage || typeof userMessage !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Build the Gemini API request
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const contents = [
      ...(body.history || []),
      {
        role: 'user',
        parts: [{ text: userMessage }]
      }
    ];

    const geminiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: SYSTEM_INSTRUCTION }]
        },
        contents,
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 400,
          topP: 0.9,
        },
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
        ]
      })
    });

    if (!geminiResponse.ok) {
      const errText = await geminiResponse.text();
      console.error('Gemini API error:', errText);
      return new Response(
        JSON.stringify({ error: 'Gemini API error', details: errText }),
        { status: geminiResponse.status, headers: corsHeaders }
      );
    }

    const geminiData = await geminiResponse.json() as any;
    const reply = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || 
      'Muafi chahta hoon, abhi jawab dene me mushkil ho rahi hai. Baraaye meherbani dobara koshish karein.';

    return new Response(
      JSON.stringify({ reply, model: 'gemini-2.0-flash' }),
      { status: 200, headers: corsHeaders }
    );

  } catch (err: any) {
    console.error('Chatbot proxy error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: err?.message }),
      { status: 500, headers: corsHeaders }
    );
  }
};

// Handle CORS preflight
export const onRequestOptions: PagesFunction<Env> = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Max-Age': '86400',
    },
  });
};
