const { startDiarySession } = require('../utils/gptClient'); //  함수 불러오기
async function example() {
  const gptReply = await startDiarySession('오늘 너무 무기력하고 힘들었어요...'); // GPT에게 요청
  console.log('GPT 답변:', gptReply); //  응답 출력
}

example(); //  실행
