// utils/gptClient.js
const axios = require('axios');
const readline = require('readline');
const mongoose = require('mongoose');
require('dotenv').config();

// ================ DB 연결 ================
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('MongoDB Connected'))
  .catch(err => console.error('MongoDB Connection Error:', err));

// ================ 모델 정의 ================
const userSchema = new mongoose.Schema({
  uid: String,
  interventionSensitivity: { type: Number, default: 0.5 },
  traits: {
    honestyHumility: { type: Number, default: 0.5 },
    emotionalStability: { type: Number, default: 0.5 },
    extraversion: { type: Number, default: 0.5 },
    conscientiousness: { type: Number, default: 0.5 },
    openness: { type: Number, default: 0.5 },
    riskPropensity: { type: Number, default: 0.5 },
    needForCognition: { type: Number, default: 0.5 },
    futureTimePerspective: { type: Number, default: 0.5 }
  }
});
const User = mongoose.model('User', userSchema);

const interventionLogSchema = new mongoose.Schema({
  uid: String,
  diaryId: String,
  LogId: String,
  diaryDate: String,
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
  diaryDate: String,
  createdAt: { type: Date, default: Date.now },
  contents: [String]
});
const Diary = mongoose.model('Diary', diarySchema);

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const diary = new Diary({ uid: "test_user", diaryId: "diary_123", diaryDate: "4월 29일의 일기", contents: [] });

function detectTrigger(text) {
  const triggers = ['불안', '우울', '무기력', '짜증'];
  return triggers.find(trigger => text.includes(trigger)) || null;
}

const generatePersonalizedPrompt = (traits, text) => `
너는 감정 분석 전문가야.

아래 사용자의 성향(traits)을 참고해서, 입력된 문장이 얼마나 부정적인 감정을 표현하고 있는지를 평가해줘.
성향은 0~1 사이 수치야.

[사용자 성향]
정직/겸손: ${traits.honestyHumility}
정서적 안정성: ${traits.emotionalStability}
외향성: ${traits.extraversion}
성실성: ${traits.conscientiousness}
개방성: ${traits.openness}
위험 감수 성향: ${traits.riskPropensity}
인지욕구: ${traits.needForCognition}
미래지향성: ${traits.futureTimePerspective}

문장: "${text}"

→ 이 문장의 부정 감정 강도를 0~1 숫자로만 답해. 예시: 0.72
`;

async function getEmotionIntensity(text, traits) {
  const response = await axios.post('https://api.openai.com/v1/chat/completions', {
    model: 'gpt-3.5-turbo',
    messages: [{ role: "system", content: generatePersonalizedPrompt(traits, text) }]
  }, {
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    }
  });
  const rawScore = response.data.choices[0].message.content.trim();
  const score = parseFloat(rawScore);
  return isNaN(score) ? 0.0 : score;
}

async function sendToGPT(messages) {
  const response = await axios.post('https://api.openai.com/v1/chat/completions', {
    model: 'gpt-3.5-turbo',
    messages
  }, {
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    }
  });
  return response.data.choices[0].message.content;
}

async function updateUserTraits(uid, diaryContents, fullConversation) {
  const prompt = `
너는 성격 분석 전문가야. 아래는 사용자의 일기 내용과 GPT와의 대화 내용이야.
이걸 바탕으로 아래 8가지 성향(traits)을 0~1 사이 숫자로 다시 예측해줘. JSON 형태로만 반환해.

traits: honestyHumility, emotionalStability, extraversion, conscientiousness, openness, riskPropensity, needForCognition, futureTimePerspective

일기 내용: ${diaryContents.join("\n")}
대화 내용: ${fullConversation.map(c => `(${c.speaker}) ${c.message}`).join("\n")}

답변 형식 예시:
{
  "honestyHumility": 0.52,
  "emotionalStability": 0.31,
  "extraversion": 0.45,
  "conscientiousness": 0.62,
  "openness": 0.48,
  "riskPropensity": 0.39,
  "needForCognition": 0.54,
  "futureTimePerspective": 0.60
}`;

  const response = await axios.post('https://api.openai.com/v1/chat/completions', {
    model: 'gpt-3.5-turbo',
    messages: [{ role: "system", content: prompt }]
  }, {
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    }
  });

  const content = response.data.choices[0].message.content;
  try {
    const traits = JSON.parse(content);
    await User.findOneAndUpdate({ uid }, { traits });
    console.log(" 사용자 trait 정보 업데이트 완료");
  } catch (e) {
    console.error(" trait JSON 파싱 실패:", content);
  }
}

async function startInterventionSession(triggeredText, trigger, user, diaryObj) {
  console.log(` 트리거 감지: "${trigger}" → 개입 대화 시작`);

  let messages = [
    { role: "system", content: initialSystemPrompt },
    { role: "user", content: triggeredText }
  ];

  const intervention = new InterventionLog({
    uid: user.uid,
    diaryId: diaryObj.diaryId,
    diaryDate: diaryObj.diaryDate,
    revisionNumber: 1,
    conversation: [
      { speaker: "user", message: triggeredText }
    ],
    trigger,
    triggeredText
  });

  const gptReply = await sendToGPT(messages);
  console.log(`GPT: ${gptReply}`);
  intervention.conversation.push({ speaker: "gpt", message: gptReply });

  async function conversationLoop() {
    rl.question('You: ', async (userInput) => {
      if (userInput.toLowerCase() === 'exit') {
        await intervention.save();
        console.log(' InterventionLog 저장 완료');
        await updateUserTraits(user.uid, diaryObj.contents, intervention.conversation);
        console.log(' 개입 종료. 다시 일기를 작성하세요.');
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

async function startDiaryWriting() {
  console.log('  일기를 작성하세요 (줄바꿈 할 때마다 검사합니다)');

  const user = await User.findOne({ id: "test1" });
  const userTraits = user.traits;

  rl.on('line', async (line) => {
    const trimmedLine = line.trim();
    if (trimmedLine.length === 0) return;

    diary.contents.push(trimmedLine);
    const trigger = detectTrigger(trimmedLine);
    if (trigger) {
      const intervene = await getEmotionIntensity(trimmedLine, userTraits);
      if (intervene >= user.interventionSensitivity) {
        console.log('  감정 강도 높음 → 개입 진행');
        await startInterventionSession(trimmedLine, trigger, user, diary);
      } else {
        console.log(' 감정 강도 낮음 - 그냥 일기 저장');
      }
    } else {
      console.log(' 계속 작성 중...');
    }
  });

  rl.on('close', async () => {
    await diary.save();
    console.log(' 일기 전체 저장 완료');
    process.exit(0);
  });
}

const initialSystemPrompt = `
너는 감정 기반 일기 앱의 정서적 동반자야. 사용자의 감정에 공감하고 케어하는 역할을 맡았어.
- 감정 트리거: 불안, 우울, 무기력, 짜증
- 사용자의 말에 공감하고 부드러운 질문으로 대화를 이끌어가.
- 조언은 최대한 뒤로 미루고, 종료 시점은 사용자에게 맡겨.
예시: "많이 힘드셨겠어요. 어떤 점이 가장 힘들게 느껴졌나요?"
`;

module.exports = { startDiaryWriting };
