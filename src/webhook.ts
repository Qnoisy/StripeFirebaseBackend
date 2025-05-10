import bodyParser from 'body-parser';
import express, { Request, Response } from 'express';
import Stripe from 'stripe';
import admin from './firebase-admin-export';

const webhook = express.Router();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
	apiVersion: '2024-01-01' as Stripe.LatestApiVersion,
});

// Используем raw body для webhook
webhook.use(bodyParser.raw({ type: 'application/json' }));

// Обработка Webhook
webhook.post('/', async (req: Request, res: Response): Promise<void> => {
	const sig = req.headers['stripe-signature'];
	const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

	if (!endpointSecret) {
		console.error('Webhook secret not configured.');
		res.status(500).send('Webhook secret not configured.');
		return;
	}

	try {
		const event = stripe.webhooks.constructEvent(
			req.body,
			sig!,
			endpointSecret
		);

		switch (event.type) {
			case 'checkout.session.completed':
				const session = event.data.object as Stripe.Checkout.Session;
				const userId = session.metadata?.userId;
				if (!userId) {
					console.warn(
						`No userId found in session metadata for session: ${session.id}`
					);
				}
				console.log('Webhook received:', event.type);
				if (userId) {
					await admin.firestore().collection('purchases').doc(session.id).set({
						userId,
						sessionId: session.id,
						courseAccess: true,
						timestamp: admin.firestore.FieldValue.serverTimestamp(),
					});

					console.log(`✅ Purchase recorded for user ${userId}`);
				}
				break;

			default:
				console.warn(`Unhandled event type: ${event.type}`);
		}

		res.status(200).json({ received: true });
		return;
	} catch (err) {
		const errorMessage = err instanceof Error ? err.message : 'Unknown error';
		console.error('Webhook Error:', errorMessage);
		res.status(400).send(`Webhook Error: ${errorMessage}`);
		return;
	}
});
export default webhook;
