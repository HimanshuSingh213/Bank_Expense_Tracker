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
const navIcons = document.querySelectorAll(".contentBox .navBar .navRight .navIcons");
const balanceEditBtn = document.querySelector(".personalCard .header .header-right button:first-child");
const editYesBtn = document.querySelector(".contentBox .section2 .personalCard .header .header-right .editBtns button:nth-child(1)");
const editOptions = document.querySelector(".contentBox .section2 .personalCard .header .header-right .editBtns");
const editNoBtn = document.querySelector(".contentBox .section2 .personalCard .header .header-right .editBtns button:nth-child(2)");
const balanceEditInput = document.querySelector(".contentBox .section2 .personalCard .header .header-left .balance input");
const availableValue = document.querySelector(".personalCard .header .header-left .balance h2");
const totalRecieved = document.querySelector(".contentBox .section3 ul li:first-child h3");
const totalSpent = document.querySelector(".contentBox .section3 ul li:nth-child(2) h3");
const currentBalanceDisplay = document.querySelector(".contentBox .section3 ul li:last-child h3");
const filterList = document.querySelectorAll(".recentTransactions .filterTab .filterOptions ul li");
const calculator = document.querySelector(".contentBox .calculator");
const calcTransactionRemover = document.querySelector(".contentBox .spendCardList .spendCard .cardRight button");
let currentBalance = 0;
let balanceValue = 0;
let transactionSum = 0;
let allTransactions = [];

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
    const transactionCard = clone.querySelector(".transactionList");
    const cardTitle = clone.querySelector(".transactionList .cardInfo .cardLeft main p");
    const cardTitleSvg = clone.querySelector(".transactionList .cardInfo .cardLeft main");
    const cardAmount = clone.querySelector(".transactionList .cardInfo .cardRight .transaction");
    const cardCategory = clone.querySelector(".transactionList .cardInfo .cardLeft ul li:nth-child(1)");
    const cardDate = clone.querySelector(".transactionList .cardInfo .cardLeft ul li:nth-child(2)");
    const cardList = clone.querySelector(".transactionList .cardInfo .cardLeft ul");

    cardTitle.textContent = transactionNameValue;
    if (transactionTypeValue === "Expense") {
        cardAmount.classList.add("expense");
        cardAmount.classList.remove("income");
        cardAmount.textContent = "-₹" + formatIndianNumber(transactionAmountValue);
        currentBalance -= Math.floor(parseFloat(transactionAmountValue) * 100) / 100;
    }
    else {
        cardAmount.classList.add("income");
        cardAmount.classList.remove("expense");
        cardAmount.textContent = "+₹" + formatIndianNumber(transactionAmountValue);
        currentBalance += Math.floor(parseFloat(transactionAmountValue) * 100) / 100;
    }

    updateBalanceDisplay();

    if (Sender_recipientValue) {
        cardList.classList.add("ifRecipient");
        const cardRecipient = clone.querySelector(".transactionList .cardInfo .cardLeft ul li:nth-child(3)");
        if (cardRecipient) {
            cardRecipient.textContent = "• " + Sender_recipientValue;
        }
    }
    cardList.classList.add(transactionCategoryValue.toLowerCase());
    cardCategory.textContent = transactionCategoryValue;

    transactionCard.classList.toggle(`${transactionCategoryValue}`);

    const today = new Date();
    const day = today.getDate();
    const month = today.toLocaleString('en-US', { month: 'short' });
    const year = today.getFullYear();
    const formattedDate = `${day} ${month} ${year}`;
    cardDate.textContent = formattedDate;

    if (isOnline) {
        cardTitleSvg.classList.add("upi");
        transactionCard.classList.toggle("upi");
    } else {
        cardTitleSvg.classList.add("cash");
        transactionCard.classList.toggle("cash");
    }

    if (transactionDescriptionValue) {
        cardTitleSvg.classList.add("haveDescription");
    }

    // saving Transaction Data 
    const transactionData = {
        name: transactionNameValue,
        amount: Math.floor(parseFloat(transactionAmountValue) * 100) / 100,
        type: transactionTypeValue.toLowerCase(),
        category: transactionCategoryValue,
        date: new Date(),
        recipient: Sender_recipientValue,
        description: transactionDescriptionValue,
        isOnline: isOnline
    };

    allTransactions.push(transactionData);
    localStorage.setItem('allTransactions', JSON.stringify(allTransactions));

    recentTransactionList.prepend(clone);

    if (transactionSum === 1) {
        totalTransactions.textContent = transactionSum + " transaction";
    }
    else {
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

    const stats = calculateLast30DaysStats();

    totalSpent.textContent = `₹${stats.expense}`;
    totalRecieved.textContent = `₹${stats.income}`;

});

recentTransactionList.addEventListener("click", (e) => {
    if (e.target.closest("button#delete")) {
        const userResponse = confirm("Are you sure you want to delete this transaction?");
        if (userResponse) {
            const cardToDelete = e.target.closest(".transactionList");
            const cardAmount = cardToDelete.querySelector('.transaction').textContent;
            const amount = parseFloat(cardAmount.replace(/[₹+\-,\s]/g, ''));
            const isExpense = cardToDelete.querySelector('.transaction').classList.contains('expense');

            const transactionTitle = cardToDelete.querySelector(".cardInfo .cardLeft main p").textContent;

            if (isExpense) {
                currentBalance += amount;
            } else {
                currentBalance -= amount;
            }

            allTransactions = allTransactions.filter(transaction => {
                return !(
                    transaction.name === transactionTitle &&
                    transaction.amount === amount
                );
            });

            localStorage.setItem('allTransactions', JSON.stringify(allTransactions));

            updateBalanceDisplay();
            cardToDelete.remove();
            transactionSum--;

            if (transactionSum === 1) {
                totalTransactions.textContent = `${transactionSum} transaction`;
            } else {
                totalTransactions.textContent = `${transactionSum} transactions`;
            }

            const stats = calculateLast30DaysStats();
            totalSpent.textContent = '₹' + formatIndianNumber(stats.expense);
            totalRecieved.textContent = '₹' + formatIndianNumber(stats.income);
        }
    }
});

navIcons[0].addEventListener("click", () => {
    navIcons[0].style.filter = "invert(1)";
    navIcons[2].style.filter = "invert(0)";
});

navIcons[2].addEventListener("click", () => {
    navIcons[2].style.filter = "invert(1)";
    navIcons[0].style.filter = "invert(0)";
});

navIcons[1].addEventListener("click", () => {
    navIcons[2].style.filter = "invert(0)";
    navIcons[0].style.filter = "invert(0)";
});

function formatIndianNumber(num) {
    const numTruncated = Math.floor(parseFloat(num) * 100) / 100;
    const numFixed = numTruncated.toFixed(2);

    const parts = numFixed.split('.');
    const integerPart = parts[0];
    const decimalPart = parts[1];

    const lastThree = integerPart.substring(integerPart.length - 3);
    const otherNumbers = integerPart.substring(0, integerPart.length - 3);

    let formattedInteger;
    if (otherNumbers != '') {
        formattedInteger = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + lastThree;
    } else {
        formattedInteger = lastThree;
    }

    return formattedInteger + '.' + decimalPart;
}

balanceEditBtn.addEventListener("click", () => {
    balanceEditBtn.style.display = "none";
    editOptions.style.display = "flex";
    balanceEditInput.style.display = "block";
    availableValue.style.display = "none";
    balanceEditInput.value = availableValue.textContent.slice(1);
    balanceEditInput.focus();
});

editYesBtn.addEventListener("click", () => {
    balanceEditBtn.style.display = "";
    editOptions.style.display = "none";
    balanceEditInput.style.display = "";

    balanceValue = parseFloat(balanceEditInput.value) || 0;
    updateBalanceDisplay();
    currentBalanceDisplay.textContent = availableValue.textContent;
    setTimeout(() => {
        balanceEditInput.value = "";
    }, 100);
    availableValue.style.display = "";
});

editNoBtn.addEventListener("click", () => {
    balanceEditBtn.style.display = "";
    editOptions.style.display = "none";
    balanceEditInput.style.display = "";
    setTimeout(() => {
        balanceEditInput.value = "";
    }, 100);
    availableValue.style.display = "";
});

filterList.forEach(item => {
    item.addEventListener("click", (e) => {
        filterList.forEach(li => {
            li.style.filter = "invert(0)";
        });

        e.target.style.filter = "invert(1)";
    });
});

recentTransactionList.addEventListener("click", (e) => {
    const reviewCheckBox = e.target.closest(".transactionList .checkbox1");
    const transactionCard = e.target.closest(".transactionList");
    const cardTitle = transactionCard.querySelector(".cardInfo .cardLeft main p");

    if (reviewCheckBox) {
        reviewCheckBox.classList.toggle('checked');
        transactionCard.classList.toggle("reviewed");

        if (reviewCheckBox.classList.contains('checked')) {
            cardTitle.style.opacity = "0.4";
            cardTitle.style.textDecoration = "line-through";
        } else {
            cardTitle.style.opacity = "1";
            cardTitle.style.textDecoration = "none";
        }
    }
});

function calculateLast30DaysStats() {
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000));

    let totalExpense = 0;
    let totalIncome = 0;

    allTransactions.forEach(transaction => {
        if (transaction.date >= thirtyDaysAgo && transaction.date <= today) {
            if (transaction.type === 'expense') {
                totalExpense += transaction.amount;
            } else if (transaction.type === 'income') {
                totalIncome += transaction.amount;
            }
        }
    });

    return {
        expense: Math.floor(totalExpense * 100) / 100,
        income: Math.floor(totalIncome * 100) / 100,
    };
}

function isAnyCalculatorCheckboxChecked() {
    const allCheckboxes = document.querySelectorAll('.transactionList .checkbox2');

    for (let i = 0; i < allCheckboxes.length; i++) {
        if (allCheckboxes[i].classList.contains('checked')) {
            return true;
        }
    }

    return false;
}

recentTransactionList.addEventListener("click", (e) => {
    const calculatorCheckBox = e.target.closest(".transactionList .checkbox2");
    const transactionCard = e.target.closest(".transactionList");

    if (calculatorCheckBox) {
        calculatorCheckBox.classList.toggle('checked');

        if (calculatorCheckBox.classList.contains('checked')) {
            calculator.style.display = "";
            transactionCard.style.border = "2px solid #615fff";
            addTransactionToCalculator(transactionCard);
        }

        else {
            transactionCard.style.border = "";
            removeTransactionFromCalculator();

            if (!isAnyCalculatorCheckboxChecked()) {
                calculator.style.display = "none";
            }
        }
    }
});

function addTransactionToCalculator(transactionCard) {
    const spendCardList = document.querySelector(".spendCardList");

    const cardTemplate = document.querySelector("#spendCard");
    const clone = cardTemplate.content.cloneNode(true);

    const spendCard = clone.querySelector(".spendCard");
    const calcAmount = clone.querySelector(".spendCard .cardRight span");
    const calcDate = clone.querySelector(".spendCard .cardLeft p:last-child");
    const calcTitle = clone.querySelector(".spendCard .cardLeft p:first-child");

    // taking data from transaction cards
    calcTitle.textContent = transactionCard.querySelector(".transactionList .cardInfo .cardLeft main p").textContent;
    calcAmount.textContent = transactionCard.querySelector(".transactionList .cardInfo .cardRight .transaction").textContent;
    calcDate.textContent = transactionCard.querySelector(".transactionList .cardInfo .cardLeft ul li:nth-child(2)").textContent;

    if (transactionCard.querySelector(".transaction").classList.contains("expense")) {
        spendCard.classList.add("expense");
        spendCard.classList.remove("income");
    }
    else if (transactionCard.querySelector(".transaction").classList.contains("income")) {
        spendCard.classList.add("income");
        spendCard.classList.remove("expense");
    }

    spendCardList.append(clone);
}

function removeTransactionFromCalculator() {
    const spendCardList = document.querySelector(".spendCardList");
    const lastCard = spendCardList.querySelector(".spendCard:last-child");
    if (lastCard) {
        lastCard.remove();
    }
}

recentTransactionList.addEventListener("click", (e) => {
    const calcTransactionRemover = e.target.closest(".contentBox .spendCardList .spendCard .cardRight button");

    if (calcTransactionRemover) {
        removeTransactionFromCalculator();
    }
});

function renderTransaction(transaction) {
    const clone = cardTemplate.content.cloneNode(true);

    const transactionCard = clone.querySelector('.transactionList');
    const cardTitle = clone.querySelector('.transactionList .cardInfo .cardLeft main p');
    const cardTitleSvg = clone.querySelector('.transactionList .cardInfo .cardLeft main');
    const cardAmount = clone.querySelector('.transactionList .cardInfo .cardRight .transaction');
    const cardDate = clone.querySelector('.transactionList .cardInfo .cardLeft ul li:nth-child(2)');
    const cardCategory = clone.querySelector('.transactionList .cardInfo .cardLeft ul li:nth-child(1)');
    const cardList = clone.querySelector('.transactionList .cardInfo .cardLeft ul');

    cardTitle.textContent = transaction.name;

    if (transaction.type === 'expense') {
        cardAmount.classList.add('expense');
        cardAmount.classList.remove('income');
        cardAmount.textContent = '- ₹' + formatIndianNumber(transaction.amount);
    } else {
        cardAmount.classList.add('income');
        cardAmount.classList.remove('expense');
        cardAmount.textContent = '+ ₹' + formatIndianNumber(transaction.amount);
    }

    cardList.classList.add(transaction.category.toLowerCase());
    cardCategory.textContent = transaction.category;
    transactionCard.classList.toggle(transaction.category);

    cardDate.textContent = transaction.date.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });

    if (transaction.isOnline) {
        cardTitleSvg.classList.add('upi');
        transactionCard.classList.add('upi');
    } else {
        cardTitleSvg.classList.add('cash');
        transactionCard.classList.add('cash');
    }

    if (transaction.recipient) {
        cardList.classList.add('ifRecipient');
        const cardRecipient = clone.querySelector('.transactionList .cardInfo .cardLeft ul li:nth-child(3)');
        if (cardRecipient) {
            cardRecipient.textContent = transaction.recipient;
        }
    }

    if (transaction.description) {
        cardTitleSvg.classList.add('haveDescription');
    }

    recentTransactionList.prepend(clone);
}

function loadAllTransactions() {
    allTransactions.forEach(transaction => {
        renderTransaction(transaction);
    });

    // Update counters
    transactionSum = allTransactions.length;
    if (transactionSum === 1) {
        totalTransactions.textContent = `${transactionSum} transaction`;
    } else {
        totalTransactions.textContent = `${transactionSum} transactions`;
    }

    // Update stats
    const stats = calculateLast30DaysStats();
    totalSpent.textContent = '₹' + formatIndianNumber(stats.expense);
    totalRecieved.textContent = '₹' + formatIndianNumber(stats.income);
}

window.addEventListener('load', () => {
    const savedTransactions = localStorage.getItem('allTransactions');
    if (savedTransactions) {
        allTransactions = JSON.parse(savedTransactions);
        // Convert date strings back to Date objects
        allTransactions = allTransactions.map(t => ({
            ...t,
            date: new Date(t.date)
        }));
        loadAllTransactions();

        const totalBalance = allTransactions.reduce((acc, transaction) => {
            if (transaction.type === 'income') {
                return acc + transaction.amount;
            } else {
                return acc - transaction.amount;
            }
        }, 0);
        currentBalance = totalBalance;
        updateBalanceDisplay();
    }
});

function updateBalanceDisplay() {
    const formattedBalance = '₹' + formatIndianNumber(currentBalance);
    availableValue.textContent = formattedBalance;
    currentBalanceDisplay.textContent = formattedBalance;
}


// to do - need to make a function that updates totalSpend totalrecieved for every task deleted
// to do - also now if i am deleting a expense transaction it updating available and current balance that needs to be fixed