export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (!process.env.OPENAI_API_KEY) return res.status(500).json({ error: 'OPENAI_API_KEY が設定されていません。' });

  try {
    const { moves } = req.body || {};
    if (!Array.isArray(moves) || moves.length === 0) {
      return res.status(400).json({ error: '棋譜がありません。' });
    }

    const game = moves.map((m, i) => `${i + 1}. ${String(m).slice(0, 80)}`).join('\n');
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-5.6-luna',
        instructions: 'あなたは将棋の感想戦アシスタントです。与えられた棋譜だけを根拠に、日本語で分かりやすく感想戦をしてください。断定しすぎず、重要な局面、良かった手、改善できそうな手、次に考えたい方針を簡潔に説明してください。棋譜にない局面や手を捏造しないでください。',
        input: `以下の棋譜を感想戦してください。\n\n${game}`,
        max_output_tokens: 900
      })
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({ error: data?.error?.message || 'OpenAI API エラー' });
    }

    return res.status(200).json({ text: data.output_text || 'AIから感想戦の文章を取得できませんでした。' });
  } catch (e) {
    return res.status(500).json({ error: 'サーバー側でエラーが発生しました。' });
  }
}
