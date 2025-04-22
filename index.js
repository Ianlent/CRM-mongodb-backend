import express from 'express';
import cors from 'cors';
import users from './routes/users.js';
import auth from './routes/auth.js';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/auth', auth);
app.use('/api/users', users)



app.listen(process.env.PORT, () =>
  console.log(`Backend running on http://localhost:${process.env.PORT}`)
);
