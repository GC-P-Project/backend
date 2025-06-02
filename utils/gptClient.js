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
const User = mongoose.models.User || mongoose.model('User', userSchema);

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
const InterventionLog = mongoose.models.InterventionLog || mongoose.model('InterventionLog', interventionLogSchema);

const diarySchema = new mongoose.Schema({
  uid: String,
  diaryId: String,
  diaryDate: String,
  createdAt: { type: Date, default: Date.now },
  contents: [String]
});
const Diary = mongoose.models.Diary || mongoose.model('Diary', diarySchema);

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

async function emotionAnalysis(traits, text){
  console.log("감정 분석 시작하기 위한 데이터: "+ traits + "\n이건 문장: " + text);
  const emotionAnalysisPrompt = (traits, text) =>
    `당신은 개인 성격 정보를 바탕으로 일기 텍스트에서 감정을 분석하는 AI입니다. 동일한 상황이라도 성격 특성에 따라 감정 반응이 달라질 수 있으니, 주어진 성격 점수를 꼭 반영해 감정 분포(7개 감정, 확률 합 1, 소수점 4자리까지 반환(예: 0.3555))를 산출하세요. 출력은 반드시 JSON형식이어야 합니다.

    입력: (1) 유저의 8차원 성격 프로필 (0~1 float), (2) 유저의 일기 텍스트
    출력: 7개 감정의 확률 분포(JSON), 예시 참고

    8차원 성격 프로필 설명:
      1. 정직/겸손 (Honesty-Humility): 진실성과 겸손함의 정도
      2. 정서적 안정성 (Emotional Stability): 스트레스와 부정적 상황에 대한 회복력
      3. 외향성 (Extraversion): 사회적 상호작용과 자극 추구 성향
      4. 성실성 (Conscientiousness): 계획성과 책임감의 정도
      5. 개방성 (Openness): 새로운 경험과 아이디어에 대한 개방성
      6. 위험 감수 성향 (Risk-Taking): 불확실성과 위험을 감수하는 정도
      7. 인지욕구 (Need for Cognition): 복잡한 사고와 학습에 대한 욕구
      8. 미래지향성 (Future Orientation): 장기적 계획과 목표 지향성

    ### 정직/겸손 수준별 반응
      - 높음 (0.7~1.0): 도덕적 딜레마나 불의한 상황에서 더 큰 불편함(disgust, anger) 경험
      - 낮음 (0.0~0.3): 경쟁적 상황에서 더 큰 흥분(happiness) 또는 좌절(anger) 경험
    ### 정서적 안정성 수준별 반응
      - 높음 (0.7~1.0): 스트레스 상황에서도 neutral 유지, 문제 해결에 집중하여 relative happiness
      - 낮음 (0.0~0.3): 동일 상황에서 더 강한 fear, sadness, anger 경험
    ### 외향성 수준별 반응
      - 높음 (0.7~1.0): 사회적 격리 시 sadness 증가, 사교 활동 시 happiness 증가
      - 낮음 (0.0~0.3): 혼자 시간에서 happiness, 강제 사교 활동에서 fear/disgust
    ### 성실성 수준별 반응
      - 높음 (0.7~1.0): 계획 실패나 무질서 상황에서 anger/disgust, 목표 달성 시 큰 happiness
      - 낮음 (0.0~0.3): 자유로운 상황에서 happiness, 엄격한 규칙 환경에서 anger/fear
    ### 개방성 수준별 반응
      - 높음 (0.7~1.0): 새로운 경험에서 surprise/happiness, 단조로운 상황에서 sadness
      - 낮음 (0.0~0.3): 변화 상황에서 fear/anger, 안정적 환경에서 happiness
    ### 위험 감수 성향별 반응
      - 높음 (0.7~1.0): 도전적 상황에서 happiness/surprise, 안전한 환경에서 상대적 무료함
      - 낮음 (0.0~0.3): 불확실한 상황에서 fear/anxiety, 예측 가능한 환경에서 happiness
    ### 인지욕구별 반응
      - 높음 (0.7~1.0): 복잡한 문제 해결 시 happiness, 단순 반복 작업에서 sadness/disgust
      - 낮음 (0.0~0.3): 과도한 사고 요구 상황에서 fear/anger, 단순한 활동에서 happiness
    ### 미래지향성별 반응
      - 높음 (0.7~1.0): 장기 목표 달성 과정에서 happiness, 즉흥적 상황에서 불편함
      - 낮음 (0.0~0.3): 현재 순간의 즐거움에서 happiness, 장기 계획 압박에서 fear/sadness

    감정 분포 산출 시, 상황과 가장 관련된 성격 차원을 우선 적용.

    다음 예시 참고:

    입력 예시
    성격 프로필: {"정직/겸손":0.8, "정서적 안정성":0.2, ...}
    일기: "오늘 팀 프로젝트에서 내 아이디어가 무시당했다. 화가 나고 속상하다."

    출력 예시
    {
    "fear": 0.10,
    "surprise": 0.05,
    "anger": 0.55,
    "sadness": 0.20,
    "neutral": 0.05,
    "happiness": 0.01,
    "disgust": 0.04
    }
    
    [유저의 8차원 성격 프로필]:
      - 정직/겸손: ${traits.honestyHumility}
      - 정서적 안정성: ${traits.emotionalStability}
      - 외향성: ${traits.extraversion}
      - 성실성: ${traits.conscientiousness}
      - 개방성: ${traits.openness}
      - 위험 감수 성향: ${traits.riskPropensity}
      - 인지욕구: ${traits.needForCognition}
      - 미래지향성: ${traits.futureTimePerspective}
    [유저의 일기정보]: ${text}
    `;
    // `너는 심리학 박사 학위를 가진 감정 분석 전문가야. 20년간 일기 분석을 통한 감정 연구를 수행했어.

    // 아래 사용자의 성향(traits)을 참고해서, 입력된 일기가 7가지 감정 [공포, 놀람, 분노, 슬픔, 중립, 행복, 혐오] 각각을 얼마나 표현하고 있는지 정밀하게 평가해줘.
    // 모든 감정 확률의 합은 반드시 정확히 1.00이 되어야 해.
    // 성향은 0~1 사이 수치야.

    // [사용자 성향]
    // 정직/겸손: ${traits.honestyHumility}
    // 정서적 안정성: ${traits.emotionalStability}
    // 외향성: ${traits.extraversion}
    // 성실성: ${traits.conscientiousness}
    // 개방성: ${traits.openness}
    // 위험 감수 성향: ${traits.riskPropensity}
    // 인지욕구: ${traits.needForCognition}
    // 미래지향성: ${traits.futureTimePerspective}

    // [성향별 감정 조정 규칙]
    // 1. 정서적 안정성 (emotionalStability)
    //   - 0.0~0.3: 부정 감정 ×1.4배 증폭
    //   - 0.3~0.5: 부정 감정 ×1.15배 증폭
    //   - 0.7~1.0: 부정 감정 ×0.8배 감소

    // 2. 외향성 (extraversion)
    //   - 0.7~1.0: 모든 감정 표현 1.1배 강화 (중립 제외)
    //   - 0.0~0.3: 감정 표현 억제, 중립 증가

    // 3. 정직/겸손 (honestyHumility)
    //   - 0.7~1.0: 감정의 순수성 증가 (복합 감정 감소)
    //   - 0.0~0.3: 방어적 표현으로 진짜 감정 숨김. 중립 결과 강화

    // 4. 개방성 (openness)
    //   - 0.7~1.0: 2개 이상 감정 동시 표현 가능
    //   - 0.0~0.3: 단순 감정만 표현

    // 5. 위험 감수 성향 (riskPropensity)
    //   - 0.7~1.0: 공포 ×0.5배 감소
    //   - 0.0~0.3: 공포 ×1.3배 증가

    // 6. 인지욕구 (needForCognition)
    //   - 0.7~1.0: 중립 +0.1~0.2 증가
    //   - 감정보다 사실 중심 서술 시 중립 강화

    // 7. 미래지향성 (futureTimePerspective)
    //   - 0.7~1.0: 희망적 내용→행복 증가, 걱정→공포 증가
    //   - 0.0~0.3: 현재 감정에만 집중

    // [분석 단계]
    // 1단계: 일기의 핵심 감정 단어와 문맥 파악
    // 2단계: 기본 감정 확률 계산
    // 3단계: 사용자 성향에 따른 가중치 적용
    // 4단계: 최종 확률 정규화 (합계 = 1.00)

    // [중요 지시사항]
    // - 미묘한 감정 신호도 놓치지 마세요
    // - 한국어 특유의 간접 표현을 고려하세요
    // - 이모티콘이나 구어체도 감정 단서로 활용하세요
    // - 문장 길이와 구조도 감정 강도의 지표입니다
    // - 최종 확률 정규화 과정에서 부동 소수점 오류를 감안하여 합산하고 확률 합산 결과가 무조건 1이 되어야 합니다.
    //   Softmax 함수를 활용하여 꼭 확률 합을 1.00으로 만드세요.

    // 일기: "${text}"

    // → 반드시 JSON 형식으로만 답변. 설명이나 주석 절대 금지:
    //   {"emotions": {"fear": 0.00, "surprise": 0.00, "anger": 0.00, "sadness": 0.00, "neutral": 0.00, "happiness": 0.00, "disgust": 0.00}}`;
  const response = await axios.post('https://api.openai.com/v1/chat/completions', {
    model: 'gpt-3.5-turbo',
    messages: [{ role: "system", content: emotionAnalysisPrompt(traits, text) }]
  }, {
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    }
  });
  return response.data.choices[0].message.content;
}
async function sendToGPT(messages) {
  console.log("CALL sendToGPT | messages: " + JSON.stringify(messages));
  const response = await axios.post('https://api.openai.com/v1/chat/completions', {
    model: 'gpt-3.5-turbo',
    messages : messages
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

  try {
    //  GPT 호출
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
    const newTraits = JSON.parse(content); //  GPT가 반환한 새 trait

    //  사용자 조회
    const user = await User.findOne({ uid });
    if (!user) {
      console.warn(` 사용자 ${uid}를 찾을 수 없습니다.`);
      return;
    }

    const currentTraits = user.traits || {};
    console.log(" 기존 traits:", currentTraits);
    console.log(" GPT 새 traits:", newTraits);

    //  가중 평균 계산
    const updatedTraits = {};
    const weightOld = 0.75;
    const weightNew = 0.25;

    for (const key of Object.keys(newTraits)) {
      const oldVal = typeof currentTraits[key] === 'number' ? currentTraits[key] : 0.5;
      const newVal = newTraits[key];
      updatedTraits[key] = parseFloat((oldVal * weightOld + newVal * weightNew).toFixed(4));
    }

    console.log(" 업데이트된 traits:", updatedTraits);

    // DB 업데이트
    await User.findOneAndUpdate({ uid }, { traits: updatedTraits });
    console.log(` 사용자 ${uid} trait 정보 가중 업데이트 완료`);

    //  최종 검증
    const updatedUser = await User.findOne({ uid });
    console.log(" DB 최종 저장된 traits:", updatedUser.traits);

  } catch (e) {
    console.error(" trait 업데이트 실패:", e.message);
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
  messages.push({ role: "assistant", message: gptReply}); //gpt와 대화를 기억하기 위해 보내는 messages에 gpt의 답변 넣기
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

        messages.push({ role: "assistant", message: gptReply});
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
너는 감정 기반 일기 앱에서 사용자의 이야기를 들어주는 친구 같은 존재야.

- 말투는 너무 딱딱하거나 분석적이지 않게, 친구처럼 따뜻하고 자연스럽게 말해.
- 사용자의 감정을 공감해주고, 위로해주고, 함께 이야기 나누는 느낌을 줘.
- 긴 설명보다는 짧고 감정에 공감하는 말 위주로 대답해.
- 딱딱한 조언보다는 "나도 그럴 것 같아", "진짜 속상했겠다" 같은 말로 대화를 이어가.
- 필요하면 짧은 질문으로 감정을 더 이끌어내. 예: "그때 기분 어땠어?", "혹시 누구한테 말했어?"
- 문장은 너무 길지 않게, 가볍고 편안하게.

예시:
"와… 진짜 힘들었겠다. 하루 종일 마음이 무거웠을 것 같아 😢"
"그런 날은 그냥 다 놓고 쉬고 싶지. 혹시 지금 좀 나아졌어?"
`;

module.exports = {
  detectTrigger,
  getEmotionIntensity,
  sendToGPT,
  updateUserTraits,
  initialSystemPrompt,
  emotionAnalysis
};