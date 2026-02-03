require('dotenv').config();
const express = require('express');
const cors = require('cors');
const sql = require('mssql');

const app = express();
const port = process.env.PORT || 3000;

const dbConfig = {
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

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
