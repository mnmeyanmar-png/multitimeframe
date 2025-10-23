export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        // 1. Client ဆီက ပုံတွေကို လက်ခံပါ
        const { uploadedImages } = request.body;
        if (!uploadedImages || Object.keys(uploadedImages).length === 0) {
            return response.status(400).json({ error: 'No images provided' });
        }

        // 2. Vercel Environment Variable က API Key ကို လျှို့ဝှက်ရယူပါ
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return response.status(500).json({ error: 'API key is not configured on the server' });
        }

        // 3. Google API ကိုခေါ်ဖို့ Payload ပြင်ဆင်ပါ
        const modelName = "gemini-2.5-flash-preview-09-2025"; // သို့မဟုတ် သင်သုံးလိုသော model
        const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

        const systemPrompt = "သင်သည် အလွန်ကျွမ်းကျင်သော market structure trader တစ်ဦးဖြစ်ပြီး Top-Down Analysis (TDA) ကို အထူးပြုပါသည်။ သင်၏ခွဲခြမ်းစိတ်ဖြာမှုသည် SMC (Smart Money Concepts) အပေါ် အခြေခံသည်။ မြန်မာဘာသာဖြင့်သာ တိကျရှင်းလင်းစွာ တုံ့ပြန်ပါ။";
        
        let userParts = [];
        userParts.push({ 
            text: "အောက်တွင် ပေးထားသော chart ပုံများကို timeframe အလိုက် ခွဲခြမ်းစိတ်ဖြာပါ။ Timeframe တစ်ခုချင်းစီအတွက် (Weekly, Daily, H4, H1, M15, M5) လက်ရှိ market structure (Uptrend/Downtrend)၊ ဈေးနှုန်း၏ လက်ရှိလှုပ်ရှားမှု (Impulsive or Corrective) နှင့် 'လက်ရှိဈေးက ဘယ်နေရာကိုရောက်နေလဲ' (ဥပမာ: key support, pullback to resistance, breaking structure) ကို သေချာဖော်ပြပါ။ \n\nခွဲခြမ်းစိတ်ဖြာမှုများကို 'Weekly Analysis', 'Daily Analysis' စသည်ဖြင့် ခေါင်းစဉ်ခွဲ၍ ရှင်းလင်းစွာရေးသားပါ။ \n\nနောက်ဆုံးတွင်၊ 'ခြုံငုံသုံးသပ်ချက် (Overall Synthesis)' အနေဖြင့် Timeframe အားလုံးကို ပေါင်းစပ်သုံးသပ်ပြီး၊ ဈေးကွက်၏ အဓိက ဦးတည်ရာ (Overall Bias) နှင့် ဖြစ်နိုင်ခြေရှိသော ကုန်သွယ်မှု အစီအစဉ်များ (Swing Trader နှင့် Scalper အတွက်) ကို အကြံပြုပေးပါ။" 
        });

        // Client ပို့လိုက်တဲ့ ပုံတွေကို Payload ထဲ ထည့်ပါ
        for (const [key, base64Data] of Object.entries(uploadedImages)) {
            if (base64Data) {
                userParts.push({ text: `\n\n--- ${key.toUpperCase()} CHART ---` });
                userParts.push({
                    inlineData: {
                        mimeType: base64Data.split(';')[0].split(':')[1],
                        data: base64Data.split(',')[1]
                    }
                });
            }
        }

        const payload = {
            contents: [{ role: "user", parts: userParts }],
            systemInstruction: { parts: [{ text: systemPrompt }] },
            generationConfig: { temperature: 0.5 }
        };

        // 4. Google Gemini API ကို နောက်ကွယ်ကနေ ခေါ်ဆိုပါ
        const geminiResponse = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!geminiResponse.ok) {
            const errorBody = await geminiResponse.json();
            throw new Error(`Google API Error: ${errorBody.error.message}`);
        }

        const result = await geminiResponse.json();
        
        if (!result.candidates || !result.candidates[0].content || !result.candidates[0].content.parts) {
             throw new Error("API response was successful but contained no valid content.");
        }

        const analysisText = result.candidates[0].content.parts[0].text;

        // 5. ရလာတဲ့အဖြေကို Client ကို ပြန်ပို့ပါ
        response.status(200).json({ result: analysisText });

    } catch (error) {
        console.error("Server-side Error:", error);
        response.status(500).json({ error: error.message || "An unknown error occurred" });
    }
}
