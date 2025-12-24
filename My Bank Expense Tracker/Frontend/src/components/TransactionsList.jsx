import { useAccount } from "../context/ExpenseContext";
import TransactionItem from "./TransactionItem";

export default function TransactionsList() {
  const { transactions } = useAccount();
  return (
    <div className="mt-4 space-y-3">

      {transactions.map((transaction) => (

        <TransactionItem
          key={transaction._id}
          id={transaction._id}
          title={transaction.title}
          category={transaction.category}
          date={transaction.date}
          amount={transaction.amount}
          recipient={transaction.recipient}
          isExpense={transaction.isExpense}
          hasDescription={transaction.description}
          isOnline={transaction.isOnline}
          balance={transaction.balance}
          checked1={transaction.reviewed}
          checked2={transaction.inCalculator}
        />
      ))}

      {/* <TransactionItem
        title="Freelance Payment"
        category="Income"
        date="9 Sep"
        amount={25000}
        recipient="Himanshu Singh"
        isExpense={false}
        hasDescription={true}
        expenseMode="cash"
      />

      <TransactionItem
        title="Metro Recharge"
        category="Travel"
        date="7 Sep"
        amount={300}
        recipient="DMRC"
        isExpense={true}
        hasDescription={true}
        expenseMode="upi"
      /> */}

    </div>
  );
}
