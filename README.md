<H1>Mood-Mate Backend Repository</H1>
This Repoistory is backend of mood mate that is mental care diary application.

We host this backend using cloud application platform Render(<url>https://render.com/</url>)

<h2>Requirements</h2>

- node.js & express.js

- Mongo DB Atlas
  
- OpenAI ChatGPT turbo 3.5 version API
  
<h3>Add .env file to root directory</h3>

port= [PORT NUMBER]

MONGO_URI= [MONGO DB ATLAS URL]

GPT_API = [GPT API KEY]

<h2>Directory Architecure</h2>
├── controllers/ (test)


├── models/ (MongoDB schema)

│ ├── diaryModel.js # Diary

│ ├── userModel.js  # USer

│ ├── interventionLog.js # GPT



├── routes/ (Rest API)

│ ├── diaryRoutes.js # Diary

│ ├── userRoutes.js  # USer

│ ├── index.js  # Default

│ ├── interventionRoutes.js # GPT function


├── utils (test)






