const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const app = express();
const port = 3000;

// Middleware to parse JSON bodies
app.use(express.json());

// Connect to SQLite database
const db = new sqlite3.Database('./todos.db', (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database.');

    // Create the todos table if it doesn't exist
    db.run(`
      CREATE TABLE IF NOT EXISTS todos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task TEXT NOT NULL,
        completed BOOLEAN NOT NULL DEFAULT 0,
        priority TEXT NOT NULL DEFAULT 'medium'
      )
    `);
  }
});

// GET /todos - Retrieve all to-do items, with optional filtering by completed status
app.get('/todos', (req, res) => {
  const completedParam = req.query.completed;
  let query = "SELECT * FROM todos";
  let params = [];

  if (completedParam !== undefined) {
    query += " WHERE completed = ?";
    params.push(completedParam === 'true' ? 1 : 0);
  }

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    } else {
      // Transform completed field
    const todos = rows.map(todo => {
      const transformedTodo = {
        ...todo,
        // Convert 0/1 to false/true
        completed: Boolean(todo.completed), 
      };
      return transformedTodo;
    });
      res.json(rows);
    }
  });
});

// POST /todos - Add a new to-do item with priority
app.post('/todos', (req, res) => {
  const { task, priority = 'medium' } = req.body;
  const query = "INSERT INTO todos (task, completed, priority) VALUES (?, 0, ?)";

  db.run(query, [task, priority], function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.status(201).json({ id: this.lastID, task, completed: false, priority });
  });
});

// PUT /todos/complete-all - Mark all to-do items as completed
app.put('/todos/complete-all', (req, res) => {
  const query = "UPDATE todos SET completed = 1";

  db.run(query, [], function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ message: "All to-do items marked as completed" });
  });
});

// PUT /todos/:id - Update an existing to-do item
app.put('/todos/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const { task, completed, priority } = req.body;
  const query = `
    UPDATE todos
    SET task = COALESCE(?, task),
        completed = COALESCE(?, completed),
        priority = COALESCE(?, priority)
    WHERE id = ?
  `;

  db.run(query, [task, completed !== undefined ? (completed ? 1 : 0) : undefined, priority, id], function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: "To-Do item not found" });
    }
    res.json({ id, task, completed, priority });
  });
});

// DELETE /todos/:id - Delete a to-do item
app.delete('/todos/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const query = "DELETE FROM todos WHERE id = ?";

  db.run(query, [id], function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: "To-Do item not found" });
    }
    res.status(204).send();
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
