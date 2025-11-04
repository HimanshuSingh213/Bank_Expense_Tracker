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
        localStorage.setItem("currentBalance", currentBalance);
    }
    else {
        cardAmount.classList.add("income");
        cardAmount.classList.remove("expense");
        cardAmount.textContent = "+₹" + formatIndianNumber(transactionAmountValue);
        currentBalance += Math.floor(parseFloat(transactionAmountValue) * 100) / 100;
        localStorage.setItem("currentBalance", currentBalance);
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

            localStorage.setItem("currentBalance", currentBalance);

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
    if (typeof num !== 'number') {
        num = parseFloat(num);  // Convert to number if it's a string
    }
    if (isNaN(num)) return '0';

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

    currentBalance = parseFloat(balanceEditInput.value) || 0;

    localStorage.setItem("currentBalance", currentBalance);

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

        const transactionName = cardTitle.textContent;
        const cardAmount = transactionCard.querySelector(".transaction").textContent;
        const cardDate = transactionCard.querySelector(".cardInfo .cardLeft ul li:nth-child(2)").textContent;
        const storageKey = `checked_${transactionName}_${cardAmount}_${cardDate}`;

        if (reviewCheckBox.classList.contains('checked')) {
            cardTitle.style.opacity = "0.4";
            cardTitle.style.textDecoration = "line-through";
            transactionCard.style.backgroundColor = "#f2f2f2c4";
            localStorage.setItem(storageKey, JSON.stringify(true));
        } else {
            cardTitle.style.opacity = "1";
            cardTitle.style.textDecoration = "none";
            transactionCard.style.backgroundColor = "";
            localStorage.setItem(storageKey, JSON.stringify(false));
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
            removeTransactionFromCalculator(transactionCard);

            if (!isAnyCalculatorCheckboxChecked()) {
                calculator.style.display = "none";
            }
        }
    }
});

const totalIncomeOnCalculator = document.querySelector(".infoBox .totalIncome .value ");
let incomeOnCalculator = 0;
const totalExpenseOnCalculator = document.querySelector(".infoBox .totalExpense .value");
let expenseOnCalculator = 0;
const newAmountOnCalculator = document.querySelector(".infoBox .netAmount .value");
let FinalAmountOnCalculator = 0;

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
        expenseOnCalculator += parseFloat(transactionCard.querySelector(".cardInfo .cardRight .transaction.expense").textContent.slice(1).replace(/[^0-9.]/g, ""));
        console.log(expenseOnCalculator);
        totalExpenseOnCalculator.textContent = `₹${(expenseOnCalculator)}`
    }
    else if (transactionCard.querySelector(".transaction").classList.contains("income")) {
        spendCard.classList.add("income");
        spendCard.classList.remove("expense");
        incomeOnCalculator += parseFloat(transactionCard.querySelector(".cardInfo .cardRight .transaction.income").textContent.slice(1).replace(/[^0-9.]/g, ""));
        console.log(incomeOnCalculator);
        totalIncomeOnCalculator.textContent = `₹${(incomeOnCalculator)}`
    }

    if (incomeOnCalculator-expenseOnCalculator < 0 ) {
        newAmountOnCalculator.classList.add("subtracted");
        newAmountOnCalculator.classList.remove("added");
        newAmountOnCalculator.textContent = `₹${(incomeOnCalculator-expenseOnCalculator).toFixed(2)}`;
    }
    else if (incomeOnCalculator-expenseOnCalculator >= 0 ) {
        newAmountOnCalculator.classList.add("added");
        newAmountOnCalculator.classList.remove("subtracted");
        newAmountOnCalculator.textContent = `₹${(incomeOnCalculator-expenseOnCalculator).toFixed(2)}`;
    }

    spendCardList.append(clone);
}

function removeTransactionFromCalculator(transactionCard) {
    const spendCardList = document.querySelector(".spendCardList");
    if (!transactionCard) return;

    const transactionElement = transactionCard.querySelector(".cardInfo .cardRight .transaction");
    if (!transactionElement) return;

    const amountText = transactionElement.textContent || "";
    const amountValue = parseFloat(amountText.replace(/[^0-9.]/g, "")) || 0;
    const isExpense = transactionElement.classList.contains("expense");
    const isIncome = transactionElement.classList.contains("income");

    // Remove the specific spendCard with the same title
    const transactionTitle = transactionCard.querySelector(".cardInfo .cardLeft main p").textContent;
    const allSpendCards = document.querySelectorAll(".spendCardList .spendCard");

    allSpendCards.forEach(card => {
        const cardTitle = card.querySelector(".cardLeft p:first-child").textContent;
        if (cardTitle === transactionTitle) {
            card.remove();
        }
    });

    // Update calculator totals
    if (isExpense) {
        expenseOnCalculator = Math.max(0, expenseOnCalculator - amountValue);
    } 
    else if (isIncome) {
        incomeOnCalculator = Math.max(0, incomeOnCalculator - amountValue);
    }

    totalIncomeOnCalculator.textContent = `₹${incomeOnCalculator.toFixed(2)}`;
    totalExpenseOnCalculator.textContent = `₹${expenseOnCalculator.toFixed(2)}`;

    newAmountOnCalculator.textContent = `₹${incomeOnCalculator - expenseOnCalculator.toFixed(2)}`;

    if (incomeOnCalculator - expenseOnCalculator < 0) {
        newAmountOnCalculator.classList.add("subtracted");
        newAmountOnCalculator.classList.remove("added");
    } 
    else {
        newAmountOnCalculator.classList.add("added");
        newAmountOnCalculator.classList.remove("subtracted");
    }
}


function renderTransaction(transaction) {
    const clone = cardTemplate.content.cloneNode(true);

    const transactionCard = clone.querySelector('.transactionList');
    const cardTitle = clone.querySelector('.transactionList .cardInfo .cardLeft main p');
    const cardTitleSvg = clone.querySelector('.transactionList .cardInfo .cardLeft main');
    const cardAmount = clone.querySelector('.transactionList .cardInfo .cardRight .transaction');
    const cardDate = clone.querySelector('.transactionList .cardInfo .cardLeft ul li:nth-child(2)');
    const cardCategory = clone.querySelector('.transactionList .cardInfo .cardLeft ul li:nth-child(1)');
    const cardList = clone.querySelector('.transactionList .cardInfo .cardLeft ul');
    const checkBox = clone.querySelector(".transactionList .checkbox1");

    cardTitle.textContent = transaction.name;

    if (transaction.type === 'expense') {
        cardAmount.classList.add('expense');
        cardAmount.classList.remove('income');
        cardAmount.textContent = '- ₹' + formatIndianNumber(transaction.amount);
    }
    else {
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
            cardRecipient.textContent = "• " + transaction.recipient;
        }
    }

    const storageKey = `checked_${cardTitle.textContent}_${cardAmount.textContent}_${cardDate.textContent}`;
    const wasChecked = localStorage.getItem(storageKey);

    if (wasChecked !== null && JSON.parse(wasChecked)) {
        checkBox.classList.add('checked');
        transactionCard.classList.add("reviewed");
        cardTitle.style.opacity = "0.4";
        cardTitle.style.textDecoration = "line-through";
        transactionCard.style.backgroundColor = "#f2f2f2c4";
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

        const savedBalance = localStorage.getItem("currentBalance");
        if (savedBalance !== null) {
            currentBalance = parseFloat(savedBalance);
        }
        else {
            const totalBalance = allTransactions.reduce((acc, transaction) => {
                if (transaction.type === 'income') {
                    return acc + transaction.amount;
                }
                else {
                    return acc - transaction.amount;
                }
            }, 0);
            currentBalance = totalBalance;
        }
        updateBalanceDisplay();
    }
});

function updateBalanceDisplay() {
    const formattedBalance = '₹' + formatIndianNumber(currentBalance);
    availableValue.textContent = formattedBalance;
    currentBalanceDisplay.textContent = formattedBalance;
}


const importBtn = document.getElementById('importBtn');
const csvFile = document.getElementById('csvFile');

importBtn.addEventListener('click', () => {
    csvFile.click();
});

csvFile.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
        const text = await file.text();
        const lines = text.split('\n');

        let headerIndex = -1;
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes('Txn Date') && lines[i].includes('Debit')) {
                headerIndex = i;
                break;
            }
        }

        if (headerIndex === -1) {
            alert('❌ Invalid CSV format');
            return;
        }

        const transactions = [];

        for (let i = headerIndex + 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            try {
                const cols = [];
                let current = '';
                let inQuotes = false;
                
                for (let j = 0; j < line.length; j++) {
                    const char = line[j];
                    if (char === '"') {
                        inQuotes = !inQuotes;
                    } else if (char === ',' && !inQuotes) {
                        cols.push(current.replace(/"/g, '').trim());
                        current = '';
                    } else {
                        current += char;
                    }
                }
                cols.push(current.replace(/"/g, '').trim());
                
                if (cols.length < 7) continue;
                
                const txnDate = cols[0];
                const description = cols[2];
                const debitFull = cols[4];  // Now contains full "1,032.70"
                const creditFull = cols[5];  // Now contains full "500.00"
                
                // ✅ FIXED: Remove commas from amounts properly
                const debit = debitFull.replace(/,/g, '');
                const credit = creditFull.replace(/,/g, '');
                
                if (!txnDate || txnDate.length < 5) continue;
                
                let date = new Date(txnDate);
                
                if (isNaN(date.getTime())) {
                    const parts = txnDate.split('-');
                    if (parts.length === 3) {
                        const day = parseInt(parts[0]);
                        const monthStr = parts[1];
                        const year = parseInt(parts[2]);
                        const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
                        const month = months.indexOf(monthStr.toUpperCase());
                        if (month !== -1) {
                            date = new Date(2000 + year, month, day);
                        } else {
                            continue;
                        }
                    } else {
                        continue;
                    }
                }
                
                let amount = 0;
                let transactionType = 'income';
                
                const debitNum = parseFloat(debit);
                const creditNum = parseFloat(credit);
                
                if (!isNaN(debitNum) && debitNum > 0) {
                    amount = debitNum;
                    transactionType = 'expense';
                }
                else if (!isNaN(creditNum) && creditNum > 0) {
                    amount = creditNum;
                    transactionType = 'income';
                }
                else {
                    continue;
                }
                
                console.log(`CSV Row: debit="${debit}" (${debitNum}) credit="${credit}" (${creditNum}) → amount=${amount} type=${transactionType}`);

                if (isNaN(amount) || amount === 0) continue;

                const descParts = description.split('/');
                let senderReceiver = 'Unknown';
                let category = 'Others';

                if (descParts.length > 3) {
                    senderReceiver = descParts[3].trim();
                }

                const nameUpper = senderReceiver.toUpperCase();

                if (nameUpper.includes('NPCI BHIM')) {
                    category = 'Cashback';
                }
                else if (nameUpper.includes('DMRC') || nameUpper.includes('METRO') || nameUpper.includes('DELHI') || nameUpper.includes('IRCTC') || nameUpper.includes('TRAIN')) {
                    category = 'Travel';
                }
                else if (nameUpper.includes('SWIGGY') || nameUpper.includes('ZOMATO') || nameUpper.includes('FOOD')) {
                    category = 'Food';
                }
                else if (nameUpper.includes('AMAZON') || nameUpper.includes('FLIPKART') || nameUpper.includes('MALL') || nameUpper.includes('STORE') || nameUpper.includes('SHOPPING')) {
                    category = 'Shopping';
                }
                else if (nameUpper.includes('JIO') || nameUpper.includes('ELECTRICITY') || nameUpper.includes('WATER') || nameUpper.includes('GAS') || nameUpper.includes('MOBILE')) {
                    category = 'Bills';
                }
                else {
                    category = 'Others';
                }

                transactions.push({
                    name: senderReceiver,
                    amount: Math.abs(amount),
                    type: transactionType,
                    category: category,
                    date: date,
                    description: `UPI - ${senderReceiver}`,
                    isOnline: true,
                    recipient: senderReceiver,
                    is_checked: false
                });

            } catch (err) {
                console.error('Parse error:', err);
                continue;
            }
        }

        if (transactions.length === 0) {
            alert('❌ No valid transactions found');
            return;
        }

        allTransactions = [...transactions, ...allTransactions];
        localStorage.setItem('allTransactions', JSON.stringify(allTransactions));

        currentBalance = allTransactions.reduce((acc, t) => {
            return t.type === 'income' ? acc + t.amount : acc - t.amount;
        }, 0);

        localStorage.setItem('currentBalance', currentBalance);

        recentTransactionList.innerHTML = '';
        loadAllTransactions();
        updateBalanceDisplay();

        alert(`✅ Imported ${transactions.length} transactions!`);
        csvFile.value = '';

    } catch (error) {
        console.error('Error:', error);
        alert('❌ Error: ' + error.message);
        csvFile.value = '';
    }
});

// to do - also now if i am deleting a expense transaction it updating available and current balance that needs to be fixed