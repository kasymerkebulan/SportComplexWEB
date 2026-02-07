require('dotenv').config();
const express = require('express');
const cors = require('cors');
const sql = require('mssql');
require('msnodesqlv8');

const app = express();
const port = process.env.PORT || 3000;

const useWindowsAuth = String(process.env.DB_USE_WINDOWS_AUTH || '').toLowerCase() === 'true';

const dbConfig = useWindowsAuth
  ? {
      server: process.env.DB_SERVER,
      database: process.env.DB_NAME,
      driver: 'msnodesqlv8',
      options: {
        trustedConnection: true
      }
    }
  : {
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      server: process.env.DB_SERVER,
      database: process.env.DB_NAME,
      options: {
        encrypt: false,
        trustServerCertificate: true
      }
    };

app.use(cors());
app.use(express.json());
app.use(express.static('.'));

let poolPromise;

async function getPool() {
  if (!poolPromise) {
    poolPromise = sql.connect(dbConfig);
  }
  return poolPromise;
}

app.get('/api/visitors', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT TOP 50
        VisitorID,
        FirstName,
        LastName,
        BirthDate,
        Phone,
        Email,
        RegistrationDate
      FROM Visitors
      ORDER BY VisitorID DESC
    `);
    res.json(result.recordset);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка загрузки посетителей', error: error.message });
  }
});

app.post('/api/visitors', async (req, res) => {
  const { firstName, lastName, birthDate, phone, email } = req.body;

  if (!firstName || !lastName) {
    return res.status(400).json({ message: 'Имя и фамилия обязательны.' });
  }

  try {
    const pool = await getPool();
    const result = await pool
      .request()
      .input('firstName', sql.NVarChar(50), firstName)
      .input('lastName', sql.NVarChar(50), lastName)
      .input('birthDate', sql.Date, birthDate || null)
      .input('phone', sql.NVarChar(20), phone || null)
      .input('email', sql.NVarChar(100), email || null)
      .query(`
        INSERT INTO Visitors (FirstName, LastName, BirthDate, Phone, Email, RegistrationDate)
        OUTPUT INSERTED.VisitorID, INSERTED.FirstName, INSERTED.LastName,
               INSERTED.BirthDate, INSERTED.Phone, INSERTED.Email, INSERTED.RegistrationDate
        VALUES (@firstName, @lastName, @birthDate, @phone, @email, GETDATE())
      `);

    res.status(201).json(result.recordset[0]);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка добавления посетителя', error: error.message });
  }
});

app.get('/api/complexes', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT ComplexID, ComplexName, Address
      FROM SportComplexes
      ORDER BY ComplexName
    `);
    res.json(result.recordset);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка загрузки комплексов', error: error.message });
  }
});

app.post('/api/events', async (req, res) => {
  const { eventName, complexId, eventDate, startTime, endTime, description, eventType, maxParticipants } = req.body;

  if (!eventName || !complexId || !eventDate) {
    return res.status(400).json({ message: 'Название события, комплекс и дата обязательны.' });
  }

  try {
    const pool = await getPool();
    const result = await pool
      .request()
      .input('eventName', sql.NVarChar(200), eventName)
      .input('complexId', sql.Int, complexId)
      .input('eventDate', sql.Date, eventDate)
      .input('startTime', sql.Time, startTime || null)
      .input('endTime', sql.Time, endTime || null)
      .input('description', sql.NVarChar(1000), description || null)
      .input('eventType', sql.NVarChar(100), eventType || null)
      .input('maxParticipants', sql.Int, maxParticipants || null)
      .query(`
        INSERT INTO Events (EventName, ComplexID, EventDate, StartTime, EndTime, Description, EventType, MaxParticipants)
        OUTPUT INSERTED.EventID, INSERTED.EventName, INSERTED.EventDate
        VALUES (@eventName, @complexId, @eventDate, @startTime, @endTime, @description, @eventType, @maxParticipants)
      `);

    res.status(201).json(result.recordset[0]);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка создания события', error: error.message });
  }
});

app.patch('/api/equipment/:id/status', async (req, res) => {
  const equipmentId = Number(req.params.id);
  const { status } = req.body;

  if (!equipmentId || !status) {
    return res.status(400).json({ message: 'ID оборудования и статус обязательны.' });
  }

  try {
    const pool = await getPool();
    await pool
      .request()
      .input('equipmentId', sql.Int, equipmentId)
      .input('status', sql.NVarChar(50), status)
      .query(`
        UPDATE Equipment
        SET Status = @status
        WHERE EquipmentID = @equipmentId
      `);

    res.json({ message: 'Статус оборудования обновлен.' });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка обновления оборудования', error: error.message });
  }
});

app.get('/api/reports/overview', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT
        sc.ComplexName,
        d.DistrictName,
        COUNT(DISTINCT f.FacilityID) as TotalFacilities,
        COUNT(DISTINCT e.EmployeeID) as TotalEmployees,
        COUNT(DISTINCT t.TrainerID) as TotalTrainers,
        COUNT(DISTINCT s.SectionID) as TotalSections,
        COUNT(DISTINCT sub.VisitorID) as ActiveSubscribers,
        ISNULL(SUM(sub.Price), 0) as TotalRevenue
      FROM SportComplexes sc
      JOIN Districts d ON sc.DistrictID = d.DistrictID
      LEFT JOIN Facilities f ON sc.ComplexID = f.ComplexID
      LEFT JOIN Employees e ON sc.ComplexID = e.ComplexID
      LEFT JOIN Sections s ON f.FacilityID = s.FacilityID
      LEFT JOIN Trainers t ON s.TrainerID = t.TrainerID
      LEFT JOIN Subscriptions sub ON s.SectionID = sub.SectionID AND sub.IsActive = 1
      GROUP BY sc.ComplexID, sc.ComplexName, d.DistrictName
      ORDER BY sc.ComplexName
    `);

    const header = 'Комплекс,Район,Объекты,Сотрудники,Тренеры,Секции,Активные подписки,Доход';
    const rows = result.recordset.map((row) => (
      [
        row.ComplexName,
        row.DistrictName,
        row.TotalFacilities,
        row.TotalEmployees,
        row.TotalTrainers,
        row.TotalSections,
        row.ActiveSubscribers,
        row.TotalRevenue
      ].join(',')
    ));

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="overview-report.csv"');
    res.send([header, ...rows].join('\n'));
  } catch (error) {
    res.status(500).json({ message: 'Ошибка формирования отчета', error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
