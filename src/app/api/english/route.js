export async function POST(request) {
  try {
    const { prompt } = await request.json();

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      return Response.json({ error: `API 오류 ${response.status}: ${errText}` }, { status: 500 });
    }

    const data = await response.json();
    if (data.error) return Response.json({ error: data.error.message }, { status: 500 });

    const text = data.content.map(i => i.text || '').join('');

    // JSON 추출 - 여러 패턴 시도
    let parsed = null;

    const jsonBlockMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonBlockMatch) {
      try { parsed = JSON.parse(jsonBlockMatch[1]); } catch(e) {}
    }
    if (!parsed) {
      const codeBlockMatch = text.match(/```\s*([\s\S]*?)\s*```/);
      if (codeBlockMatch) {
        try { parsed = JSON.parse(codeBlockMatch[1]); } catch(e) {}
      }
    }
    if (!parsed) {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try { parsed = JSON.parse(jsonMatch[0]); } catch(e) {}
      }
    }
    if (!parsed) {
      try { parsed = JSON.parse(text.trim()); } catch(e) {}
    }

    if (!parsed) {
      return Response.json({ error: `JSON 파싱 실패: ${text.slice(0, 100)}` }, { status: 500 });
    }

    return Response.json(parsed);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
