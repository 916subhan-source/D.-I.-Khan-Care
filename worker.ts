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
        const apiKey = env.GEMINI_API_KEY || atob('QVEuQWI4Uk42S1FtX0VwOXhXZ3RsODJhbGpVS21BZmpoV2tSQkpxc2JsejJ1REdyYjNCaHc=');
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

        const contents = [
          ...(body.history || []),
          {
            role: 'user',
            parts: [{ text: userMessage }]
          }
        ];

        const modelsToTry = ['gemini-3.1-flash-lite', 'gemini-3.8-flash'];
        let reply = '';
        let chosenModel = '';

        for (const model of modelsToTry) {
          try {
            const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
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
                  maxOutputTokens: 350,
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

            if (geminiResponse.ok) {
              const geminiData = await geminiResponse.json() as any;
              const text = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
              if (text && text.trim().length > 0) {
                reply = text.trim();
                chosenModel = model;
                break;
              }
            }
          } catch {
            // Try next model in list
          }
        }

        // If Google API is temporarily unavailable, provide reliable triage fallback
        if (!reply) {
          const lower = userMessage.toLowerCase();

          // ── AVAILABLE SPECIALTIES ──
          if (lower.includes('dil') || lower.includes('seene') || lower.includes('chest') || lower.includes('heart') || lower.includes('bp') || lower.includes('blood pressure')) {
            reply = "Aapko **Cardiologist** (Dil ke doctor) se foran mashwara karna chahiye. Seene me shadeed dard ki soorat me foran DHQ Hospital Emergency tashreef le jayein.";
          } else if (lower.includes('bacha') || lower.includes('bachon') || lower.includes('child') || lower.includes('baby') || lower.includes('bukhar')) {
            reply = "Aapko **Pediatrician** (Bachon ke doctor) se rujoo karna chahiye. Bachon ke bukhar me foran doctor ko dikhana zaroori hota hai.";
          } else if (lower.includes('khwateen') || lower.includes('lady') || lower.includes('pregnancy') || lower.includes('aurat') || lower.includes('gynae')) {
            reply = "Aapko **Gynecologist** (Khwateen ke doctor) se appointment leni chahiye. Portal par Lady Doctors ke auqaat aur appointment slots dastyab hain.";
          }
          // ── UNAVAILABLE SPECIALTIES → DHQ Hospital ──
          else if (lower.includes('kaan') || lower.includes('kan') || lower.includes('ear') || lower.includes('naak') || lower.includes('nose') || lower.includes('gala') || lower.includes('throat') || lower.includes('ent')) {
            reply = "Aapko **ENT Specialist** (Kaan, Naak, Gala ke doctor) se milna chahiye. ⚠️ Aapka recommended doctor (ENT) is portal par available nahi hai. ENT ke ilaj ke liye **DHQ Hospital D.I. Khan** tashreef le jayein.";
          } else if (lower.includes('haddi') || lower.includes('jodon') || lower.includes('jod') || lower.includes('kamar') || lower.includes('bone') || lower.includes('ortho') || lower.includes('fracture')) {
            reply = "Aapko **Orthopedic Surgeon** (Haddi/Jodon ke doctor) se milna chahiye. ⚠️ Aapka recommended doctor (Orthopedic) is portal par available nahi hai. Orthopedic ke ilaj ke liye **DHQ Hospital D.I. Khan** tashreef le jayein.";
          } else if (lower.includes('aankh') || lower.includes('eye') || lower.includes('nazar') || lower.includes('binai')) {
            reply = "Aapko **Eye Specialist / Ophthalmologist** (Aankhon ke doctor) se milna chahiye. ⚠️ Aapka recommended doctor (Eye Specialist) is portal par available nahi hai. Aankhon ke ilaj ke liye **DHQ Hospital D.I. Khan** tashreef le jayein.";
          } else if (lower.includes('daant') || lower.includes('dant') || lower.includes('teeth') || lower.includes('tooth') || lower.includes('dental') || lower.includes('dentist')) {
            reply = "Aapko **Dentist** (Daanton ke doctor) se milna chahiye. ⚠️ Aapka recommended doctor (Dentist) is portal par available nahi hai. Daanton ke ilaj ke liye **DHQ Hospital D.I. Khan** tashreef le jayein.";
          } else if (lower.includes('jild') || lower.includes('skin') || lower.includes('daad') || lower.includes('kharish') || lower.includes('allergy') || lower.includes('derma')) {
            reply = "Aapko **Dermatologist** (Jild/Skin ke doctor) se milna chahiye. ⚠️ Aapka recommended doctor (Dermatologist) is portal par available nahi hai. Jild ke ilaj ke liye **DHQ Hospital D.I. Khan** tashreef le jayein.";
          } else if (lower.includes('dimagh') || lower.includes('brain') || lower.includes('neuro') || lower.includes('sar dard') || lower.includes('mirgi') || lower.includes('seizure')) {
            reply = "Aapko **Neurologist** (Dimagh/Asab ke doctor) se milna chahiye. ⚠️ Aapka recommended doctor (Neurologist) is portal par available nahi hai. Dimagh ke ilaj ke liye **DHQ Hospital D.I. Khan** tashreef le jayein.";
          } else if (lower.includes('gurda') || lower.includes('kidney') || lower.includes('peshab') || lower.includes('urin') || lower.includes('urolog')) {
            reply = "Aapko **Urologist** (Gurda/Peshab ke doctor) se milna chahiye. ⚠️ Aapka recommended doctor (Urologist) is portal par available nahi hai. Gurde ke ilaj ke liye **DHQ Hospital D.I. Khan** tashreef le jayein.";
          } else if (lower.includes('meda') || lower.includes('pait') || lower.includes('stomach') || lower.includes('gas') || lower.includes('hazma') || lower.includes('gastro') || lower.includes('ulcer')) {
            reply = "Aapko **Gastroenterologist** (Meda/Pait ke doctor) se milna chahiye. ⚠️ Aapka recommended doctor (Gastroenterologist) is portal par available nahi hai. Mede ke ilaj ke liye **DHQ Hospital D.I. Khan** tashreef le jayein.";
          } else if (lower.includes('sugar') || lower.includes('diabetes') || lower.includes('thyroid')) {
            reply = "Aapko **General Physician / Medicine Specialist** se milna chahiye jo sugar aur hormones ka ilaj karein. Filhaal is portal par Cardiologist aur Pediatrician mojood hain. Sugar ke makhsoos ilaj ke liye **DHQ Hospital D.I. Khan** se bhi rujoo karein.";
          }
          // ── GENERIC FALLBACK ──
          else {
            reply = "Main D.I. Khan Care ka AI Assistant hoon. Agar aap kisi bimari me mubtila hain to baraye meherbani apni alamat (jaise dil me dard, bukhar, bachon ki bimari, kaan me dard) wazeh karein taake munasib specialist recommend kiya ja sakay.";
          }
          chosenModel = 'system-triage-fallback';
        }

        return new Response(
          JSON.stringify({ reply, model: chosenModel }),
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
      const backendOrigin = env.BACKEND_URL || 'https://d-i-khan-care.vercel.app';
      const targetUrl = new URL(url.pathname + url.search, backendOrigin);
      
      const newHeaders = new Headers(request.headers);
      newHeaders.set('host', new URL(backendOrigin).host);

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
