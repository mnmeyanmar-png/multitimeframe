// File Path: api/analyze.js

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ message: 'Method Not Allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return response.status(500).json({ 
        error: { message: 'API key is not configured on the server.' } 
    });
  }
  
  // LAST ATTEMPT: Using a very stable, globally available vision model
  const modelName = "gemini-1.0-pro-vision-latest"; 
  
  // Using the stable 'v1' API endpoint
  const apiUrl = `https://generativelanguage.googleapis.com/v1/models/${modelName}:generateContent?key=${apiKey}`;

  try {
    const geminiResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request.body) 
    });

    const responseData = await geminiResponse.json();

    if (!geminiResponse.ok) {
      console.error('Gemini API Error:', responseData);
      const errorMessage = responseData.error?.message || 'Unknown API error occurred.';
      return response.status(geminiResponse.status).json({ error: { message: errorMessage } });
    }

    return response.status(200).json(responseData);

  } catch (error) {
    console.error('Internal Server Error:', error);
    return response.status(500).json({ 
        error: { message: `An internal server error occurred: ${error.message}` } 
    });
  }
}
