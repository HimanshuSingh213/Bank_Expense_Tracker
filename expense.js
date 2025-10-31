const Btns = document.querySelectorAll("button");
const transactionName = document.querySelector("content .part1 .name input");
const transactionAmount = document.querySelector("content .part1 .amount input");
const Sender_recipient = document.querySelector("content .part2 .sender input");
const transactionType = document.querySelector("content .part3 .type select");
const transactionCategory = document.querySelector("content .part3 .category select");
const transactionDescription = document.querySelector("content .part4 .description textarea");
const recentTransactionList = document.querySelector(".recentTransactionList");
const recentTransactions = document.querySelector(".contentBox .recentTransactions");
const addTransactionBtn = document.querySelector("content .part6 button");
const cardTemplate = document.querySelector("#transactionList");
const totalTransactions = document.querySelector(".recentTransactions header p");
let transactionSum = 0;

function addNewTransaction() {
    // reading inputs
    const transactionNameValue = transactionName.value.trim();
    const transactionAmountValue = transactionAmount.value;
    const Sender_recipientValue = Sender_recipient.value.trim();
    const transactionTypeValue = transactionType.value;
    const transactionCategoryValue = transactionCategory.value;
    const transactionDescriptionValue = transactionDescription.value.trim();
    const onlineCheckbox = document.querySelector("#online");
    const isOnline = onlineCheckbox.checked;

    // cloning template 
    const clone = cardTemplate.content.cloneNode(true);

    // accessing card elements
    const cardTitle = clone.querySelector(".transactionList .cardInfo .cardLeft main p");
    const cardTitleSvg = clone.querySelector(".transactionList .cardInfo .cardLeft main");
    const cardAmount = clone.querySelector(".transactionList .cardInfo .cardRight .transaction");
    const cardCategory = clone.querySelector(".transactionList .cardInfo .cardLeft ul li:nth-child(1)");
    const cardDate = clone.querySelector(".transactionList .cardInfo .cardLeft ul li:nth-child(2)");
    const cardList = clone.querySelector(".transactionList .cardInfo .cardLeft ul");

    cardTitle.textContent = transactionNameValue;
    if (transactionTypeValue === "expense") {
        cardAmount.classList.add("expense");
        cardAmount.classList.remove("income");
        cardAmount.textContent = "-₹" + transactionAmountValue;
    }
    else {
        cardAmount.classList.add("income");
        cardAmount.classList.remove("expense");
        cardAmount.textContent = "+₹" + transactionAmountValue;
    }

    if (Sender_recipientValue) {
        cardList.classList.add("ifRecipient");
        const cardRecipient = clone.querySelector(".transactionList .cardInfo .cardLeft ul li:nth-child(3)");
        if (cardRecipient) {
            cardRecipient.textContent = "• " + Sender_recipientValue;
        }
    }
    cardList.classList.add(transactionCategoryValue.toLowerCase());
    cardCategory.textContent = transactionCategoryValue;
    
    const today = new Date();
    const day = today.getDate();
    const month = today.toLocaleString('en-US', { month: 'short' });
    const year = today.getFullYear();
    const formattedDate = `${day} ${month} ${year}`;
    cardDate.textContent = formattedDate;

    if (isOnline) {
        cardTitleSvg.classList.add("upi");
    } else {
        cardTitleSvg.classList.add("cash");
    }

    if(transactionDescriptionValue){
        cardTitleSvg.classList.add("haveDescription");
    }

    recentTransactionList.prepend(clone);

    if (transactionSum === 1) {
        totalTransactions.textContent = transactionSum + " transaction";
    }
    else{
        totalTransactions.textContent = transactionSum + " transactions";
    }
    setTimeout(() => {
        transactionName.value = "";
        transactionAmount.value = "";
        transactionType.value = "Expense";
        transactionCategory.value = "Food";
        transactionDescription.value = "";
        if (Sender_recipientValue) {
            Sender_recipient.value = "";
        }
        if (onlineCheckbox.checked) {
            onlineCheckbox.checked = false;
        }

    }, 100);
}

Btns.forEach(Btn => {
    Btn.style.cursor = "pointer";
});

addTransactionBtn.addEventListener("click", () => {
    const transactionNameValue = transactionName.value.trim();
    const transactionAmountValue = transactionAmount.value;

    transactionName.classList.remove("error");
    transactionAmount.classList.remove("error");

    let hasError = false;

    if (!transactionNameValue) {
        transactionName.classList.add("error");
        hasError = true;
    }

    if (!transactionAmountValue) {
        transactionAmount.classList.add("error");
        hasError = true;
    }

    if (!hasError) {
        ++transactionSum;
        addNewTransaction();
    }

});

