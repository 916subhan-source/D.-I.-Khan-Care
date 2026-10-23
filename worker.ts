interface Env {
  GEMINI_API_KEY?: string;
  BACKEND_URL?: string;
  ASSETS: { fetch: (request: Request) => Promise<Response> };
}

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

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
      'Access-Control-Allow-Headers': '*',
      'Content-Type': 'application/json',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
          'Access-Control-Allow-Headers': '*',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    if (url.pathname === '/api/debug-env') {
      return new Response(JSON.stringify({
        version: 'v-gemini-3.8-flash-debug',
        hasGeminiKey: !!env.GEMINI_API_KEY,
        geminiKeyPrefix: env.GEMINI_API_KEY ? env.GEMINI_API_KEY.substring(0, 5) : null,
        envKeys: Object.keys(env || {})
      }), { headers: corsHeaders });
    }

    if (url.pathname === '/api/chatbot' || url.pathname.endsWith('/api/chatbot')) {
      if (request.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: corsHeaders });
      }

      try {
        const apiKey = env.GEMINI_API_KEY;
        if (!apiKey) {
          return new Response(
            JSON.stringify({ error: 'Gemini API key not configured' }),
            { status: 500, headers: corsHeaders }
          );
        }

        const body = await request.json() as { message: string; history?: Array<{ role: string; parts: Array<{ text: string }> }> };
        const userMessage = body.message;

        if (!userMessage || typeof userMessage !== 'string') {
          return new Response(
            JSON.stringify({ error: 'Message is required' }),
            { status: 400, headers: corsHeaders }
          );
        }

        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${apiKey}`;
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
          return new Response(
            JSON.stringify({ error: 'Gemini API error', details: errText }),
            { status: geminiResponse.status, headers: corsHeaders }
          );
        }

        const geminiData = await geminiResponse.json() as any;
        const reply = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || 
          'Muafi chahta hoon, abhi jawab dene me mushkil ho rahi hai. Baraaye meherbani dobara koshish karein.';

        return new Response(
          JSON.stringify({ reply, model: 'gemini-3.8-flash' }),
          { status: 200, headers: corsHeaders }
        );
      } catch (err: any) {
        return new Response(
          JSON.stringify({ error: 'Internal server error', details: err?.message }),
          { status: 500, headers: corsHeaders }
        );
      }
    }

    if (url.pathname.startsWith('/api/v1')) {
      const backendOrigin = env.BACKEND_URL || 'https://dikhan-care-api.loca.lt';
      const targetUrl = new URL(url.pathname + url.search, backendOrigin);
      
      const newHeaders = new Headers(request.headers);
      newHeaders.set('host', new URL(backendOrigin).host);
      newHeaders.set('bypass-tunnel-reminder', '1');

      try {
        const backendResp = await fetch(targetUrl.toString(), {
          method: request.method,
          headers: newHeaders,
          body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
          redirect: 'follow',
        });

        const respHeaders = new Headers(backendResp.headers);
        respHeaders.set('Access-Control-Allow-Origin', '*');
        respHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
        respHeaders.set('Access-Control-Allow-Headers', '*');

        return new Response(backendResp.body, {
          status: backendResp.status,
          statusText: backendResp.statusText,
          headers: respHeaders,
        });
      } catch (err: any) {
        return new Response(
          JSON.stringify({ error: 'Backend unreachable', details: err?.message }),
          { status: 502, headers: corsHeaders }
        );
      }
    }

    // Pass any other request to static assets if available
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response('Not found', { status: 404 });
  }
};
