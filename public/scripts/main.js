// ДИПОНИКА Main Page Script

// Popular components data
const popularComponents = [
  { id: "LM317T", category: "Power Circuits", icon: "chip" },
  { id: "FT232RL-REEL", category: "Microcontrollers", icon: "chip" },
  { id: "BSS138", category: "Transistors", icon: "transistor" },
  { id: "ATMEGA328P-PU", category: "Microcontrollers", icon: "chip" },
  { id: "NE555P", category: "Power Circuits", icon: "chip" },
  { id: "STM32F103C8T6", category: "Microcontrollers", icon: "chip" },
  { id: "BC547", category: "Transistors", icon: "transistor" },
  { id: "1N4148", category: "Diodes", icon: "diode" },
  { id: "ESP8266", category: "Microcontrollers", icon: "chip" },
  { id: "Arduino Nano", category: "Dev Boards", icon: "chip" },
  { id: "AMS1117-3.3", category: "Power Circuits", icon: "chip" },
  { id: "2N2222", category: "Transistors", icon: "transistor" },
  { id: "ESP32-WROOM-32", category: "Microcontrollers", icon: "chip" },
  { id: "LM358", category: "Power Circuits", icon: "chip" },
  { id: "IRFZ44N", category: "Transistors", icon: "transistor" },
  { id: "ATtiny85", category: "Microcontrollers", icon: "chip" },
  { id: "1N4007", category: "Diodes", icon: "diode" },
  { id: "L7805CV", category: "Power Circuits", icon: "chip" },
  { id: "SN74HC595N", category: "Logic ICs", icon: "chip" },
  { id: "TL072", category: "Power Circuits", icon: "chip" },
  { id: "STM32F407VGT6", category: "Microcontrollers", icon: "chip" },
  { id: "74HC595", category: "Logic ICs", icon: "chip" },
  { id: "CD4017BE", category: "Logic ICs", icon: "chip" },
  { id: "LM393", category: "Power Circuits", icon: "chip" },
  { id: "MOC3021", category: "Optocouplers", icon: "chip" },
  { id: "L293D", category: "Motor Drivers", icon: "chip" },
  { id: "ULN2003A", category: "Darlington Arrays", icon: "chip" },
  { id: "DS18B20", category: "Sensors", icon: "chip" },
  { id: "DHT22", category: "Sensors", icon: "chip" },
  { id: "MPU6050", category: "Sensors", icon: "chip" }
];

// Icon SVGs
const icons = {
  chip: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <rect x="7" y="7" width="10" height="10" rx="1" stroke-width="1.5"/>
    <path stroke-linecap="round" stroke-width="1.5" d="M9 2v3m6 0V2m0 17v3M9 22v-3M2 9h3m0 6H2m17-6h3m0 6h-3"/>
    <circle cx="12" cy="12" r="2" stroke-width="1.5"/>
  </svg>`,
  resistor: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <rect x="5" y="9" width="14" height="6" rx="1" stroke-width="1.5"/>
    <path stroke-linecap="round" stroke-width="1.5" d="M2 12h3m14 0h3"/>
    <path stroke-width="1.5" d="M9 9v6m3-6v6m3-6v6"/>
  </svg>`,
  capacitor: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path stroke-linecap="round" stroke-width="2" d="M10 5v14M14 5v14M2 12h8m4 0h8"/>
  </svg>`,
  transistor: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <circle cx="12" cy="12" r="8" stroke-width="1.5"/>
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 4v5m0 10v-5m0-5l4 6m-4-6L8 16"/>
  </svg>`,
  diode: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M2 12h6m8 0h6M8 12l6-6v12l-6-6z"/>
    <path stroke-width="1.5" d="M14 6v12"/>
  </svg>`
};

// Render components grid
function renderComponents() {
  const grid = document.getElementById('componentsGrid');
  if (!grid) return;
  
  grid.innerHTML = popularComponents.map(component => `
    <a href="/search.html?q=${encodeURIComponent(component.id)}" class="component-card">
      <div class="component-icon">
        ${icons[component.icon] || icons.chip}
      </div>
      <div class="component-id">${component.id}</div>
      <div class="component-category">${component.category}</div>
    </a>
  `).join('');
}

// Handle search
function handleSearch(event) {
  event.preventDefault();
  const input = document.getElementById('searchInput');
  const query = input.value.trim();
  
  if (query) {
    window.location.href = `/search.html?q=${encodeURIComponent(query)}`;
  }
}

// Dark mode toggle
function initTheme() {
  const toggle = document.getElementById('theme-toggle');
  const sunIcon = document.getElementById('sun-icon');
  const moonIcon = document.getElementById('moon-icon');
  const html = document.documentElement;
  
  // Check saved theme or default to light
  const savedTheme = localStorage.getItem('theme') || 'light';
  
  if (savedTheme === 'dark') {
    html.classList.add('dark');
    sunIcon.style.display = 'none';
    moonIcon.style.display = 'block';
  }
  
  toggle.addEventListener('click', () => {
    const isDark = html.classList.toggle('dark');
    
    if (isDark) {
      sunIcon.style.display = 'none';
      moonIcon.style.display = 'block';
      localStorage.setItem('theme', 'dark');
    } else {
      sunIcon.style.display = 'block';
      moonIcon.style.display = 'none';
      localStorage.setItem('theme', 'light');
    }
  });
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  renderComponents();
});
