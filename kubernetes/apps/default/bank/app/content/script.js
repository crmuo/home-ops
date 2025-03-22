// Global variables
let allTransactions = [];
const transactionsPerPage = 100;
let currentPage = 1;
let isMobileView = window.innerWidth <= 600;

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

// Update current balance display
function updateCurrentBalance(balance) {
  const { dollars, cents } = formatCurrency(balance);
  document.getElementById(
    "current-balance"
  ).innerHTML = `$${dollars}<span class="cents">.${cents}</span>`;
}

// Format date for display
function formatDate(dateString, compact = false) {
  const date = new Date(dateString);

  if (compact) {
    // Shorter format for mobile
    const dateStr = date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    const timeStr = date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    return `${dateStr}<br>${timeStr}`;
  }

  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Display transactions for current page
function displayTransactions() {
  const transactionList = document.getElementById("transaction-list");
  transactionList.innerHTML = "";

  const startIndex = (currentPage - 1) * transactionsPerPage;
  const endIndex = Math.min(
    startIndex + transactionsPerPage,
    allTransactions.length
  );
  const pageTransactions = allTransactions.slice(startIndex, endIndex);

  pageTransactions.forEach((transaction, index) => {
    // Format date
    const formattedDate = formatDate(transaction.date);
    const compactDate = formatDate(transaction.date, true);

    // Format amount
    const amount = parseFloat(transaction.amount);
    const amountClass = amount >= 0 ? "amount-positive" : "amount-negative";
    const { dollars: amountDollars, cents: amountCents } = formatCurrency(
      Math.abs(amount)
    );
    const amountPrefix = amount < 0 ? "-" : "";

    // Format balance
    const { dollars: balanceDollars, cents: balanceCents } = formatCurrency(
      transaction.balance
    );

    // Create transaction pair container for mobile view
    if (isMobileView) {
      // Main row
      const row = document.createElement("tr");
      if (index === 0 && currentPage === 1) {
        row.classList.add("latest-transaction");
      }
      row.classList.add("transaction-pair");

      row.innerHTML = `
        <td class="date-compact">${compactDate}</td>
        <td>${transaction.description}</td>
        <td class="${amountClass}">${amountPrefix}$${amountDollars}<span class="cents">.${amountCents}</span></td>
        <td>$${balanceDollars}<span class="cents">.${balanceCents}</span></td>
      `;

      transactionList.appendChild(row);

      // Description row for mobile view
      const descRow = document.createElement("tr");
      descRow.classList.add("description-row");
      descRow.classList.add("transaction-pair");
      descRow.innerHTML = `
        <td colspan="3" class="description-cell">${transaction.description}</td>
      `;
      transactionList.appendChild(descRow);
    } else {
      // Desktop view - single row
      const row = document.createElement("tr");
      if (index === 0 && currentPage === 1) {
        row.classList.add("latest-transaction");
      }

      row.innerHTML = `
        <td>${formattedDate}</td>
        <td>${transaction.description}</td>
        <td class="${amountClass}">${amountPrefix}$${amountDollars}<span class="cents">.${amountCents}</span></td>
        <td>$${balanceDollars}<span class="cents">.${balanceCents}</span></td>
      `;

      transactionList.appendChild(row);
    }
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
      ? '<span class="toggle-icon">▼</span> Transaction history'
      : '<span class="toggle-icon">▲</span> Transaction history';
  });
}

// Handle window resize events
function handleResize() {
  const wasAlreadyMobile = isMobileView;
  isMobileView = window.innerWidth <= 600;

  // Only redraw if we're crossing the mobile/desktop boundary
  if (wasAlreadyMobile !== isMobileView) {
    displayTransactions();
  }
}

// Initialize the app
document.addEventListener("DOMContentLoaded", () => {
  loadTransactions();
  setupHistoryToggle();

  // Set initial toggle button state
  document.getElementById("toggle-history").innerHTML =
    '<span class="toggle-icon">▼</span> Transaction history';

  // Handle window resize
  window.addEventListener("resize", handleResize);
  handleResize();

  // Refresh data every 30 seconds
  setInterval(loadTransactions, 30000);
});
