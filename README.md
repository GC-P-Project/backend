설치 및 실행 환경
- npm

Node.js 환경
Node.js 버전: 16.x 이상


필수 패키지 설치:
npm install

설치된 주요 모듈: express (서버 구축), mongoose (MongoDB 연결), body-parser (JSON 요청 처리)

데이터베이스
MongoDB: 사용자, 일기 데이터 저장 및 관리


Add .env file to root directory:
port= [PORTNUBER]
MONGO_URI= [MONGO_DB_ATLAS URL]
GPT_API = [GPT API KEY]

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


추가 구현 정보 

감정 인식 모델 정확성을 위한 튜닝 필요함 ,  


웨어러블 기기 Database 


Promport Engineering 추가 


감정 인식 모델 추출 감정 -> 대화형 모델 (Rasa)





