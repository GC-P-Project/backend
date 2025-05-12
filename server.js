const express = require('express');
const mongoose = require('mongoose');
const userRoutes = require('./routes/userRoutes');
const diaryRoutes = require('./routes/diaryRoutes');
const interventionRoutes = require('./routes/interventionRoutes');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
require('dotenv').config(); // env 파일 불러오기

const app = express();
const PORT = process.env.PORT || 3000;
const cors = require('cors');

app.use(express.json());
app.use(cors());

// MongoDB 연결
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})

//  Swagger 옵션 설정
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Emotion Diary API',
      version: '1.0.0',
      description: 'Emotion Diary Backend API 문서'
    },
    servers: [
      {
        url: 'http://localhost:5000',
      },
    ],
  },
  apis: ['./routes/*.js'], // 라우터 주석을 읽어들일 위치
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

//  Swagger UI 라우터 등록
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
//  실제 API 라우터 등록
app.use('/users', userRoutes);
app.use('/diaries', diaryRoutes);
app.use('/interventions', interventionRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Swagger API 문서: http://localhost:${PORT}/api-docs\n`);
});
