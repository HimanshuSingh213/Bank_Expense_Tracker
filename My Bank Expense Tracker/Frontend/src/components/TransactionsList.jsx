import TransactionItem from "./TransactionItem";

export default function TransactionsList() {

  return (
    <div className="mt-4 space-y-3">

      <TransactionItem
        title="Zomato Lunch"
        category="Food"
        date="10 Sep"
        amount={-450}
      />

      <TransactionItem
        title="Freelance Payment"
        category="Income"
        date="9 Sep"
        amount={25000}
      />

      <TransactionItem
        title="Metro Recharge"
        category="Travel"
        date="7 Sep"
        amount={-300}
      />

    </div>
  );
}
