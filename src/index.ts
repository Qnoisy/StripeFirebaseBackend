import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import routes from './routes';
import webhook from './webhook';

dotenv.config();

const app = express();
app.use(cors({ origin: process.env.FRONTEND_URL }));

// Используем `express.json()` только для `/api` маршрутов
app.use('/api', express.json());
app.use('/api', routes);

// Вебхук Stripe должен использовать `raw` body
app.use('/webhook', webhook);

// Error Handling Middleware
app.use(
	(
		err: any,
		req: express.Request,
		res: express.Response,
		next: express.NextFunction
	) => {
		console.error('Error:', err.message);
		res.status(500).json({ error: err.message });
	}
);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
	console.log(`✅ Server is running on port ${PORT}`);
});
