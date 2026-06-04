// public/js/bq_search.js
// Filter pencarian AHS di BQ modal — versi web (tidak pakai module.exports)

function initializeAHSSearch() {
  const searchInput = document.getElementById('ahsSearchInput');
  if (!searchInput) return;
  searchInput.addEventListener('input', function(e) {
    filterAHSList(e.target.value.toLowerCase().trim());
  });
}

function filterAHSList(searchTerm) {
  const ahsItems = document.querySelectorAll('.ahs-item');
  ahsItems.forEach((item) => {
    const kodeAHS = item.querySelector('strong')?.textContent.toLowerCase() || '';
    const namaAHS = item.querySelector('div:nth-child(2)')?.textContent.toLowerCase() || '';
    item.style.display = (kodeAHS.includes(searchTerm) || namaAHS.includes(searchTerm)) ? 'block' : 'none';
  });
}

function clearAHSSearch() {
  const searchInput = document.getElementById('ahsSearchInput');
  if (searchInput) { searchInput.value = ''; filterAHSList(''); }
}

// Pasang listener setelah DOM siap
document.addEventListener('DOMContentLoaded', initializeAHSSearch);
