const model = 'openrouter/free';
type OpenRouterResponse = { choices?: Array<{ message?: { content?: string } }> };

async function requestOpenRouter(prompt: string, maxTokens: number): Promise<string> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return '';
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', 'HTTP-Referer': process.env.APP_URL ?? 'http://localhost:3003', 'X-Title': 'Pulse reminders' },
    body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], temperature: 0.9, max_tokens: maxTokens }),
  });
  if (!response.ok) throw new Error(`OpenRouter returned ${response.status}`);
  const data = await response.json() as OpenRouterResponse;
  return data.choices?.[0]?.message?.content?.trim() ?? '';
}

export async function generateReminderMessage(title: string, profileName: string): Promise<string> {
  const message = await requestOpenRouter(`Viết đúng 1 câu nhắc việc tiếng Việt thật dễ thương và tự nhiên cho ${profileName}. Việc cần nhắc: "${title}". Câu phải gọi "${profileName}" ở đầu câu, tối đa 1 emoji nhẹ nhàng. Không đánh số, không giải thích, chỉ trả về câu nhắc.`, 100);
  return cleanMessage(message) || fallbackMessage(title, profileName);
}

export async function generateReminderVariants(title: string, profileName: string): Promise<string[]> {
  const text = await requestOpenRouter(`Viết 5 câu nhắc việc tiếng Việt thật dễ thương, tự nhiên và khác nhau cho ${profileName}. Việc cần nhắc là: "${title}". Mỗi câu phải gọi tên "${profileName}" ở đầu câu. Có thể dùng tối đa 1 emoji nhẹ nhàng mỗi câu. Không đánh số, không giải thích, mỗi câu một dòng.`, 300);
  const variants = text.split('\n').map(cleanMessage).filter(Boolean).slice(0, 5);
  return variants.length ? variants : [fallbackMessage(title, profileName)];
}

function cleanMessage(message: string): string {
  return message.split('\n')[0]?.replace(/^\s*[-*\d.)]+\s*/, '').trim() ?? '';
}

function fallbackMessage(title: string, profileName: string): string {
  const suggestions = [
    `${profileName} ơi, đến lúc ${title.toLowerCase()} một chút rồi đó — mình làm nhẹ nhàng nhé.`,
    `${profileName}, dành vài phút cho việc ${title.toLowerCase()} nha, xong rồi sẽ thấy người nhẹ tênh.`,
    `Nhắc ${profileName} nè: ${title.toLowerCase()} thôi, một bước nhỏ cho hôm nay thật ổn.`,
  ];
  return suggestions[Math.floor(Date.now() / 60000) % suggestions.length];
}
