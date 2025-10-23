// api/gemini.js

// Node.js 18+ မှာ built-in ပါတဲ့ TransformStream ကိုသုံးဖို့လိုပါမယ်။
// Vercel က ဒါကို support လုပ်ပါတယ်။
export const config = {
  runtime: 'edge', // Use the Vercel Edge Runtime for streaming
};

export default async function handler(request) {
    if (request.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { status: 405, headers: { 'Content-Type': 'application/json' } });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return new Response(JSON.stringify({ error: 'API key is not configured on the server.' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    const modelName = "gemini-1.5-flash-latest";
    // We need to add `stream=true` to the model action
    const googleApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:streamGenerateContent?key=${apiKey}`;

    try {
        const payload = await request.json();

        const geminiResponse = await fetch(googleApiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });

        if (!geminiResponse.ok) {
            const errorResult = await geminiResponse.json();
            console.error('Google API Error:', errorResult);
            const errorMessage = errorResult.error?.message || 'Unknown error from Google API.';
            return new Response(JSON.stringify({ error: errorMessage }), { status: geminiResponse.status, headers: { 'Content-Type': 'application/json' } });
        }

        // Create a new readable stream to pipe the response
        const readableStream = new ReadableStream({
            async start(controller) {
                const reader = geminiResponse.body.getReader();
                const decoder = new TextDecoder();

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) {
                        break;
                    }
                    const chunk = decoder.decode(value);
                    // The response from Google is chunked JSON, we need the text part.
                    try {
                        const lines = chunk.split('\n');
                        for (const line of lines) {
                            if (line.trim().startsWith('"text":')) {
                                const textPart = line.replace('"text": "', '').replace('",', '').trim();
                                controller.enqueue(textPart);
                            }
                        }
                    } catch (e) {
                         // Ignore parsing errors for incomplete chunks
                    }
                }
                controller.close();
            },
        });

        return new Response(readableStream, {
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        });

    } catch (error) {
        console.error('Internal Server Error:', error);
        return new Response(JSON.stringify({ error: 'An unexpected error occurred on the server.' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
}
