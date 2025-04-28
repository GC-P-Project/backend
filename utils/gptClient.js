//  utils/gptClient.js 

const axios = require('axios');
const readline = require('readline');
const mongoose = require('mongoose');
require('dotenv').config();

// ================== DB 연결 ==================
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('MongoDB Connected'))
  .catch(err => console.error('MongoDB Connection Error:', err));

// ================== 모델 정의 ==================
const interventionLogSchema = new mongoose.Schema({
  uid: String,
  diaryId: String,
  revisionNumber: Number,
  createdAt: { type: Date, default: Date.now },
  conversation: [
    { speaker: String, message: String }
  ],
  trigger: String,
  triggeredText: String
});
const InterventionLog = mongoose.model('InterventionLog', interventionLogSchema);

const diarySchema = new mongoose.Schema({
  uid: String,
  diaryId: String,
  createdAt: { type: Date, default: Date.now },
  contents: [String]
});
const Diary = mongoose.model('Diary', diarySchema);

const userSchema = new mongoose.Schema({
  uid: String,
  interventionSensitivity: { type: Number, default: 0.5 }
});
const User = mongoose.model('User', userSchema);

//  초기 System Prompt (프롬프트 세팅)
const initialSystemPrompt = `
너는 감정 기반 일기 앱의 정서적 동반자야.
사용자가 일기 중에 불안, 우울, 무기력, 짜증 등의 감정 트리거를 보이면, 너는 감정 케어를 위해 개입을 시작해야 해.

[너의 역할]
- 따뜻하고 친근한 존댓말을 사용해.
- 사용자의 감정을 절대 평가하거나 판단하지 말고, 있는 그대로 공감해.
- 사용자가 감정을 충분히 표현할 수 있도록 부드러운 질문을 던져.
- 사용자가 스스로 감정을 인식할 수 있도록 도와주는 것이 목표야.
- 대화를 억지로 마무리짓지 말고, 사용자가 그만하고 싶어할 때 자연스럽게 끝내.

[대화 규칙]
- 무조건 공감 멘트를 포함해 ("힘드셨겠어요", "그럴 수 있어요" 등)
- 짧은 질문이나 리액션으로 대화를 이어가
- 조언이나 해결책 제시는 최대한 뒤로 미루기
- 유저가 대화 종료 의사를 보이면 "언제든 다시 이야기하고 싶으면 불러주세요."로 끝내

[감지된 감정 트리거]
- 불안
- 우울
- 무기력
- 짜증

[대화 내용 기록]
- 사용자의 발화 내용과 너의 답변을 각각 별도로 저장해야 해.
- 대화의 각 턴(turn)을 "사용자 메시지"와 "GPT 메시지"로 구분하여 저장해야 한다.
- 저장 형식은 다음을 따른다:

1. 사용자가 보낸 메시지 → { "speaker": "user", "message": "..." }
2. 너(GPT)가 보낸 메시지 → { "speaker": "gpt", "message": "..." }

이렇게 사용자와의 대화를 안전하게 기록하고 관리하는 것이 가장 중요한 목표 중 하나다.

너는 감정적으로 불안정한 상태에 있는 사용자를 안전하게 케어하는 것이 가장 중요한 목표야.
[추가 요청]
- 사용자가 보낸 일기 문장을 보고 대화를 시작해 주세요.
- 첫 번째 답변은 공감 + 부드러운 질문 형태로 작성하세요.
- 예시 답변: "많이 힘드셨겠어요. 어떤 점이 가장 힘들게 느껴졌나요?"
`;

//  감정 강도 평가용 Prompt 생성 함수
const emotionIntensityPrompt = (text) => `
너는 감정 분석 전문가야.

아래 문장의 부정적 감정 강도를 0~1 사이 숫자로 답해.
- 0은 거의 부정 감정 없음
- 1은 매우 강한 부정 감정
- 오직 숫자만 답해.

문장: "${text}"
답변 예시: 0.87
`;

// ================== 기본 세팅 ==================
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const diary = new Diary({
  uid: "test_user",
  diaryId: "diary_123",
  contents: []
});

// ================== 기능 함수들 ==================
function detectTrigger(text) {
  const triggers = ['불안', '우울', '무기력', '짜증'];
  for (let trigger of triggers) {
    if (text.includes(trigger)) {
      return trigger;
    }
  }
  return null;
}

async function getEmotionIntensity(text) {
  const response = await axios.post('https://api.openai.com/v1/chat/completions', {
    model: 'gpt-3.5-turbo',
    messages: [{ role: "system", content: emotionIntensityPrompt(text) }]
  }, {
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    }
  });

  const rawScore = response.data.choices[0].message.content.trim();
  const score = parseFloat(rawScore);
  if (isNaN(score)) {
    console.error('감정 강도 추출 실패:', rawScore);
    return 0.0;
  }
  return score;
}

async function sendToGPT(messages) {
  const response = await axios.post('https://api.openai.com/v1/chat/completions', {
    model: 'gpt-3.5-turbo',
    messages: messages
  }, {
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    }
  });
  return response.data.choices[0].message.content;
}

async function shouldIntervene(userText, userSensitivity) {
  const emotionIntensity = await getEmotionIntensity(userText);
  console.log(` 감정 강도: ${emotionIntensity} / 사용자 민감도: ${userSensitivity}`);
  return emotionIntensity >= userSensitivity;
}

//  Intervention 세션 시작 함수 (여기 있었어야 함)
async function startInterventionSession(triggeredText, trigger) {
  console.log(` 트리거 감지: "${trigger}" → 개입 대화 시작`);

  let messages = [
    { role: "system", content: initialSystemPrompt },
    { role: "user", content: triggeredText }
  ];

  const intervention = new InterventionLog({
    uid: "test_user",
    diaryId: "diary_123",
    revisionNumber: 1,
    conversation: [
      { speaker: "user", message: triggeredText }
    ],
    trigger: trigger,
    triggeredText: triggeredText
  });

  const gptReply = await sendToGPT(messages);
  console.log(`GPT: ${gptReply}`);
  intervention.conversation.push({ speaker: "gpt", message: gptReply });

  // 대화 루프 시작
  async function conversationLoop() {
    rl.question('You: ', async (userInput) => {
      if (userInput.toLowerCase() === 'exit') {
        await intervention.save();
        console.log(' InterventionLog 저장 완료');
        rl.close();
        return;
      } else {
        messages.push({ role: "user", content: userInput });
        intervention.conversation.push({ speaker: "user", message: userInput });

        const gptReply = await sendToGPT(messages);
        console.log(`GPT: ${gptReply}`);
        intervention.conversation.push({ speaker: "gpt", message: gptReply });

        await conversationLoop();
      }
    });
  }

  await conversationLoop();
}

//  일기 작성 시작 함수
async function startDiaryWriting() {
  console.log(' 일기를 작성하세요 (줄바꿈 할 때마다 검사합니다)');

  const user = await User.findOne({ uid: "test_user" });
  const userSensitivity = user ? user.interventionSensitivity : 0.5;

  rl.on('line', async (line) => {
    const trimmedLine = line.trim();
    if (trimmedLine.length === 0) return;

    diary.contents.push(trimmedLine);

    const trigger = detectTrigger(trimmedLine);

    if (trigger) {
      const intervene = await shouldIntervene(trimmedLine, userSensitivity);
      if (intervene) {
        console.log(' 감정 강도 높음, 개입 시작');
        await startInterventionSession(trimmedLine, trigger);
      } else {
        console.log(' 감정 강도 낮음 - 개입하지 않고 넘어갑니다.');
      }
    } else {
      console.log(' 계속 작성 중...');
    }
  });

  rl.on('close', async () => {
    await diary.save();
    console.log(' 일기 내용이 저장되었습니다.');
    process.exit(0);
  });
}

module.exports = {
  startDiaryWriting,
};
