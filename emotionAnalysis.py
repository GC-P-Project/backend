from transformers import BertTokenizer, BertForSequenceClassification
import torch
import sys
import json
import io

# UTF-8 인코딩 설정
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# 장치 설정
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

# 감정 레이블 매핑
label_map = {0: '행복', 1: '슬픔', 2: '분노', 3: '놀람', 4: '중립', 5: '공포', 6: '혐오'}

# 모델 로드
MODEL_NAME = './fine_tuned_kobert'
model = BertForSequenceClassification.from_pretrained(MODEL_NAME, num_labels=7).to(DEVICE)
tokenizer = BertTokenizer.from_pretrained(MODEL_NAME)

# 감정 분석 함수
def analysis(new_sentence):
    # 입력 문장을 리스트로 생성
    inputs = tokenizer([new_sentence], return_tensors="pt", padding=True, truncation=True, max_length=128).to(DEVICE)
    outputs = model(**inputs)
    # 소프트맥스 확률 계산
    logits = torch.nn.functional.softmax(outputs.logits.squeeze(), dim=0).cpu().detach().numpy()

    # 각 레이블과 confidence를 dict 형태로 반환
    confidence_scores = {label_map[i]: float(logit) for i, logit in enumerate(logits)}

    # 가장 높은 확률의 레이블 추출
    top_index = logits.argmax()
    result = {
        "label": label_map[top_index],           # 가장 높은 확률의 감정 레이블
        "confidence": float(logits[top_index]),  # 해당 레이블의 확률
        "all_confidences": confidence_scores     # 모든 레이블의 확률
    }
    return result

if __name__ == '__main__':
    # 명령행 인수 확인
    if len(sys.argv) > 1:
        input_text = sys.argv[1]
        try:
            # 분석 결과 반환
            result = analysis(input_text)
            # 결과를 JSON 형식으로 출력
            print(json.dumps(result, ensure_ascii=False))
            sys.exit(0)  # 성공 코드
        except Exception as e:
            # 오류 발생 시 에러 메시지 출력
            print(json.dumps({"error": str(e)}, ensure_ascii=False))
            sys.exit(1)  # 오류 코드
    else:
        # 입력이 없는 경우
        print(json.dumps({"error": "No input provided."}, ensure_ascii=False))
        sys.exit(1)  # 오류 코드

