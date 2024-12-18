const express = require('express');
const { spawn } = require('child_process');
const router = express.Router();
const Emotion = require('../models/emotion_result'); // 스키마 불러오기

// 감정 분석 및 저장 라우트
router.post('/', async (req, res) => {
    const { userId, context } = req.body; // userId와 텍스트 입력 받기

    if (!userId || !context) {
        return res.status(400).json({ error: "userId and context are required." });
    }

    console.log("Analysis sentence: " + context);

    // Python 스크립트 실행
    const process = spawn('python', ['emotionAnalysis.py', context]);

    let output = '';
    let errorOutput = '';

    process.stdout.on('data', (data) => {
        output += data.toString();
    });

    process.stderr.on('data', (data) => {
        errorOutput += data.toString();
    });

    process.on('close', async (code) => {
        if (code === 0) {
            try {
                const result = JSON.parse(output); // Python 스크립트의 출력 파싱
                console.log("Analysis result: ", result);

                // 감정 결과를 소수점 4자리 퍼센트로 변환
                const formatPercentage = (value) => parseFloat((value * 100).toFixed(4));

                const newEmotionEntry = new Emotion({
                    userId,
                    context,
                    emotions: {
                        happiness: formatPercentage(result.all_confidences['행복'] || 0),
                        sadness: formatPercentage(result.all_confidences['슬픔'] || 0),
                        anger: formatPercentage(result.all_confidences['분노'] || 0),
                        surprise: formatPercentage(result.all_confidences['놀람'] || 0),
                        neutrality: formatPercentage(result.all_confidences['중립'] || 0),
                        fear: formatPercentage(result.all_confidences['공포'] || 0),
                        disgust: formatPercentage(result.all_confidences['혐오'] || 0)
                    }
                });

                const savedEntry = await newEmotionEntry.save();

                // 성공적으로 저장 후 응답
                res.status(201).json({
                    message: "Emotion analysis completed and saved.",
                    data: savedEntry
                });
            } catch (err) {
                console.error("Error processing Python output: ", err.message);
                res.status(500).json({ error: 'Invalid JSON response or Database Error.' });
            }
        } else {
            console.error("Python script error: ", errorOutput);
            res.status(500).json({ error: errorOutput.trim() || 'Unknown error occurred.' });
        }
    });
});

module.exports = router;
