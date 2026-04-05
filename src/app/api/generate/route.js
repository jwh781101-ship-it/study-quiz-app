export async function POST(request) {
  try {
    const body = await request.json();
    const { images, prompt, isGrading } = body;

    const content = [];

    if (!isGrading && images && images.length > 0) {
      for (const img of images) {
        // HEIC 등 지원 안되는 형식은 jpeg로 강제 변환
        const mediaType = (() => {
          const t = (img.type || '').toLowerCase();
          if (t.includes('png')) return 'image/png';
          if (t.includes('gif')) return 'image/gif';
          if (t.includes('webp')) return 'image/webp';
          return 'image/jpeg'; // 기본값
        })();

        content.push({
          type: 'image',
          source: { type: 'base64', media_type: mediaType, data: img.base64 }
        });
      }
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

    if (!response.ok) {
      const errText = await response.text();
      return Response.json({ error: `API 오류 ${response.status}: ${errText}` }, { status: 500 });
    }

    const data = await response.json();

    if (data.error) {
      return Response.json({ error: data.error.message }, { status: 500 });
    }

    if (!data.content || data.content.length === 0) {
      return Response.json({ error: 'AI 응답이 비어있습니다' }, { status: 500 });
    }

    const text = data.content.map(i => i.text || '').join('');

    if (!text.trim()) {
      return Response.json({ error: 'AI 응답 텍스트가 비어있습니다' }, { status: 500 });
    }

    // JSON 추출 - 4단계 시도
    let parsed = null;
    let lastError = '';

    // 1. ```json ... ``` 블록
    const jsonBlockMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonBlockMatch) {
      try { parsed = JSON.parse(jsonBlockMatch[1]); } catch(e) { lastError = e.message; }
    }

    // 2. ``` ... ``` 블록
    if (!parsed) {
      const codeBlockMatch = text.match(/```\s*([\s\S]*?)\s*```/);
      if (codeBlockMatch) {
        try { parsed = JSON.parse(codeBlockMatch[1]); } catch(e) { lastError = e.message; }
      }
    }

    // 3. { ... } JSON 추출
    if (!parsed) {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try { parsed = JSON.parse(jsonMatch[0]); } catch(e) { lastError = e.message; }
      }
    }

    // 4. 전체 텍스트
    if (!parsed) {
      try { parsed = JSON.parse(text.trim()); } catch(e) { lastError = e.message; }
    }

    if (!parsed) {
      // 디버깅용: 실제 AI 응답 앞부분 반환
      return Response.json({
        error: `JSON 파싱 실패. AI 응답: ${text.slice(0, 200)}`
      }, { status: 500 });
    }

    return Response.json(parsed);

  } catch (err) {
    return Response.json({ error: `서버 오류: ${err.message}` }, { status: 500 });
  }
}
