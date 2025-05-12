// controllers/interventionController.js
const User = require('../models/UserModel');
const InterventionLog = require('../models/InterventionLog');
const { detectTrigger, getEmotionIntensity, sendToGPT, updateUserTraits } = require('../utils/gptClient');

let sessionMemory = {};  

exports.startIntervention = async (req, res) => {
  const { uid, text } = req.body;
  try {
    const user = await User.findOne({ uid });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const trigger = detectTrigger(text);
    if (!trigger) return res.status(200).json({ intervene: false, reason: 'No trigger word detected' });

    const intensity = await getEmotionIntensity(text, user.traits);
    if (intensity < user.interventionSensitivity) {
      return res.status(200).json({ intervene: false, intensity });
    }

    const systemPrompt = `
너는 감정 기반 일기 앱의 정서적 동반자야. 사용자의 감정에 공감하고 케어하는 역할을 맡았어.
- 감정 트리거: 불안, 우울, 무기력, 짜증
- 사용자의 말에 공감하고 부드러운 질문으로 대화를 이끌어가.
- 조언은 최대한 뒤로 미루고, 종료 시점은 사용자에게 맡겨.
예시: "많이 힘드셨겠어요. 어떤 점이 가장 힘들게 느껴졌나요?"
`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: text }
    ];
    const gptReply = await sendToGPT(messages);

    sessionMemory[uid] = {
      messages,
      conversation: [
        { speaker: 'user', message: text },
        { speaker: 'gpt', message: gptReply }
      ],
      trigger,
      triggeredText: text
    };

    res.status(200).json({ intervene: true, gptReply });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.continueIntervention = async (req, res) => {
  const { uid, userInput } = req.body;
  try {
    const session = sessionMemory[uid];
    if (!session) return res.status(400).json({ error: 'No active session found' });

    session.messages.push({ role: 'user', content: userInput });
    session.conversation.push({ speaker: 'user', message: userInput });

    const gptReply = await sendToGPT(session.messages);
    session.messages.push({ role: 'assistant', content: gptReply });
    session.conversation.push({ speaker: 'gpt', message: gptReply });

    res.json({ gptReply });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.exitIntervention = async (req, res) => {
  const { uid, diaryId, diaryDate, contents, conversation } = req.body;
  try {
    const session = sessionMemory[uid];
    if (!session) return res.status(400).json({ error: 'No session to exit' });

    await InterventionLog.create({
      uid,
      diaryId,
      diaryDate,
      revisionNumber: 1,
      conversation,
      trigger: session.trigger,
      triggeredText: session.triggeredText
    });

    await updateUserTraits(uid, contents, conversation);
    delete sessionMemory[uid];

    res.json({ message: 'Intervention completed and traits updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
