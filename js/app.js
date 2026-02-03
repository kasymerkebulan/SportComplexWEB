const API_BASE = window.location.origin;

const defaultButtons = document.querySelectorAll('button[data-action="alert"]');

defaultButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const label = button.textContent.trim();
    alert(`Действие: ${label}. Подключите обработчик к API.`);
  });
});

const visitorForm = document.querySelector('[data-visitor-form]');
const visitorTableBody = document.querySelector('[data-visitor-table-body]');
const visitorStatus = document.querySelector('[data-visitor-status]');

async function loadVisitors() {
  if (!visitorTableBody) {
    return;
  }

  visitorStatus.textContent = 'Загрузка списка посетителей...';

  try {
    const response = await fetch(`${API_BASE}/api/visitors`);
    if (!response.ok) {
      throw new Error('Не удалось загрузить список посетителей');
    }

    const visitors = await response.json();
    visitorTableBody.innerHTML = '';

    visitors.forEach((visitor) => {
      const row = document.createElement('div');
      row.className = 'table-row';
      row.innerHTML = `
        <span>${visitor.FirstName} ${visitor.LastName}</span>
        <span>${visitor.Phone || '—'}</span>
        <span>${visitor.Email || '—'}</span>
        <span>${visitor.RegistrationDate ? new Date(visitor.RegistrationDate).toLocaleDateString('ru-RU') : '—'}</span>
      `;
      visitorTableBody.appendChild(row);
    });

    visitorStatus.textContent = visitors.length ? `Всего посетителей: ${visitors.length}` : 'Посетителей пока нет.';
  } catch (error) {
    visitorStatus.textContent = error.message;
  }
}

if (visitorForm) {
  visitorForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    visitorStatus.textContent = 'Добавляем посетителя...';

    const formData = new FormData(visitorForm);
    const payload = {
      firstName: formData.get('firstName'),
      lastName: formData.get('lastName'),
      birthDate: formData.get('birthDate') || null,
      phone: formData.get('phone') || null,
      email: formData.get('email') || null
    };

    try {
      const response = await fetch(`${API_BASE}/api/visitors`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorBody = await response.json();
        throw new Error(errorBody.message || 'Ошибка добавления посетителя');
      }

      visitorForm.reset();
      await loadVisitors();
    } catch (error) {
      visitorStatus.textContent = error.message;
    }
  });
}

loadVisitors();
