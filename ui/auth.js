// Tab switcher logic
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const targetTab = btn.dataset.tab;
    
    // Update active tab button
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    // Update active tab content
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    document.getElementById(`${targetTab}-tab`).classList.add('active');
    
    // Clear message
    hideMessage();
  });
});

// Message display helpers
function showMessage(text, type = 'error') {
  const messageEl = document.getElementById('message');
  messageEl.textContent = text;
  messageEl.className = `message ${type}`;
}

function hideMessage() {
  const messageEl = document.getElementById('message');
  messageEl.className = 'message';
  messageEl.textContent = '';
}

// Login form handler
document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  hideMessage();
  
  const submitBtn = e.target.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Вход...';
  
  const formData = new FormData(e.target);
  const payload = {
    email: formData.get('email'),
    password: formData.get('password')
  };
  
  const response = await fetch('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  
  if (response.ok) {
    const data = await response.json();
    showMessage('Вход выполнен успешно! Перенаправление...', 'success');
    setTimeout(() => {
      window.location.href = '/ui/my-orders.html';
    }, 1000);
    return;
  }
  
  // Error handling
  submitBtn.disabled = false;
  submitBtn.textContent = 'Войти';
  
  if (response.status === 401) {
    showMessage('Неверный email или пароль');
    return;
  }
  
  if (response.status === 429) {
    showMessage('Слишком много попыток входа. Попробуйте позже.');
    return;
  }
  
  if (response.status === 400) {
    const data = await response.json();
    showMessage(data.error || 'Некорректные данные');
    return;
  }
  
  showMessage('Ошибка сервера. Попробуйте позже.');
});

// Register form handler
document.getElementById('register-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  hideMessage();
  
  const submitBtn = e.target.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Регистрация...';
  
  const formData = new FormData(e.target);
  const payload = {
    email: formData.get('email'),
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
    name: formData.get('name') || undefined
  };
  
  // Client-side validation
  if (payload.password !== payload.confirmPassword) {
    showMessage('Пароли не совпадают');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Зарегистрироваться';
    return;
  }
  
  if (payload.password.length < 8) {
    showMessage('Пароль должен содержать минимум 8 символов');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Зарегистрироваться';
    return;
  }
  
  const response = await fetch('/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  
  if (response.ok) {
    const data = await response.json();
    showMessage('Регистрация успешна! Перенаправление...', 'success');
    setTimeout(() => {
      window.location.href = '/ui/my-orders.html';
    }, 1000);
    return;
  }
  
  // Error handling
  submitBtn.disabled = false;
  submitBtn.textContent = 'Зарегистрироваться';
  
  if (response.status === 409) {
    showMessage('Пользователь с таким email уже существует');
    return;
  }
  
  if (response.status === 429) {
    showMessage('Слишком много попыток регистрации. Попробуйте позже.');
    return;
  }
  
  if (response.status === 400) {
    const data = await response.json();
    showMessage(data.error || 'Некорректные данные');
    return;
  }
  
  showMessage('Ошибка сервера. Попробуйте позже.');
});
