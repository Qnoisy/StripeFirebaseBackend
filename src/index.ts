// src/index.ts

// Выполняем инициализацию Firebase до импорта admin
import './firebase-init';

import cors from 'cors';
import express, { NextFunction, Request, Response } from 'express';
import Stripe from 'stripe';
import admin from './firebase-admin-export';

const app = express();

// Stripe инициализация
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
	apiVersion: '2025-04-30.basil',
});

app.use(cors({ origin: process.env.FRONTEND_URL }));
app.use(express.json());

// Типизация req.user
declare global {
	namespace Express {
		interface Request {
			user?: admin.auth.DecodedIdToken;
		}
	}
}

// Middleware для проверки авторизации Firebase
async function authenticateFirebase(
	req: Request,
	res: Response,
	next: NextFunction
): Promise<void> {
	const authHeader = req.headers.authorization;

	if (!authHeader || !authHeader.startsWith('Bearer ')) {
		return next(new Error('Unauthorized'));
	}

	const idToken = authHeader.split(' ')[1];

	try {
		const decodedToken = await admin.auth().verifyIdToken(idToken);
		req.user = decodedToken;
		next();
	} catch (error) {
		console.error('Error verifying Firebase ID token:', error);
		next(new Error('Unauthorized'));
	}
}

// Endpoint для создания Stripe Checkout Session
app.post(
	'/create-checkout-session',
	authenticateFirebase,
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const userId = req.user?.uid;

			const session = await stripe.checkout.sessions.create({
				payment_method_types: ['card'],
				mode: 'payment',
				line_items: [
					{
						price: process.env.STRIPE_PRICE_ID as string,
						quantity: 1,
					},
				],
				success_url: `${process.env.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
				cancel_url: `${process.env.FRONTEND_URL}/cancel`,
			});

			await admin.firestore().collection('purchases').doc(session.id).set({
				userId,
				sessionId: session.id,
				courseAccess: true,
				timestamp: admin.firestore.FieldValue.serverTimestamp(),
			});

			res.status(200).json({ url: session.url });
		} catch (err) {
			console.error('Failed to create checkout session:', err);
			next(new Error('Internal Server Error'));
		}
	}
);

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
	console.error('Error:', err.message);
	res.status(401).json({ error: err.message });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
	console.log(`✅ Server is running on port ${PORT}`);
});

app.post(
	'/check-access',
	authenticateFirebase,
	async (req: Request, res: Response, next: NextFunction): Promise<void> => {
		const userId = req.user?.uid;

		if (!userId) {
			res.status(401).json({ error: 'Unauthorized' });
			return next(); // Завершаем выполнение
		}

		try {
			const purchasesRef = admin.firestore().collection('purchases');

			// Проверяем наличие доступа
			const snapshot = await purchasesRef
				.where('userId', '==', userId)
				.where('courseAccess', '==', true)
				.get();

			if (!snapshot.empty) {
				res.status(200).json({ access: true });
			} else {
				res.status(200).json({ access: false });
			}

			return next();
		} catch (err) {
			console.error('Error checking course access:', err);
			next(new Error('Internal Server Error'));
		}
	}
);
