import bodyParser from 'body-parser';
import express, { Request, Response } from 'express';
import Stripe from 'stripe';
import admin from './firebase-admin-export';

const webhook = express.Router();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
	apiVersion: '2025-04-30.basil',
});

// Используем raw body для webhook
webhook.use(bodyParser.raw({ type: 'application/json' }));

webhook.post('/', async (req: Request, res: Response): Promise<void> => {
	const sig = req.headers['stripe-signature'];
	const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

	if (!endpointSecret) {
		console.error('Webhook secret not configured.');
		res.status(500).send('Webhook secret not configured.');
		return;
	}

	if (!sig) {
		console.error('Stripe signature is missing.');
		res.status(400).send('Stripe signature is missing.');
		return;
	}

	let event: Stripe.Event;

	try {
		event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);

		switch (event.type) {
			case 'checkout.session.completed':
				const session = event.data.object as Stripe.Checkout.Session;
				const userId = session.metadata?.userId;
				const courseId = session.metadata?.courseId;
				const sessionId = session.id;

				if (!userId || !courseId) {
					console.warn(`Missing userId or courseId for session: ${sessionId}`);
					res.status(400).json({ error: 'Missing userId or courseId' });
					return;
				}

				console.log(
					`✅ Webhook received for user: ${userId}, course: ${courseId}, session: ${sessionId}`
				);

				const purchasesRef = admin.firestore().collection('purchases');

				// Проверяем, куплен ли уже этот курс пользователем
				const existingPurchaseQuery = await purchasesRef
					.where('userId', '==', userId)
					.where('courseId', '==', courseId)
					.get();

				if (!existingPurchaseQuery.empty) {
					console.log(
						`⚠️ User ${userId} has already purchased course ${courseId}`
					);
					res.status(200).json({ message: 'Course already purchased' });
					return;
				}

				// Записываем новую покупку
				await purchasesRef.doc(sessionId).set({
					userId,
					courseId,
					sessionId,
					courseAccess: true,
					timestamp: admin.firestore.FieldValue.serverTimestamp(),
				});

				console.log(
					`✅ Purchase recorded for user ${userId}, course ${courseId}`
				);
				res.status(200).json({ received: true });
				break;

			default:
				console.warn(`Unhandled event type: ${event.type}`);
				res.status(200).json({ received: true });
		}
	} catch (err) {
		console.error('Webhook Error:', (err as Error).message);
		res.status(400).send(`Webhook Error: ${(err as Error).message}`);
	}
});

export default webhook;
