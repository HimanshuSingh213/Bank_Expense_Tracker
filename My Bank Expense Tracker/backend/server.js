import 'dotenv/config'
import express from "express";
import mongoose from 'mongoose';
import cors from "cors";


import { userInfo } from './user.model.js';
import { transaction } from './transaction.model.js';
import { accountInfo } from "./account.model.js";

const app = express()
const port = process.env.PORT || 5000;

// MiddleWare
app.use(cors({
    origin: "http://localhost:5173",
    credentials: true,
}));

app.use(express.json());

// DB connection
mongoose
    .connect(process.env.MONGO_URI)
    .then(() => console.log("MongoDB connected"))
    .catch((err) => console.error("DB connection error", err.message));


// Get all accounts of a user
app.get("/api/accounts/:userId", async (req, res) => {
    const accounts = await accountInfo.find({ userId: req.params.userId });
    res.json(accounts);
})

// Set Balance with the CSV Import 
app.patch("/api/accounts/:accountId/balance", async (req, res) => {
    try {

        const { balance } = req.body;

        if (typeof balance !== "number") {
            return res.status(400).json({ message: "Balance must be a number" });
        }

        const account = await accountInfo.findOneAndUpdate(
            { accountId: req.params.accountId },
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
app.get("/api/accounts/account/:accountId", async (req, res) => {
    try {
        const account = await accountInfo.findOne({
            accountId: req.params.accountId
        });

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


//Transaction APIs

// Get all Transactions of a user
app.get("/api/transactions/:userId/:accountId", async (req, res) => {
    const list = await transaction.find({ userId: req.params.userId, accountId: req.params.accountId })
        .sort({ createdAt: -1 });

    res.json(list);
});

// Add Transaction to DB
app.post("/api/transactions", async (req, res) => {
    try {
        console.log("Request Body: ", req.body);

        const newTransaction = new transaction({
            userId: req.body.userId,
            accountId: req.body.accountId,
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

        const { amount, isExpense, accountId } = req.body;
        // update account balance with addition of every manually added transaction
        const change = isExpense ? -Number(amount) : Number(amount);
        await accountInfo.findOneAndUpdate(
            { accountId },
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
    // await accountInfo.findByIdAndUpdate(txn.accountId, {
    //     $inc: { currentBalance: change },
    // });

    await accountInfo.findOneAndUpdate(
        { accountId: txn.accountId },
        { $inc: { currentBalance: change } }
    );

    await txn.deleteOne();
    res.json({ success: true });
});

// Server
app.listen(port, () => {
    console.log(`Server listening on http://localhost:${port}`)
})