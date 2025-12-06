import 'dotenv/config'
import express from "express";
import mongoose from 'mongoose';
import cors from "cors";


import { userInfo } from './user.model.js';
import { transaction } from './transaction.model.js';

const app = express()
const port = process.env.PORT || 5000;

app.use(cors({
    origin: "http://localhost:5173",
    credentials: true,
}));


app.use(express.json());

mongoose
    .connect(process.env.MONGO_URI)
    .then(() => console.log("MongoDB connected"))
    .catch((err) => console.error("DB connection error", err.message));


app.get("/api/transactions/:userId", async (req, res) => {
    const list = await transaction.find({ userId: req.params.userId })
    res.json(list);
});

app.patch("/api/transactions/:id", async (req, res) => {
    const updated = await transaction.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true }
    );

    res.json(updated);
});

app.delete("/api/transactions/:id", async (req, res) => {
    await transaction.findByIdAndDelete(req.params.id);
    res.json({ success: true });
});

app.post("/api/transactions", async (req, res) => {
    try {
        console.log("Request Body: ", req.body);

        const newTransaction = new transaction({
            userId: req.body.userId,
            title: req.body.title,
            amount: Number(req.body.amount),
            isExpense: req.body.isExpense,
            category: req.body.category,
            recipient: req.body.recipient,
            description: req.body.description,
            isOnline: req.body.isOnline,
        });

        const savedTransaction = await newTransaction.save();

        res.status(201).json(savedTransaction);

    } 
    catch (err) {
     
        console.error("Transaction Error: ", err);
        res.status(500).json({message: "Failed to save Transaction"});
    }
});

app.listen(port, () => {
    console.log(`Server listening on http://localhost:${port}`)
})