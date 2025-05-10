"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateFirebase = void 0;
const firebase_admin_export_1 = __importDefault(require("./firebase-admin-export"));
const authenticateFirebase = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    const idToken = authHeader.split(' ')[1];
    try {
        const decodedToken = await firebase_admin_export_1.default.auth().verifyIdToken(idToken);
        req.user = decodedToken;
        next();
    }
    catch (error) {
        console.error('Error verifying Firebase ID token:', error);
        res.status(401).json({ error: 'Unauthorized' });
    }
};
exports.authenticateFirebase = authenticateFirebase;
