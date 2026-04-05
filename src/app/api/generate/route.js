export async function POST(request) {
  try {
    const { imageBase64, imageType, prompt } = await request.json();
    const mediaType = imageType || 'image/jpeg';
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: imageBase64 } },
            { type: 'text', text: prompt }
          ]
        }]
      })
    });
    const data = await response.json();
    if (data.error) return Response.json({ error: data.error.message }, { status: 500 });
    const text = data.content.map(i => i.text || '').join('');
    const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
    return Response.json(parsed);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
