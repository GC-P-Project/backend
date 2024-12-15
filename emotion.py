from transformers import BertTokenizer, BertForSequenceClassification, Trainer, TrainingArguments
import torch
from torch.utils.data import Dataset
import pandas as pd

# KoBERT의 사전 학습 모델과 토크나이저 로드
MODEL_NAME = "monologg/kobert"
tokenizer = BertTokenizer.from_pretrained(MODEL_NAME)
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
print(DEVICE)
model = BertForSequenceClassification.from_pretrained(MODEL_NAME, num_labels=7).to(DEVICE)  # 감정 범주 6개

# 감정 레이블 매핑 중립 빼고 6개로 하기
label_map = {0: '행복', 1: '슬픔', 2: '분노', 3: '놀람', 4: '중립', 5: '공포', 6: '혐오'}

# 샘플 감정 데이터셋 클래스 정의
class EmotionDataset(Dataset):
    def __init__(self, texts, labels, tokenizer, max_len=128):
        self.texts = texts
        self.labels = labels
        self.tokenizer = tokenizer
        self.max_len = max_len

    def __len__(self):
        return len(self.texts)

    def __getitem__(self, idx):
        text = self.texts[idx]
        checker = self.labels[idx]
        label = -1
        for key, value in label_map.items():
            if value == checker:
                label = key
        if label == -1:
            raise NotImplementedError('감정 분류 상태 이상!')
        
        inputs = self.tokenizer(
            text,
            max_length=self.max_len,
            padding="max_length",
            truncation=True,
            return_tensors="pt",
        )
        return {
            "input_ids": inputs["input_ids"].squeeze(0).to(DEVICE),
            "attention_mask": inputs["attention_mask"].squeeze(0).to(DEVICE),
            "labels": (torch.tensor(label, dtype=torch.long)).to(DEVICE),
        }

# 샘플 데이터 (여기서 실제 데이터셋으로 교체 가능)
korean_originDF = pd.read_excel('./korean_talk_datasets_emotion6.xlsx')
texts = korean_originDF["Sentence"]
labels = korean_originDF["Emotion"]
# print(labels)

# 데이터셋 생성
dataset = EmotionDataset(texts, labels, tokenizer)
train_dataset = EmotionDataset(texts, labels, tokenizer)
eval_dataset = EmotionDataset(texts, labels, tokenizer)  # 샘플에서는 같은 데이터 사용

# 모델 학습 설정
training_args = TrainingArguments(
    output_dir="./results",
    num_train_epochs=20,
    dataloader_pin_memory=False,
    per_device_train_batch_size=256,
    evaluation_strategy="epoch",
    save_strategy="epoch",
    logging_dir="./logs",
    logging_steps=10,
    load_best_model_at_end=True,
    save_total_limit=2,
)

trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=train_dataset,
    eval_dataset=eval_dataset,
)

# 모델 미세 조정
print("Starting Training...")
# trainer.train()
print("Training Completed!")

# 모델 저장
# model.save_pretrained("./fine_tuned_kobert")
# tokenizer.save_pretrained("./fine_tuned_kobert")

# 새로운 문장에 대한 감정 분석
# new_sentences = ["오늘 날씨가 너무 좋아서 기분이 최고다!", "속상하고 눈물이 날 것 같아.", "나 너무 슬퍼"]
# model.from_pretrained("./fine_tuned_kobert").to(DEVICE)
new_sentences = ["오늘 난 아주 힘들었다", "오늘 난 아주 기뻤다."]
inputs = tokenizer(new_sentences, return_tensors="pt", padding=True, truncation=True, max_length=128).to(DEVICE)

# 모델 추론
outputs = model(**inputs)
logits = outputs.logits
predicted_classes = torch.argmax(logits, dim=1)

# 감정 결과 출력
for i, sentence in enumerate(new_sentences):
    print(f"문장: {sentence}")
    print(f"예측된 감정: {label_map[predicted_classes[i].item()]}")