// Global variables
let allTransactions = [];
const transactionsPerPage = 20;
let currentPage = 1;

// Function to load transactions from the JSON file
async function loadTransactions() {
  try {
    const response = await fetch("/transactions.json");
    if (!response.ok) {
      throw new Error("Failed to load transaction data");
    }
    const data = await response.json();
    allTransactions = data.transactions || [];

    if (allTransactions.length > 0) {
      // Get most recent transaction for current balance
      const latestTransaction = allTransactions[0];
      updateCurrentBalance(latestTransaction.balance);

      // Display transactions
      displayTransactions();
    } else {
      document.getElementById(
        "current-balance"
      ).innerHTML = `<span style="color: red">No transaction data available</span>`;
    }
  } catch (error) {
    console.error("Error loading transactions:", error);
    document.getElementById(
      "current-balance"
    ).innerHTML = `<span style="color: red">Error loading data</span>`;
  }
}

// Format number to dollars and cents
function formatCurrency(amount) {
  const formattedAmount = parseFloat(amount).toFixed(2);
  const parts = formattedAmount.toString().split(".");
  const dollars = parts[0];
  const cents = parts.length > 1 ? parts[1] : "00";

  return { dollars, cents };
}

// Get currency HTML
function getCurrencyHTML(amount) {
  const isNegative = amount < 0;
  const { dollars, cents } = formatCurrency(Math.abs(amount));
  const prefix = isNegative ? "-" : "";

  return `${prefix}$${dollars}<span class="cents">.${cents}</span>`;
}

// Update current balance display
function updateCurrentBalance(balance) {
  document.getElementById("current-balance").innerHTML =
    getCurrencyHTML(balance);
}

// Format date for display
function formatDate(dateString, includeTime = true) {
  const date = new Date(dateString);

  const dateStr = date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  if (!includeTime) return dateStr;

  const timeStr = date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  return `${dateStr} ${timeStr}`;
}

// Display transactions for current page
function displayTransactions() {
  // Get both container elements
  const tableContainer = document.getElementById("transaction-table-body");
  const cardsContainer = document.getElementById("transaction-cards");

  // Clear both containers
  tableContainer.innerHTML = "";
  cardsContainer.innerHTML = "";

  const startIndex = (currentPage - 1) * transactionsPerPage;
  const endIndex = Math.min(
    startIndex + transactionsPerPage,
    allTransactions.length
  );
  const pageTransactions = allTransactions.slice(startIndex, endIndex);

  pageTransactions.forEach((transaction, index) => {
    const amount = parseFloat(transaction.amount);
    const amountClass = amount < 0 ? "amount-negative" : "amount-positive";
    const isLatest = index === 0 && currentPage === 1;

    // Create table row for desktop view
    const row = document.createElement("tr");
    if (isLatest) row.classList.add("latest-transaction");

    row.innerHTML = `
      <td class="date-cell">${formatDate(transaction.date)}</td>
      <td class="desc-cell">${transaction.description}</td>
      <td class="amount-cell ${amountClass}">${getCurrencyHTML(amount)}</td>
      <td class="balance-cell">${getCurrencyHTML(transaction.balance)}</td>
    `;

    tableContainer.appendChild(row);

    // Create card for mobile view with improved layout
    const card = document.createElement("div");
    card.className = "transaction-card";
    if (isLatest) card.classList.add("latest-transaction");

    card.innerHTML = `
      <div class="transaction-card-content">
        <div class="transaction-date">${formatDate(transaction.date)}</div>

        <div class="transaction-amounts">
          <div class="transaction-amount-wrapper">
            <span class="label">Amount:</span>
            <span class="transaction-amount ${amountClass}">${getCurrencyHTML(
      amount
    )}</span>
          </div>

          <div class="transaction-balance-wrapper">
            <span class="label">Balance:</span>
            <span class="transaction-balance">${getCurrencyHTML(
              transaction.balance
            )}</span>
          </div>
        </div>

        <div class="transaction-description">${transaction.description}</div>
      </div>
    `;

    cardsContainer.appendChild(card);
  });

  // Update pagination
  updatePagination();
}

// Update pagination controls
function updatePagination() {
  const paginationContainer = document.getElementById("pagination");
  const paginationInfo = document.getElementById("pagination-info");
  const totalPages = Math.ceil(allTransactions.length / transactionsPerPage);

  // Hide pagination elements if there's only one page or less
  if (totalPages <= 1) {
    paginationContainer.style.display = "none";
    paginationInfo.style.display = "none";
    return;
  } else {
    paginationContainer.style.display = "flex";
    paginationInfo.style.display = "block";
  }

  paginationContainer.innerHTML = "";

  // Previous button
  const prevButton = document.createElement("button");
  prevButton.textContent = "←";
  prevButton.disabled = currentPage === 1;
  prevButton.addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage--;
      displayTransactions();
    }
  });
  paginationContainer.appendChild(prevButton);

  // Next button
  const nextButton = document.createElement("button");
  nextButton.textContent = "→";
  nextButton.disabled = currentPage === totalPages;
  nextButton.addEventListener("click", () => {
    if (currentPage < totalPages) {
      currentPage++;
      displayTransactions();
    }
  });
  paginationContainer.appendChild(nextButton);

  // Pagination info
  paginationInfo.textContent = `Page ${currentPage} of ${totalPages}`;
}

// Toggle transaction history visibility
function setupHistoryToggle() {
  const toggleButton = document.getElementById("toggle-history");
  const historySection = document.getElementById("history-section");

  toggleButton.addEventListener("click", () => {
    const isVisible = historySection.style.display === "block";
    historySection.style.display = isVisible ? "none" : "block";

    // Update toggle button with appropriate icon and text
    toggleButton.innerHTML = isVisible
      ? '<span class="toggle-icon">▼</span> More'
      : '<span class="toggle-icon">▲</span> Less';
  });
}

// Initialize the app
document.addEventListener("DOMContentLoaded", () => {
  loadTransactions();
  setupHistoryToggle();

  // Set initial toggle button state
  document.getElementById("toggle-history").innerHTML =
    '<span class="toggle-icon">▼</span> More';
});
