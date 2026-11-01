/**
 * Cloudflare Pages Function — Gemini AI Chatbot Proxy
 * Keeps the API key secure on the server side.
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

const SYSTEM_INSTRUCTION = `You are D.I. Khan Care AI Health Assistant — a smart, empathetic, bilingual (Roman Urdu + English) medical triage chatbot for the D.I. Khan Care Doctor Appointment portal in D.I. Khan, KPK, Pakistan.

YOUR CORE RULES:
1. You ONLY assist with: medical symptoms triage, recommending the right specialist doctor, appointment booking guidance, and tracking appointments on this portal.
2. If the user asks anything unrelated to health, symptoms, or this clinic portal, reply politely:
   "👋 **D.I. Khan Care AI Assistant**\nMain sirf doctors dhoondne, appointment book karne aur health consultation me madad karta hoon.\n\nBaraaye meherbani apni bimari ya appointment ke baare me poochein."
3. MESSAGE FORMATTING RULES (VERY IMPORTANT):
   Always structure your response cleanly with clear section headings, bullet points, and appropriate emojis:

   Structure to follow:
   🩺 **Tajweez Karda Specialist:**
   Aapko **[Specialty Name]** ([Urdu Explanation in brackets]) se rujoo karna chahiye.

   📋 **Hidayat & Agle Iqdamaat:**
   • [Short explanation in Roman Urdu regarding symptoms]
   • [Actionable step, e.g. booking an appointment on this portal]

   🏥 **Dastyabi (D.I. Khan):**
   [State whether available on this portal to book below, or direct to DHQ Hospital Emergency/OPD]

   🚨 **Emergency Disclaimer (if chest pain/breathing issue/emergency):**
   Shadeed takleef ki soorat me foran DHQ Hospital Emergency D.I. Khan tashreef le jayein.

4. Keep responses concise, clean, scannable, and respectful. Use Roman Urdu mixed with clear English medical terms.
5. NEVER formulate a definitive diagnosis — only recommend the correct medical specialist field.
6. When the patient describes symptoms related to heart, chest pain, blood pressure, diabetes, adult fever, weakness, or general medical checkup, recommend consulting **Dr. Waqar Khan Gandapur** (Consultant Cardiologist & Physician) who is verified and available on this application!

ACTIVE VERIFIED DOCTORS ON THIS PORTAL:
- **Dr. Waqar Khan Gandapur** (MBBS, FCPS) — Consultant Cardiologist & General Adult Medicine Specialist.
  Specialties: Dil, Blood Pressure (BP), Chest, Hypertension, Diabetes Care, and Adult General Checkup.
  Clinic: Opposite China Plaza, Circular Road, D.I. Khan. Available for in-person consultation booking directly on this portal!

AVAILABLE SPECIALTIES ON THIS PORTAL:
- Cardiologist & General Medicine / Adult Care (Dr. Waqar Khan Gandapur)
- Pediatrician (Bachon ke Doctor)
- Gynecologist (Khwateen ke Doctor)

UNAVAILABLE SPECIALTIES (Advise visiting DHQ Hospital D.I. Khan):
- ENT (Kaan, Naak, Gala)
- Orthopedic (Haddi, Jod, Kamar)
- Ophthalmologist (Aankh)
- Dentist (Daant)
- Dermatologist (Skin / Jild)
- Neurologist (Dimagh, Asab)
- Urologist (Gurda, Masana)
- Gastroenterologist (Meda, Pait)
`;

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': '*',
    'Content-Type': 'application/json',
  };

  const apiKey = context.env.GEMINI_API_KEY || atob('QVEuQWI4Uk42S1FtX0VwOXhXZ3RsODJhbGpVS21BZmpoV2tSQkpxc2JsejJ1REdyYjNCaHc=');
  const testUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${apiKey}`;

  try {
    const res = await fetch(testUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: 'Salam! Reply in one short sentence confirming Gemini API key is working.' }] }]
      })
    });
    if (res.ok) {
      const data = await res.json() as any;
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      return new Response(JSON.stringify({
        status: 'SUCCESS',
        gemini_api_key_valid: true,
        model: 'gemini-3.1-flash-lite',
        reply: text?.trim(),
        endpoint: '/api/chatbot'
      }, null, 2), { status: 200, headers: corsHeaders });
    }
  } catch (err: any) {
    return new Response(JSON.stringify({ status: 'ERROR', error: err?.message }), { status: 500, headers: corsHeaders });
  }

  return new Response(JSON.stringify({ status: 'ONLINE', message: 'Chatbot endpoint is ready. Send POST with { "message": "your query" }' }), { status: 200, headers: corsHeaders });
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': '*',
    'Content-Type': 'application/json',
  };

  try {
    const apiKey = context.env.GEMINI_API_KEY || atob('QVEuQWI4Uk42S1FtX0VwOXhXZ3RsODJhbGpVS21BZmpoV2tSQkpxc2JsejJ1REdyYjNCaHc=');
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

    const contents = [
      ...(body.history || []),
      {
        role: 'user',
        parts: [{ text: userMessage }]
      }
    ];

    const modelsToTry = ['gemini-flash-lite-latest', 'gemini-3.5-flash-lite', 'gemini-3-flash-preview', 'gemini-3.1-flash-lite', 'gemini-3.8-flash', 'gemini-3.5-flash'];
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
              temperature: 0.3,
              maxOutputTokens: 400,
              topP: 0.85,
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
        // Try next model
      }
    }

    // Reliable structured fallback
    if (!reply) {
      const lower = userMessage.toLowerCase();

      if (lower.includes('dil') || lower.includes('seene') || lower.includes('chest') || lower.includes('heart') || lower.includes('bp') || lower.includes('blood pressure')) {
        reply = "🩺 **Tajweez Karda Specialist:**\nAapko **Cardiologist (Dil ke Specialist Doctor)** se foran mashwara karna chahiye.\n\n📋 **Hidayat & Agle Iqdamaat:**\n• Seene ka dabao ya blood pressure ki takleef ko foran check karwayein.\n• Is portal par **Dr. Waqar Khan Gandapur** (Cardiologist) ke appointment slots dastyab hain.\n\n🚨 **Emergency Disclaimer:**\nAgar seene me shadeed dard ya sans ruk rahi ho to foran **DHQ Hospital Emergency D.I. Khan** tashreef le jayein.";
      } else if (lower.includes('bacha') || lower.includes('bachon') || lower.includes('child') || lower.includes('baby') || lower.includes('bukhar')) {
        reply = "🩺 **Tajweez Karda Specialist:**\nAapko **Pediatrician (Bachon ke Specialist Doctor)** se rujoo karna chahiye.\n\n📋 **Hidayat & Agle Iqdamaat:**\n• Bachon me bukhar, ulti ya sans ki takleef ko nazar-andaz na karein.\n• Portal par mojood Pediatricians ke slots dekhne ke liye neeche button dabayein.";
      } else if (lower.includes('khwateen') || lower.includes('lady') || lower.includes('pregnancy') || lower.includes('aurat') || lower.includes('gynae')) {
        reply = "🩺 **Tajweez Karda Specialist:**\nAapko **Gynecologist (Khwateen ki Specialist Doctor)** se appointment leni chahiye.\n\n📋 **Hidayat & Agle Iqdamaat:**\n• Portal par Lady Doctors ke auqaat aur appointment slots dastyab hain.\n• Neeche profile dekh kar appointment confirm karein.";
      } else if (lower.includes('kaan') || lower.includes('kan') || lower.includes('ear') || lower.includes('naak') || lower.includes('nose') || lower.includes('gala') || lower.includes('throat') || lower.includes('ent')) {
        reply = "🩺 **Tajweez Karda Specialist:**\nAapko **ENT Specialist (Kaan, Naak & Gala)** se milna chahiye.\n\n🏥 **Dastyabi:**\n• Filhaal is portal par ENT clinic active nahi hai.\n• Kaan, naak ya gale ke tasalli-bakhsh ilaj ke liye **DHQ Hospital D.I. Khan** tashreef le jayein.";
      } else if (lower.includes('haddi') || lower.includes('jodon') || lower.includes('jod') || lower.includes('kamar') || lower.includes('bone') || lower.includes('ortho') || lower.includes('fracture')) {
        reply = "🩺 **Tajweez Karda Specialist:**\nAapko **Orthopedic Surgeon (Haddi/Jodon ke Doctor)** se milna chahiye.\n\n🏥 **Dastyabi:**\n• Filhaal is portal par Orthopedic clinic active nahi hai.\n• X-ray aur ilaj ke liye **DHQ Hospital D.I. Khan** tashreef le jayein.";
      } else if (lower.includes('aankh') || lower.includes('eye') || lower.includes('nazar') || lower.includes('binai')) {
        reply = "🩺 **Tajweez Karda Specialist:**\nAapko **Eye Specialist / Ophthalmologist (Aankhon ke Doctor)** se milna chahiye.\n\n🏥 **Dastyabi:**\n• Aankhon ke muaine ke liye **DHQ Hospital D.I. Khan Eye OPD** tashreef le jayein.";
      } else if (lower.includes('daant') || lower.includes('dant') || lower.includes('teeth') || lower.includes('tooth') || lower.includes('dental') || lower.includes('dentist')) {
        reply = "🩺 **Tajweez Karda Specialist:**\nAapko **Dentist (Daanton ke Doctor)** se milna chahiye.\n\n🏥 **Dastyabi:**\n• Daanton ki takleef ya fillings ke liye **DHQ Hospital Dental Ward D.I. Khan** se rujoo karein.";
      } else if (lower.includes('jild') || lower.includes('skin') || lower.includes('daad') || lower.includes('kharish') || lower.includes('allergy') || lower.includes('derma')) {
        reply = "🩺 **Tajweez Karda Specialist:**\nAapko **Dermatologist (Jild/Skin ke Doctor)** se milna chahiye.\n\n🏥 **Dastyabi:**\n• Jild ki allergy ya kharish ke ilaj ke liye **DHQ Hospital D.I. Khan** tashreef le jayein.";
      } else if (lower.includes('dimagh') || lower.includes('brain') || lower.includes('neuro') || lower.includes('sar dard') || lower.includes('mirgi') || lower.includes('seizure')) {
        reply = "🩺 **Tajweez Karda Specialist:**\nAapko **Neurologist (Dimagh/Asab ke Doctor)** se milna chahiye.\n\n🏥 **Dastyabi:**\n• Shadeed sar dard ya asabi takleef ke liye **DHQ Hospital D.I. Khan** tashreef le jayein.";
      } else if (lower.includes('gurda') || lower.includes('kidney') || lower.includes('peshab') || lower.includes('urin') || lower.includes('urolog')) {
        reply = "🩺 **Tajweez Karda Specialist:**\nAapko **Urologist (Gurda/Peshab ke Doctor)** se milna chahiye.\n\n🏥 **Dastyabi:**\n• Gurde ke ilaj ya ultrasound ke liye **DHQ Hospital D.I. Khan** tashreef le jayein.";
      } else if (lower.includes('meda') || lower.includes('pait') || lower.includes('stomach') || lower.includes('gas') || lower.includes('hazma') || lower.includes('gastro') || lower.includes('ulcer')) {
        reply = "🩺 **Tajweez Karda Specialist:**\nAapko **Gastroenterologist (Meda/Pait ke Doctor)** se milna chahiye.\n\n🏥 **Dastyabi:**\n• Mede me shadeed jalan ya ulcer ke liye **DHQ Hospital D.I. Khan** tashreef le jayein.";
      } else if (lower.includes('sugar') || lower.includes('diabetes') || lower.includes('thyroid') || lower.includes('physician') || lower.includes('medical specialist')) {
        reply = "🩺 **Tajweez Karda Specialist:**\nAapko **Consultant Physician / Cardiologist** se milna chahiye.\n\n📋 **Hidayat & Agle Iqdamaat:**\n• Sugar, BP aur general health checkup ke liye portal par **Dr. Waqar Khan Gandapur** dastyab hain.\n• Neeche diye gaye card se unki appointment book karein.";
      } else {
        reply = "👋 **D.I. Khan Care AI Assistant:**\nMain doctor dhoondne aur appointment book karne me aapki madad ke liye tayyar hoon.\n\n📋 **Aap yeh pooch sakte hain:**\n• *'Dil me dard aur blood pressure'* (Dr. Waqar Khan Gandapur)\n• *'Bache ko bukhar hai'* (Pediatrician)\n• *'Appointment kaise book karein'* ya *'Trace visit'*";
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
};
