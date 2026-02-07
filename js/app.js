const API_BASE = window.location.origin;

const visitorForm = document.querySelector('[data-visitor-form]');
const visitorTableBody = document.querySelector('[data-visitor-table-body]');
const visitorStatus = document.querySelector('[data-visitor-status]');
const reportButton = document.querySelector('[data-action="download-report"]');
const maintenanceButton = document.querySelector('[data-action="maintenance"]');
const eventForm = document.querySelector('[data-event-form]');
const enrollmentForm = document.querySelector('[data-enrollment-form]');
const eventStatus = document.querySelector('[data-event-status]');
const enrollmentStatus = document.querySelector('[data-enrollment-status]');
const complexList = document.querySelector('[data-complex-list]');
const complexStatus = document.querySelector('[data-complex-status]');
const modalTriggers = document.querySelectorAll('[data-modal-target]');
const modalClosers = document.querySelectorAll('[data-modal-close]');

const modalById = (id) => document.getElementById(id);

function openModal(modalId) {
  const modal = modalById(modalId);
  if (!modal) {
    return;
  }
  modal.classList.add('is-open');
  modal.setAttribute('aria-hidden', 'false');
}

function closeModal(modal) {
  modal.classList.remove('is-open');
  modal.setAttribute('aria-hidden', 'true');
}

modalTriggers.forEach((trigger) => {
  trigger.addEventListener('click', () => {
    const modalId = trigger.dataset.modalTarget;

    if (modalId === 'enrollmentModal') {
      const sectionName = trigger.dataset.sectionName || '';
      const complexId = trigger.dataset.complexId || '';
      if (enrollmentForm) {
        enrollmentForm.sectionName.value = sectionName;
      }
      if (complexId) {
        const select = document.querySelector('#enrollmentModal [data-complex-select]');
        if (select) {
          select.value = complexId;
        }
      }
    }

    if (modalId === 'complexModal') {
      loadComplexes();
    }

    openModal(modalId);
  });
});

modalClosers.forEach((closer) => {
  closer.addEventListener('click', () => {
    const modal = closer.closest('.modal');
    if (modal) {
      closeModal(modal);
    }
  });
});

window.addEventListener('click', (event) => {
  if (event.target.classList.contains('modal')) {
    closeModal(event.target);
  }
});

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

async function loadComplexes() {
  const selects = document.querySelectorAll('[data-complex-select]');
  if (!selects.length && !complexList) {
    return;
  }

  if (complexStatus) {
    complexStatus.textContent = 'Загрузка комплексов...';
  }

  try {
    const response = await fetch(`${API_BASE}/api/complexes`);
    if (!response.ok) {
      throw new Error('Не удалось загрузить комплексы');
    }

    const complexes = await response.json();

    selects.forEach((select) => {
      select.innerHTML = '';
      complexes.forEach((complex) => {
        const option = document.createElement('option');
        option.value = complex.ComplexID;
        option.textContent = `${complex.ComplexName}${complex.Address ? ` — ${complex.Address}` : ''}`;
        select.appendChild(option);
      });
    });

    if (complexList) {
      complexList.innerHTML = '';
      complexes.forEach((complex) => {
        const item = document.createElement('li');
        item.innerHTML = `<strong>${complex.ComplexName}</strong><span class="muted">${complex.Address || ''}</span>`;
        complexList.appendChild(item);
      });
    }

    if (complexStatus) {
      complexStatus.textContent = complexes.length ? `Всего комплексов: ${complexes.length}` : 'Комплексов не найдено.';
    }
  } catch (error) {
    if (complexStatus) {
      complexStatus.textContent = error.message;
    }
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

if (eventForm) {
  eventForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    eventStatus.textContent = 'Создаем событие...';

    const formData = new FormData(eventForm);
    const payload = {
      eventName: formData.get('eventName'),
      complexId: Number(formData.get('complexId')),
      eventDate: formData.get('eventDate'),
      startTime: formData.get('startTime') || null,
      endTime: formData.get('endTime') || null,
      description: formData.get('description') || null,
      eventType: formData.get('eventType') || null,
      maxParticipants: formData.get('maxParticipants') ? Number(formData.get('maxParticipants')) : null
    };

    try {
      const response = await fetch(`${API_BASE}/api/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorBody = await response.json();
        throw new Error(errorBody.message || 'Ошибка создания события');
      }

      eventForm.reset();
      eventStatus.textContent = 'Событие создано.';
    } catch (error) {
      eventStatus.textContent = error.message;
    }
  });
}

if (enrollmentForm) {
  enrollmentForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    enrollmentStatus.textContent = 'Публикуем набор...';

    const formData = new FormData(enrollmentForm);
    const sectionName = formData.get('sectionName');
    const payload = {
      eventName: `Набор в секцию: ${sectionName}`,
      complexId: Number(formData.get('complexId')),
      eventDate: formData.get('eventDate'),
      startTime: formData.get('startTime') || null,
      description: `Открыт набор в секцию ${sectionName}.`,
      eventType: 'Набор',
      maxParticipants: formData.get('maxParticipants') ? Number(formData.get('maxParticipants')) : null
    };

    try {
      const response = await fetch(`${API_BASE}/api/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorBody = await response.json();
        throw new Error(errorBody.message || 'Ошибка публикации набора');
      }

      enrollmentForm.reset();
      enrollmentStatus.textContent = 'Набор опубликован.';
    } catch (error) {
      enrollmentStatus.textContent = error.message;
    }
  });
}

if (reportButton) {
  reportButton.addEventListener('click', () => {
    window.location.href = `${API_BASE}/api/reports/overview`;
  });
}

if (maintenanceButton) {
  maintenanceButton.addEventListener('click', async () => {
    const equipmentId = maintenanceButton.dataset.equipmentId;
    const status = maintenanceButton.dataset.status;

    try {
      const response = await fetch(`${API_BASE}/api/equipment/${equipmentId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      });

      if (!response.ok) {
        const errorBody = await response.json();
        throw new Error(errorBody.message || 'Ошибка обновления статуса');
      }

      maintenanceButton.textContent = 'Обслуживание запланировано';
      maintenanceButton.disabled = true;
    } catch (error) {
      alert(error.message);
    }
  });
}

loadVisitors();
loadComplexes();
