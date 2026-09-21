export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (!process.env.GEMINI_API_KEY) return res.status(500).json({ error: 'GEMINI_API_KEY が設定されていません。' });

  try {
    const { moves } = req.body || {};
    if (!Array.isArray(moves) || moves.length === 0) {
      return res.status(400).json({ error: '棋譜がありません。' });
    }

    const game = moves.map((m, i) => `${i + 1}. ${String(m).slice(0, 80)}`).join('\n');
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': process.env.GEMINI_API_KEY
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: 'あなたは将棋の感想戦アシスタントです。与えられた棋譜だけを根拠に、日本語で分かりやすく感想戦をしてください。重要な局面、良かった手、改善できそうな手、次に考えたい方針を簡潔に説明してください。棋譜にない局面や手を捏造しないでください。' }]
        },
        contents: [{
          role: 'user',
          parts: [{ text: `以下の棋譜を感想戦してください。\n\n${game}` }]
        }],
        generationConfig: { maxOutputTokens: 900, temperature: 0.5 }
      })
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({ error: data?.error?.message || 'Gemini API エラー' });
    }

    const text = data?.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('') || 'AIから感想戦の文章を取得できませんでした。';
    return res.status(200).json({ text });
  } catch (e) {
    return res.status(500).json({ error: 'サーバー側でエラーが発生しました。' });
  }
}
