export async function POST(request) {
  try {
    const { images, prompt, isGrading } = await request.json();

    const content = [];

    if (!isGrading && images && images.length > 0) {
      images.forEach(img => {
        content.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: img.type || 'image/jpeg',
            data: img.base64
          }
        });
      });
    }

    content.push({ type: 'text', text: prompt });

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        messages: [{ role: 'user', content }]
      })
    });

    const data = await response.json();
    if (data.error) return Response.json({ error: data.error.message }, { status: 500 });

    const text = data.content.map(i => i.text || '').join('');

    // JSON 추출 - 여러 패턴 시도
    let parsed = null;
    let lastError = '';

    // 1. ```json ... ``` 블록 추출
    const jsonBlockMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonBlockMatch) {
      try { parsed = JSON.parse(jsonBlockMatch[1]); } catch(e) { lastError = e.message; }
    }

    // 2. ``` ... ``` 블록 추출
    if (!parsed) {
      const codeBlockMatch = text.match(/```\s*([\s\S]*?)\s*```/);
      if (codeBlockMatch) {
        try { parsed = JSON.parse(codeBlockMatch[1]); } catch(e) { lastError = e.message; }
      }
    }

    // 3. { ... } 로 감싸진 JSON 추출
    if (!parsed) {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try { parsed = JSON.parse(jsonMatch[0]); } catch(e) { lastError = e.message; }
      }
    }

    // 4. 전체 텍스트 파싱 시도
    if (!parsed) {
      try { parsed = JSON.parse(text.trim()); } catch(e) { lastError = e.message; }
    }

    if (!parsed) {
      return Response.json({ error: `JSON 파싱 실패: ${lastError}` }, { status: 500 });
    }

    return Response.json(parsed);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
