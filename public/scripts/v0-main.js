// ДИПОНИКА v0.dev Main Script

// Component data from original design
const components = [
  { id: "LM317T", category: "Power Circuits", icon: "chip" },
  { id: "M83513/19-E01NW", category: "Connectors", icon: "connector" },
  { id: "500C122T250BA2B", category: "Capacitors", icon: "capacitor" },
  { id: "FT232RL-REEL", category: "Microcontrollers and Processors", icon: "chip" },
  { id: "BSS138", category: "Transistors", icon: "transistor" },
  { id: "CRCW06030000Z0EA", category: "Resistors", icon: "resistor" },
  { id: "1N4148", category: "Diodes", icon: "diode" },
  { id: "ULN2803A", category: "Drivers And Interfaces", icon: "chip" },
  { id: "MAX4236EUT+T", category: "Amplifier Circuits", icon: "chip" },
  { id: "96BB2-006-F", category: "Switches", icon: "switch" },
  { id: "MWDM2L-9SBSR1T-.110", category: "Connectors", icon: "connector" },
  { id: "M83513/13-B02NT", category: "Connectors", icon: "connector" },
  { id: "C4559-6", category: "Terminal Blocks", icon: "connector" },
  { id: "805-001-16M12-26PA", category: "Connectors", icon: "connector" },
  { id: "1-178140-3", category: "Connectors", icon: "connector" },
  { id: "BU931T", category: "Transistors", icon: "transistor" },
  { id: "1775690-2", category: "Connectors", icon: "connector" },
  { id: "EK-V6-ML605-G", category: "Capacitors", icon: "capacitor" },
  { id: "DS12C887+", category: "Microcontrollers and Processors", icon: "chip" },
  { id: "RS1G-13-F", category: "Diodes", icon: "diode" },
  { id: "LF353N", category: "Amplifier Circuits", icon: "chip" },
  { id: "08053C104KAT2A", category: "Capacitors", icon: "capacitor" },
  { id: "US1G-13-F", category: "Diodes", icon: "diode" },
  { id: "96BB2-006-F", category: "Switches", icon: "switch" },
  { id: "1N4148", category: "Diodes", icon: "diode" },
  { id: "2N7002", category: "Transistors", icon: "transistor" },
  { id: "GRM188R71H104KA93D", category: "Capacitors", icon: "capacitor" },
  { id: "5015", category: "Connectors", icon: "connector" },
  { id: "AT45DB321D-SU", category: "Memory", icon: "memory" },
  { id: "C0805C104K5RACTU", category: "Capacitors", icon: "capacitor" },
];

// Icon SVGs matching the original design
const icons = {
  chip: `<svg class="w-12 h-12" viewBox="0 0 64 64" fill="none" stroke="#3498DB" stroke-width="1.5">
    <rect x="20" y="20" width="24" height="24" rx="2" stroke-linecap="round" stroke-linejoin="round" />
    <line x1="28" y1="26" x2="36" y2="26" />
    <line x1="28" y1="30" x2="36" y2="30" />
    <line x1="28" y1="34" x2="36" y2="34" />
    <line x1="28" y1="38" x2="36" y2="38" />
    <line x1="20" y1="24" x2="16" y2="24" />
    <line x1="20" y1="28" x2="16" y2="28" />
    <line x1="20" y1="32" x2="16" y2="32" />
    <line x1="20" y1="36" x2="16" y2="36" />
    <line x1="20" y1="40" x2="16" y2="40" />
    <line x1="44" y1="24" x2="48" y2="24" />
    <line x1="44" y1="28" x2="48" y2="28" />
    <line x1="44" y1="32" x2="48" y2="32" />
    <line x1="44" y1="36" x2="48" y2="36" />
    <line x1="44" y1="40" x2="48" y2="40" />
  </svg>`,

  connector: `<svg class="w-12 h-12" viewBox="0 0 64 64" fill="none" stroke="#3498DB" stroke-width="1.5">
    <rect x="22" y="16" width="20" height="32" rx="2" stroke-linecap="round" stroke-linejoin="round" />
    <line x1="26" y1="22" x2="38" y2="22" />
    <line x1="26" y1="26" x2="38" y2="26" />
    <line x1="26" y1="30" x2="38" y2="30" />
    <line x1="26" y1="34" x2="38" y2="34" />
    <line x1="26" y1="38" x2="38" y2="38" />
    <line x1="26" y1="42" x2="38" y2="42" />
    <circle cx="28" cy="22" r="1" fill="#3498DB" />
    <circle cx="36" cy="22" r="1" fill="#3498DB" />
    <circle cx="28" cy="26" r="1" fill="#3498DB" />
    <circle cx="36" cy="26" r="1" fill="#3498DB" />
  </svg>`,

  capacitor: `<svg class="w-12 h-12" viewBox="0 0 64 64" fill="none" stroke="#3498DB" stroke-width="1.5">
    <ellipse cx="32" cy="24" rx="8" ry="4" />
    <line x1="24" y1="24" x2="24" y2="40" />
    <line x1="40" y1="24" x2="40" y2="40" />
    <ellipse cx="32" cy="40" rx="8" ry="4" />
    <line x1="32" y1="16" x2="32" y2="20" />
    <line x1="32" y1="44" x2="32" y2="48" />
    <line x1="28" y1="28" x2="36" y2="28" stroke-width="0.5" />
    <line x1="28" y1="36" x2="36" y2="36" stroke-width="0.5" />
  </svg>`,

  resistor: `<svg class="w-12 h-12" viewBox="0 0 64 64" fill="none" stroke="#3498DB" stroke-width="1.5">
    <rect x="20" y="28" width="24" height="8" rx="1" stroke-linecap="round" stroke-linejoin="round" />
    <line x1="12" y1="32" x2="20" y2="32" />
    <line x1="44" y1="32" x2="52" y2="32" />
    <line x1="26" y1="28" x2="26" y2="36" stroke="#E74C3C" stroke-width="2" />
    <line x1="32" y1="28" x2="32" y2="36" stroke="#F39C12" stroke-width="2" />
    <line x1="38" y1="28" x2="38" y2="36" stroke="#27AE60" stroke-width="2" />
  </svg>`,

  transistor: `<svg class="w-12 h-12" viewBox="0 0 64 64" fill="none" stroke="#3498DB" stroke-width="1.5">
    <circle cx="32" cy="32" r="10" stroke-linecap="round" stroke-linejoin="round" />
    <line x1="32" y1="16" x2="32" y2="22" />
    <line x1="32" y1="42" x2="32" y2="48" />
    <line x1="38" y1="28" x2="44" y2="22" />
    <line x1="38" y1="36" x2="44" y2="42" />
    <line x1="26" y1="32" x2="32" y2="32" />
    <path d="M32 28 L36 32 L32 36" fill="none" stroke-linecap="round" stroke-linejoin="round" />
  </svg>`,

  diode: `<svg class="w-12 h-12" viewBox="0 0 64 64" fill="none" stroke="#3498DB" stroke-width="1.5">
    <rect x="22" y="28" width="20" height="8" rx="1" stroke-linecap="round" stroke-linejoin="round" />
    <line x1="12" y1="32" x2="22" y2="32" />
    <line x1="42" y1="32" x2="52" y2="32" />
    <line x1="38" y1="28" x2="38" y2="36" stroke-width="2" />
    <path d="M28 28 L28 36 L34 32 Z" fill="#3498DB" stroke="none" />
  </svg>`,

  switch: `<svg class="w-12 h-12" viewBox="0 0 64 64" fill="none" stroke="#3498DB" stroke-width="1.5">
    <rect x="16" y="26" width="32" height="12" rx="2" stroke-linecap="round" stroke-linejoin="round" />
    <rect x="20" y="28" width="8" height="8" rx="1" fill="#3498DB" fill-opacity="0.2" />
    <circle cx="40" cy="32" r="2" fill="none" />
    <line x1="12" y1="32" x2="16" y2="32" />
    <line x1="48" y1="32" x2="52" y2="32" />
  </svg>`,

  memory: `<svg class="w-12 h-12" viewBox="0 0 64 64" fill="none" stroke="#3498DB" stroke-width="1.5">
    <rect x="18" y="18" width="28" height="28" rx="2" stroke-linecap="round" stroke-linejoin="round" />
    <line x1="26" y1="18" x2="26" y2="46" stroke-width="0.5" />
    <line x1="32" y1="18" x2="32" y2="46" stroke-width="0.5" />
    <line x1="38" y1="18" x2="38" y2="46" stroke-width="0.5" />
    <line x1="18" y1="26" x2="46" y2="26" stroke-width="0.5" />
    <line x1="18" y1="32" x2="46" y2="32" stroke-width="0.5" />
    <line x1="18" y1="38" x2="46" y2="38" stroke-width="0.5" />
    <line x1="18" y1="22" x2="14" y2="22" />
    <line x1="18" y1="28" x2="14" y2="28" />
    <line x1="18" y1="34" x2="14" y2="34" />
    <line x1="18" y1="40" x2="14" y2="40" />
    <line x1="46" y1="22" x2="50" y2="22" />
    <line x1="46" y1="28" x2="50" y2="28" />
    <line x1="46" y1="34" x2="50" y2="34" />
    <line x1="46" y1="40" x2="50" y2="40" />
  </svg>`
};

// Render components
function renderComponents() {
  const grid = document.getElementById('componentsGrid');
  if (!grid) return;

  grid.innerHTML = components.map((component, index) => `
  <a href="/results?q=${encodeURIComponent(component.id)}"
       class="component-card"
       style="animation-delay: ${0.8 + index * 0.02}s">
      <div class="component-icon">
        ${icons[component.icon] || icons.chip}
      </div>
      <div class="component-info">
        <div class="component-id">${component.id}</div>
        <div class="component-category">Part Category: ${component.category}</div>
      </div>
    </a>
  `).join('');
}

// Handle search form
function initSearch() {
  const form = document.getElementById('searchForm');
  const input = document.getElementById('searchInput');

  if (!form || !input) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const query = input.value.trim();
    if (query) {
  window.location.href = `/results?q=${encodeURIComponent(query)}`;
    }
  });

  // Reset button functionality
  const resetBtn = form.querySelector('button[type="reset"]');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      input.value = '';
      input.focus();
    });
  }
}

// Theme toggle
function initTheme() {
  const html = document.documentElement;
  const toggle = document.getElementById('themeToggle');

  if (!toggle) return;

  // Check saved theme or detect system preference
  const savedTheme = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

  // Apply dark mode if: explicitly saved as dark, or no saved preference but system prefers dark
  const shouldBeDark = savedTheme === 'dark' || (savedTheme === null && prefersDark);

  if (shouldBeDark) {
    html.classList.add('dark');
  }

  toggle.addEventListener('click', () => {
    const isDark = html.classList.toggle('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  });

  // Listen to system theme changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    // Only apply system preference if user hasn't manually set a theme
    if (localStorage.getItem('theme') === null) {
      if (e.matches) {
        html.classList.add('dark');
      } else {
        html.classList.remove('dark');
      }
    }
  });
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initSearch();
  renderComponents();
});
