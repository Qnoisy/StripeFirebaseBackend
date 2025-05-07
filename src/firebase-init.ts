// src/firebase-init.ts

import dotenv from 'dotenv';
import * as admin from 'firebase-admin';

dotenv.config();

if (!admin.apps.length) {
	console.log('✅ Initializing Firebase Admin SDK...');
	admin.initializeApp({
		credential: admin.credential.cert({
			projectId: process.env.FIREBASE_PROJECT_ID,
			clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
			privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
		}),
	});
} else {
	console.log('✅ Firebase Admin SDK already initialized.');
}
