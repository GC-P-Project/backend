설치 및 실행 환경


Python 환경 설정
Python 버전: Python 3.10+


가상 환경 생성 및 활성화:
python -m venv env
source env/bin/activate (Mac/Linux)
env\Scripts\activate (Windows)


주요 Python 라이브러리 설치:
pip install -r requirements.txt



설치된 주요 라이브러리: transformers (KoBERT 모델 활용), torch (모델 학습 및 추론), accelerate (Hugging Face Trainer 지원), numpy (데이터 연산), pandas (데이터 관리), python-dotenv (환경 변수 관리)




Node.js 환경
Node.js 버전: 16.x 이상



필수 패키지 설치:
npm install



설치된 주요 모듈: express (서버 구축), mongoose (MongoDB 연결), body-parser (JSON 요청 처리)



데이터베이스
MongoDB: 사용자, 일기 데이터 저장 및 관리


.env 파일에 아래 내용 추가:
MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/<dbname>?retryWrites=true&w=majority


프로젝트 실행 방법
Python 서버 실행: python emotion.py
Node.js 백엔드 실행: node server.js


Postman으로 API 테스트:
/api/users: 사용자 관련 API
/api/diaries: 감정 분석 결과 저장 API


프로젝트 구성


프로그래밍 언어: Python, JavaScript
백엔드 프레임워크: Express.js
데이터베이스: MongoDB
머신러닝 모델: KoBERT
API 테스트 도구: Postman


주요 디렉토리 구조

P실무/

├── models/

│ ├── diary.js # MongoDB 스키마 (일기)

│ ├── user.js # MongoDB 스키마 (사용자)

├── routes/

│ ├── diaries.js # 일기 관련 API 라우트

│ ├── users.js # 사용자 관련 API 라우트

│ ├── index.js # 메인 API 라우트

├── emotion.py # KoBERT를 활용한 감정 분석 코드 (Tuning 필요)

├── server.js # Node.js 서버 파일

├── package.json # Node.js 패키지 정보
