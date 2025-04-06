const express = require('express');
const router = express.Router();
const Emotion = require('../models/emotion_result');
const { analyzeDiaryWithGPT } = require('../utils/gptClient'); 

// GPT 기반 감정 분석 및 저장
router.post('/', async (req, res) => {
  const { userId, context } = req.body;

  if (!userId || !context) {
    return res.status(400).json({ error: "userId and context are required." });
  }

  try {
    // GPT 호출하여 감정 피드백 및 벡터 추론
    const gptFeedback = await analyzeDiaryWithGPT(context);

    // 예: GPT 응답 안에 감정 벡터가 있다고 가정
    const { emotionVector, analysis } = gptFeedback;

    // 소수점 4자리로 정규화
    const formatPercentage = (val) => parseFloat((val * 100).toFixed(4));
    const formattedVector = {
      happiness: formatPercentage(emotionVector?.행복 || 0),
      sadness: formatPercentage(emotionVector?.슬픔 || 0),
      anger: formatPercentage(emotionVector?.분노 || 0),
      surprise: formatPercentage(emotionVector?.놀람 || 0),
      neutrality: formatPercentage(emotionVector?.중립 || 0),
      fear: formatPercentage(emotionVector?.공포 || 0),
      disgust: formatPercentage(emotionVector?.혐오 || 0),
      gptFeedback: analysis // 감정 분석 요약도 함께 저장
    };

    // DB에 저장
    const newEmotionEntry = new Emotion({
      userId,
      context,
      emotions: formattedVector
    });

    const savedEntry = await newEmotionEntry.save();

    return res.status(201).json({
      message: "GPT 감정 분석 및 저장 완료",
      data: savedEntry,
      gptFeedback: analysis // 분석 결과 요약 메시지
    });
  } catch (error) {
    console.error("GPT 분석 오류:", error.message);
    return res.status(500).json({ error: "GPT 분석 실패 또는 DB 오류" });
  }
});

module.exports = router;
