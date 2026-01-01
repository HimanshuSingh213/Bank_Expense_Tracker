import 'dotenv/config'
import express from "express";
import mongoose from 'mongoose';
import cors from "cors";
import helmet from "helmet";

import { transaction } from './transaction.model.js';
import { accountInfo } from "./account.model.js";
import { userInfo } from "./user.model.js";

const app = express()
const port = process.env.PORT || 5000;

// MiddleWare
app.use(cors({
    origin: process.env.ORIGIN,
    credentials: true,
}));

app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            "default-src": ["'self'"],
            "script-src": ["'self'", "'unsafe-inline'"],
            "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            "font-src": ["'self'", "https://fonts.gstatic.com"],
            "img-src": ["'self'", "data:"],
            "connect-src": ["'self'", process.env.ORIGIN],
        },
    },
}));

app.use(express.json());

// Temporary object Id 
const TEMP_USER = new mongoose.Types.ObjectId("6947e733c2c118727b747f12");
const TEMP_ACCOUNT = new mongoose.Types.ObjectId("6947e721c2c118727b747f0f");

// DB connection
mongoose
    .connect(process.env.MONGO_URI)
    .then(() => console.log("MongoDB connected"))
    .catch((err) => console.error("DB connection error", err.message));


// Get all accounts of a user
app.get("/api/accounts", async (req, res) => {
    const accounts = await accountInfo.find({
        userId: TEMP_USER
    });
    res.json(accounts);
})

// Set Balance with the CSV Import 
app.patch("/api/accounts/balance", async (req, res) => {
    try {

        const { balance } = req.body;

        if (typeof balance !== "number") {
            return res.status(400).json({ message: "Balance must be a number" });
        }

        const account = await accountInfo.findByIdAndUpdate(
            TEMP_ACCOUNT,
            {
                currentBalance: balance,
                lastSyncedAt: new Date(),
            },
            { new: true }
        );
        res.json(account);
    }
    catch (err) {
        console.error("Balance update error:", err);
        res.status(500).json({ message: "Failed to update balance" });
    }
});

// Get single account (for balance)
app.get("/api/accounts/account", async (req, res) => {
    try {
        const account = await accountInfo.findById(TEMP_ACCOUNT);

        if (!account) {
            return res.status(404).json({ message: "Account not found" });
        }

        res.json(account);
    }
    catch (err) {
        console.error("Failed to fetch account", err);
        res.status(500).json({ message: "Failed to fetch account" });
    }
});

// Get logged-in user info
app.get("/api/me", async (req, res) => {
    try {
        const user = await userInfo.findById(TEMP_USER).select("name email");
        res.json(user);
    } catch (err) {
        res.status(500).json({ message: "Failed to fetch user info" });
    }
});


//Transaction APIs

// Get all Transactions of a user
app.get("/api/transactions", async (req, res) => {
    const list = await transaction.find({
        userId: TEMP_USER,
        accountId: TEMP_ACCOUNT
    })
        .sort({ createdAt: -1 });

    res.json(list);
});

// Add Transaction to DB
app.post("/api/transactions", async (req, res) => {
    try {
        console.log("Request Body: ", req.body);

        const newTransaction = new transaction({
            userId: TEMP_USER,
            accountId: TEMP_ACCOUNT,
            title: req.body.title,
            amount: Number(req.body.amount),
            isExpense: req.body.isExpense,
            category: req.body.category,
            recipient: req.body.recipient,
            description: req.body.description,
            isOnline: req.body.isOnline,
            date: req.body.date,
        });

        const savedTransaction = await newTransaction.save();

        const { amount, isExpense } = req.body;
        // update account balance with addition of every manually added transaction
        const change = isExpense ? -Number(amount) : Number(amount);
        await accountInfo.findByIdAndUpdate(
            TEMP_ACCOUNT,
            { $inc: { currentBalance: change } }
        );


        res.status(201).json(savedTransaction);

    }
    catch (err) {
        console.error("Transaction Error: ", err);
        res.status(500).json({ message: "Failed to save Transaction" });
    }
});

// Update Transactions manually
app.patch("/api/transactions/:id", async (req, res) => {
    const updated = await transaction.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true }
    );

    res.json(updated);
});

// Delete transaction manually
app.delete("/api/transactions/:id", async (req, res) => {
    const txn = await transaction.findById(req.params.id);

    if (!txn) return res.status(404).json({ message: "Transaction Not Found" });

    const change = txn.isExpense ? txn.amount : -txn.amount;
    await accountInfo.findByIdAndUpdate(txn.accountId, {
        $inc: { currentBalance: change },
    });

    await txn.deleteOne();
    res.json({ success: true });
});

// Server
app.listen(port, () => {
    console.log(`Server listening on http://localhost:${port}`)
})