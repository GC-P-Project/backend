// controllers/interventionController.js
const InterventionLog = require('../models/InterventionLog');
const { v4: uuidv4 } = require('uuid');
const { initialSystemPrompt, sendToGPT } = require('../utils/gptClient');
const User = require('../models/UserModel');
const { updateUserTraits } = require('../utils/gptClient');

// POST /interventions/start
exports.startIntervention = async (req, res) => {
  try {
    const { uid, text } = req.body;
    console.log("UID: " + uid + ", text: " + text);
    if (!uid || !text) return res.status(400).json({ error: 'uid와 text가 필요합니다.' });
    
    console.log("메세지 시작중 ...");
    const messages = [
      { role: 'system', content: initialSystemPrompt },
      { role: 'user', content: text },
    ];
    console.log("기본 프롬프트:  " + initialSystemPrompt);
    console.log('sentToGPT함수 시작중... messages:' + messages);
    const gptReply = await sendToGPT(messages);
    console.log("sentToGPT함수 끝났음... gptReply: " + gptReply);

    // 트리거 키워드 감지 (간단한 예시)
    const triggerKeywords = ['무기력', '우울', '짜증', '불안'];
    const detected = triggerKeywords.find(word => text.includes(word));
    console.log("DETECETETD: "+ detected);
    console.log("INTERVENTIONLOG>CRAEET 실행중....");
    const log = await InterventionLog.create({
      uid,
      diaryId: `diary_${uuidv4()}`,
      diaryDate: new Date().toISOString().slice(0, 10),
      LogId: uuidv4(),
      revisionNumber: 1,
      conversation: [
        { speaker: 'user', message: text },
        { speaker: 'gpt', message: gptReply },
      ],
      trigger: detected || '기타',
      triggeredText: text
    });

    console.log(uid + ': success startIntervention');
    res.json({ intervene: true, gptReply });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /interventions/continue
exports.continueIntervention = async (req, res) => {
  try {
    const { uid, userInput } = req.body;
    if (!uid || !userInput) return res.status(400).json({ error: 'uid와 userInput이 필요합니다.' });

    const userTurn = { role: 'user', content: userInput };
    const gptReply = await sendToGPT([userTurn]);

    res.json({ gptReply });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /interventions/exit
exports.exitIntervention = async (req, res) => {
  try {
    const {
      uid,
      diaryId,
      diaryDate,
      contents,
      conversation,
      LogId,
      trigger,
      triggeredText
    } = req.body;

    if (!uid || !diaryId || !conversation || !LogId) {
      return res.status(400).json({ error: '필수 항목 누락' });
    }

    const log = await InterventionLog.findOneAndUpdate(
      { diaryId },
      {
        uid,
        diaryId,
        diaryDate,
        LogId,
        conversation,
        trigger,
        triggeredText,
      },
      { new: true, upsert: true }
    );

    // 사용자 trait 갱신
    await updateUserTraits(uid, contents, conversation);

    res.json({ message: '개입 종료 및 저장 완료', log });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};