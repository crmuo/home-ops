// Global variables
let allTransactions = [];
const transactionsPerPage = 5;
let currentPage = 1;

// Function to load transactions from the JSON file
async function loadTransactions() {
  try {
    const response = await fetch('/transactions.json');
    if (!response.ok) {
      throw new Error('Failed to load transaction data');
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
      document.getElementById('current-balance').innerHTML =
        `<span style="color: red">No transaction data available</span>`;
    }
  } catch (error) {
    console.error('Error loading transactions:', error);
    document.getElementById('current-balance').innerHTML =
      `<span style="color: red">Error loading data</span>`;
  }
}

// Update current balance display
function updateCurrentBalance(balance) {
  const formattedBalance = parseFloat(balance).toFixed(2);
  const dollars = Math.floor(formattedBalance);
  const cents = formattedBalance.toString().split('.')[1];

  document.getElementById('current-balance').innerHTML =
    `$${dollars}<span class="cents">.${cents}</span>`;
}

// Display transactions for current page
function displayTransactions() {
  const transactionList = document.getElementById('transaction-list');
  transactionList.innerHTML = '';

  const startIndex = (currentPage - 1) * transactionsPerPage;
  const endIndex = Math.min(startIndex + transactionsPerPage, allTransactions.length);
  const pageTransactions = allTransactions.slice(startIndex, endIndex);

  pageTransactions.forEach(transaction => {
    const row = document.createElement('tr');

    // Format date
    const date = new Date(transaction.date);
    const formattedDate = date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    // Format amount
    const amount = parseFloat(transaction.amount).toFixed(2);
    const amountClass = transaction.amount >= 0 ? 'amount-positive' : 'amount-negative';
    const amountPrefix = transaction.amount >= 0 ? '+' : '';

    // Format balance
    const balance = parseFloat(transaction.balance).toFixed(2);

    row.innerHTML = `
      <td>${formattedDate}</td>
      <td>${transaction.description}</td>
      <td class="${amountClass}">${amountPrefix}$${Math.abs(amount)}</td>
      <td>$${balance}</td>
    `;

    transactionList.appendChild(row);
  });

  // Update pagination
  updatePagination();
}

// Update pagination controls
function updatePagination() {
  const paginationContainer = document.getElementById('pagination');
  const totalPages = Math.ceil(allTransactions.length / transactionsPerPage);

  paginationContainer.innerHTML = '';

  // Previous button
  const prevButton = document.createElement('button');
  prevButton.textContent = '←';
  prevButton.disabled = currentPage === 1;
  prevButton.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      displayTransactions();
    }
  });
  paginationContainer.appendChild(prevButton);

  // Next button
  const nextButton = document.createElement('button');
  nextButton.textContent = '→';
  nextButton.disabled = currentPage === totalPages;
  nextButton.addEventListener('click', () => {
    if (currentPage < totalPages) {
      currentPage++;
      displayTransactions();
    }
  });
  paginationContainer.appendChild(nextButton);

  // Pagination info
  const paginationInfo = document.getElementById('pagination-info');
  paginationInfo.textContent = `Page ${currentPage} of ${totalPages}`;
}

// Toggle transaction history visibility
function setupHistoryToggle() {
  const toggleButton = document.getElementById('toggle-history');
  const historySection = document.getElementById('history-section');

  toggleButton.addEventListener('click', () => {
    const isVisible = historySection.style.display === 'block';
    historySection.style.display = isVisible ? 'none' : 'block';
    toggleButton.textContent = isVisible ? 'View transaction history' : 'Hide transaction history';
  });
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
  loadTransactions();
  setupHistoryToggle();

  // Refresh data every 30 seconds
  setInterval(loadTransactions, 30000);
});
