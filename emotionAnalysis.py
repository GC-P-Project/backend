from transformers import BertTokenizer, BertForSequenceClassification
import torch
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
label_map = {0: '행복', 1: '슬픔', 2: '분노', 3: '놀람', 4: '중립', 5: '공포', 6: '혐오'}
# 모델 로드
# MODEL_NAME = "monologg/kobert"
MODEL_NAME = './fine_tuned_kobert'
model = BertForSequenceClassification.from_pretrained(MODEL_NAME, num_labels=7).to(DEVICE)
tokenizer = BertTokenizer.from_pretrained(MODEL_NAME)
    
def analysis(new_sentences):
    sentence = [str(new_sentences)]
    inputs = tokenizer(sentence, return_tensors="pt", padding=True, truncation=True, max_length=128).to(DEVICE)
    outputs = model(**inputs)
    logits = torch.nn.functional.softmax(outputs.logits.squeeze(), dim=0).cpu() * 100
    return logits

if __name__ == '__main__':
    if len(sys.argv) > 1:
        result = analysis(sys.argv[1])
        print(result)
        sys.exit(1)
    else:
        print("No input provided.")
        sys.exit(1)
