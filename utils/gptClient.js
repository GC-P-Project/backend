const { OpenAI } = require("openai");
require("dotenv").config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * 사용자의 일기 내용을 기반으로 GPT로 감정 분석 요청
 * @param {string} diaryText - 사용자의 일기 텍스트
 * @returns {Promise<{emotionVector: object, analysis: string}>}
 */
async function analyzeDiaryWithGPT(diaryText) {
  const systemPrompt = `
너는 감정 기반 멘탈 헬스 케어 전문 AI야.
사용자가 작성한 일기 내용을 바탕으로 다음과 같은 JSON 구조로 응답해줘:

{
  "emotionVector": {
    "행복": float,
    "슬픔": float,
    "분노": float,
    "놀람": float,
    "중립": float,
    "공포": float,
    "혐오": float
  },
  "analysis": "사용자의 감정 상태에 대한 따뜻하고 친근한 피드백 메시지"
}

- 감정 수치는 0.0 ~ 1.0 사이 float 형식으로 반환
- 분석 메시지는 최대한 친근하게 표현해줘
- 진단적이지 않고 조언 중심의 피드백으로 작성해
`;

  const userPrompt = `
[일기 내용]
${diaryText}
`;

  const completion = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    temperature: 0.7,
    max_tokens: 700
  });

  // 응답 결과 파싱
  const reply = completion.choices[0].message.content.trim();

  try {
    return JSON.parse(reply); // GPT 응답이 JSON 형식이면 바로 파싱
  } catch (e) {
    throw new Error("GPT 응답을 JSON으로 파싱할 수 없습니다:\n" + reply);
  }
}

module.exports = { analyzeDiaryWithGPT };
