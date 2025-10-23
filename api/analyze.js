// File Path: api/analyze.js

export default async function handler(request, response) {
  // Only allow POST requests for security
  if (request.method !== 'POST') {
    return response.status(405).json({ message: 'Method Not Allowed' });
  }

  // Get the API key from Vercel's environment variables
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    // If the key is not set, return a server error
    return response.status(500).json({ 
        error: { message: 'API key is not configured on the server.' } 
    });
  }
  
  // Use a stable, recent model
  const modelName = "gemini-1.5-flash-preview-0514";
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

  try {
    // Make the actual request to the Google Gemini API
    const geminiResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      // Forward the exact body received from the frontend
      body: JSON.stringify(request.body) 
    });

    const responseData = await geminiResponse.json();

    // If Google's API returns an error, forward that error to the client
    if (!geminiResponse.ok) {
      console.error('Gemini API Error:', responseData);
      return response.status(geminiResponse.status).json({ error: responseData.error });
    }

    // If successful, send the data back to the client
    return response.status(200).json(responseData);

  } catch (error) {
    console.error('Internal Server Error:', error);
    return response.status(500).json({ 
        error: { message: `An internal server error occurred: ${error.message}` } 
    });
  }
}
