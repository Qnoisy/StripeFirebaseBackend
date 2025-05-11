import express, { NextFunction, Request, Response } from 'express';
import Stripe from 'stripe';
import admin from './firebase-admin-export';
import { authenticateFirebase } from './middlewares';

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
	apiVersion: '2025-04-30.basil',
});

const COURSE_ID = 'unique_course_id'; // Фиксированный ID курса

/**
 * POST /api/create-checkout-session
 */
router.post(
	'/create-checkout-session',
	authenticateFirebase,
	(req: Request, res: Response, next: NextFunction): void => {
		(async () => {
			try {
				const userId = req.user?.uid;

				if (!userId) {
					res.status(401).json({ error: 'User not authenticated' });
					return;
				}

				// Проверка наличия покупки
				const purchasesRef = admin.firestore().collection('purchases');
				const existingPurchase = await purchasesRef
					.where('userId', '==', userId)
					.where('courseId', '==', COURSE_ID)
					.get();

				if (!existingPurchase.empty) {
					console.log(`⚠️ User ${userId} already owns the course.`);
					res.status(400).json({ error: 'You already own this course.' });
					return;
				}

				// Создание сессии Stripe
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
					metadata: {
						userId,
						courseId: COURSE_ID,
					},
				});

				res.status(200).json({ url: session.url });
			} catch (err) {
				console.error('Error creating checkout session:', err);
				next(err);
			}
		})();
	}
);

/**
 * POST /api/check-access
 */
router.post(
	'/check-access',
	authenticateFirebase,
	(req: Request, res: Response, next: NextFunction): void => {
		(async () => {
			try {
				const userId = req.user?.uid;

				if (!userId) {
					res
						.status(401)
						.json({ access: false, message: 'User not authenticated' });
					return;
				}

				const purchasesRef = admin.firestore().collection('purchases');
				const existingPurchase = await purchasesRef
					.where('userId', '==', userId)
					.where('courseId', '==', COURSE_ID)
					.get();

				if (!existingPurchase.empty) {
					res.json({ access: true });
					return;
				}

				res.json({ access: false });
			} catch (err) {
				console.error('Error checking access:', err);
				next(err);
			}
		})();
	}
);

export default router;
