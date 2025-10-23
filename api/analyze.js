// api/gemini.js

export default async function handler(request, response) {
    // 1. POST method ဟုတ်မဟုတ် စစ်ဆေးပါ။
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method Not Allowed' });
    }

    // 2. Vercel Environment Variable ကနေ API Key ကို ရယူပါ။
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return response.status(500).json({ error: 'API key is not configured on the server.' });
    }

    const modelName = "gemini-1.5-flash-latest"; // Or your preferred model
    const googleApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

    try {
        // 3. Frontend က ပို့လိုက်တဲ့ payload ကို လက်ခံပါ။
        const payload = request.body;

        // 4. Google Gemini API ကို တဆင့်ခေါ်ဆိုပါ။
        const geminiResponse = await fetch(googleApiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });

        const geminiResult = await geminiResponse.json();
        
        // 5. Google API က error ပြန်ပေးခဲ့ရင် အဲ့ဒီ error ကို frontend ကို ပြန်ပို့ပါ။
        if (!geminiResponse.ok) {
            console.error('Google API Error:', geminiResult);
            const errorMessage = geminiResult.error?.message || 'Unknown error from Google API.';
            return response.status(geminiResponse.status).json({ error: errorMessage });
        }

        // 6. အောင်မြင်ခဲ့ရင် ရလဒ် text ကို ထုတ်ယူပြီး frontend ကို ပြန်ပို့ပေးပါ။
        const analysisText = geminiResult.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (analysisText) {
            response.status(200).send(analysisText);
        } else {
            // No content was returned, maybe due to safety settings
            console.warn('Google API returned no content:', geminiResult);
            return response.status(500).json({ error: 'API returned no valid content. It might have been blocked for safety reasons.' });
        }

    } catch (error) {
        console.error('Internal Server Error:', error);
        response.status(500).json({ error: 'An unexpected error occurred on the server.' });
    }
}
