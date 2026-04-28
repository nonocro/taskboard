jest.mock('../../src/db');

const pool = require('../../src/db');
const Task = require('../../src/models/task');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Task Model', () => {
  describe('findAll', () => {
    test('should return all tasks ordered by creation date', async () => {
      const mockTasks = [
        { id: 2, title: 'Task 2', status: 'done', created_at: '2024-01-02' },
        { id: 1, title: 'Task 1', status: 'todo', created_at: '2024-01-01' },
      ];
      pool.query.mockResolvedValue({ rows: mockTasks });

      const tasks = await Task.findAll();

      expect(tasks).toEqual(mockTasks);
      expect(tasks).toHaveLength(2);
      expect(pool.query).toHaveBeenCalledWith(
        'SELECT * FROM tasks ORDER BY created_at DESC'
      );
    });

    test('should return empty array when no tasks exist', async () => {
      pool.query.mockResolvedValue({ rows: [] });

      const tasks = await Task.findAll();

      expect(tasks).toEqual([]);
      expect(tasks).toHaveLength(0);
    });
  });

  describe('findById', () => {
    test('should return a single task by id', async () => {
      const mockTask = { id: 1, title: 'Task 1', status: 'todo' };
      pool.query.mockResolvedValue({ rows: [mockTask] });

      const task = await Task.findById(1);

      expect(task).toEqual(mockTask);
      expect(pool.query).toHaveBeenCalledWith(
        'SELECT * FROM tasks WHERE id = $1',
        [1]
      );
    });

    test('should return undefined when task does not exist', async () => {
      pool.query.mockResolvedValue({ rows: [] });

      const task = await Task.findById(999);

      expect(task).toBeUndefined();
    });
  });

  describe('create', () => {
    test('should insert and return the new task', async () => {
      const newTask = { title: 'New Task', description: 'A test task', status: 'todo' };
      const mockResult = { id: 1, ...newTask, created_at: '2024-01-01' };
      pool.query.mockResolvedValue({ rows: [mockResult] });

      const task = await Task.create(newTask);

      expect(task).toEqual(mockResult);
      expect(task.title).toBe('New Task');
      expect(pool.query).toHaveBeenCalled();
    });

    test('should use default values for optional fields', async () => {
      const newTask = { title: 'Minimal Task' };
      const mockResult = { id: 1, title: 'Minimal Task', description: '', status: 'todo' };
      pool.query.mockResolvedValue({ rows: [mockResult] });

      const task = await Task.create(newTask);

      expect(task.description).toBe('');
      expect(task.status).toBe('todo');
    });
  });

  describe('update', () => {
    test('should update and return the modified task', async () => {
      const updatedTask = { id: 1, title: 'Updated', description: 'Desc', status: 'done' };
      pool.query.mockResolvedValue({ rows: [updatedTask] });

      const task = await Task.update(1, { title: 'Updated', description: 'Desc', status: 'done' });

      expect(task).toEqual(updatedTask);
      expect(task.status).toBe('done');
      expect(pool.query).toHaveBeenCalled();
    });

    test('should return undefined when updating non-existent task', async () => {
      pool.query.mockResolvedValue({ rows: [] });

      const task = await Task.update(999, { title: 'X', description: '', status: 'todo' });

      expect(task).toBeUndefined();
    });
  });

  describe('findByStatus', () => {
    test('should return tasks matching the given status', async () => {
      const mockTasks = [{ id: 1, title: 'Task 1', status: 'todo' }];
      pool.query.mockResolvedValue({ rows: mockTasks });

      const tasks = await Task.findByStatus('todo');

      expect(tasks).toEqual(mockTasks);
      expect(tasks).toHaveLength(1);
    });

    test('should return empty array when no tasks match the status', async () => {
      pool.query.mockResolvedValue({ rows: [] });

      const tasks = await Task.findByStatus('done');

      expect(tasks).toEqual([]);
    });
  });

  describe('delete', () => {
    test('should delete and return the removed task', async () => {
      const mockTask = { id: 1, title: 'Task 1' };
      pool.query.mockResolvedValue({ rows: [mockTask] });

      const task = await Task.delete(1);

      expect(task).toEqual(mockTask);
      expect(pool.query).toHaveBeenCalledWith(
        'DELETE FROM tasks WHERE id = $1 RETURNING *',
        [1]
      );
    });

    test('should return undefined when deleting non-existent task', async () => {
      pool.query.mockResolvedValue({ rows: [] });

      const task = await Task.delete(999);

      expect(task).toBeUndefined();
    });
  });
});
