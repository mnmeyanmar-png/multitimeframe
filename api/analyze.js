// api/gemini.js

export const config = {
  runtime: 'edge', // Use the Vercel Edge Runtime for streaming and longer timeouts
};

export default async function handler(request) {
    // 1. Check if the method is POST
    if (request.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { status: 405, headers: { 'Content-Type': 'application/json' } });
    }

    // 2. Get API Key from Environment Variables
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error("GEMINI_API_KEY is not set in Vercel Environment Variables.");
        return new Response(JSON.stringify({ error: 'API key is not configured on the server.' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    try {
        // 3. Prepare the request to Google's API
        const modelName = "gemini-1.5-flash-latest";
        const googleApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:streamGenerateContent?key=${apiKey}`;
        const payload = await request.json(); // Get payload from the frontend

        // 4. Fetch the streaming response from Google
        const geminiResponse = await fetch(googleApiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        // 5. Handle errors from Google's API itself
        if (!geminiResponse.ok) {
            const errorResult = await geminiResponse.json();
            console.error('Google API Error:', errorResult);
            const errorMessage = errorResult.error?.message || 'Unknown error from Google API.';
            return new Response(JSON.stringify({ error: errorMessage }), { status: geminiResponse.status, headers: { 'Content-Type': 'application/json' } });
        }

        // 6. If successful, stream the response back to the client
        const readableStream = new ReadableStream({
            async start(controller) {
                const reader = geminiResponse.body.getReader();
                const decoder = new TextDecoder();
                let buffer = '';

                try {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) {
                            break;
                        }
                        // Add the new chunk to our buffer
                        buffer += decoder.decode(value, { stream: true });
                        
                        // Process lines in the buffer
                        const lines = buffer.split('\n');
                        buffer = lines.pop(); // Keep the last, possibly incomplete, line in the buffer

                        for (const line of lines) {
                            if (line.trim().startsWith('"text":')) {
                                const textPart = line.substring(line.indexOf(':') + 1).replace(/"/g, '').replace(/,$/, '').trim();
                                if (textPart) {
                                    controller.enqueue(textPart);
                                }
                            }
                        }
                    }
                } catch (e) {
                    console.error("Error while reading stream:", e);
                    controller.error(e);
                } finally {
                    controller.close();
                }
            },
        });

        return new Response(readableStream, {
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        });

    } catch (error) {
        console.error('Internal Server Error in Vercel function:', error);
        return new Response(JSON.stringify({ error: 'An unexpected error occurred on the server.' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
}
