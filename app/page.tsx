"use client"
import { Todo } from '@prisma/client';
import { useState, useEffect } from 'react';

interface TodoWithDeps extends Todo {
  dependencies: Array<{
    id: number;
    fromTaskId: number;
    dependencyType: string;
    fromTask: Todo;
  }>;
  dependents: Array<{
    id: number;
    toTaskId: number;
    dependencyType: string;
    toTask: Todo;
  }>;
}

export default function Home() {
  const [newTodo, setNewTodo] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [newDueTime, setNewDueTime] = useState('');
  const [newDuration, setNewDuration] = useState('1');
  const [todos, setTodos] = useState<TodoWithDeps[]>([]);
  const [loadingImages, setLoadingImages] = useState<{ [key: number]: boolean }>({});
  const [showDependencyModal, setShowDependencyModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<number | null>(null);
  const [dependsOnTask, setDependsOnTask] = useState<number | null>(null);
  const [dependencyType, setDependencyType] = useState('FS');
  const [showGraphView, setShowGraphView] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTask, setEditingTask] = useState<TodoWithDeps | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editDueTime, setEditDueTime] = useState('');
  const [editDuration, setEditDuration] = useState('1');

  useEffect(() => {
    fetchTodos();
  }, []);

  const fetchTodos = async () => {
    try {
      const res = await fetch('/api/todos');
      const data = await res.json();
      setTodos(data);

      // Calculate critical path
      await fetch('/api/critical-path');

      // Refresh data after critical path calculation
      const res2 = await fetch('/api/todos');
      const data2 = await res2.json();
      setTodos(data2);
    } catch (error) {
      console.error('Failed to fetch todos:', error);
    }
  };

  const handleAddTodo = async () => {
    if (!newTodo.trim()) return;
    try {
      let dueDateTime = null;
      if (newDueDate) {
        if (newDueTime) {
          dueDateTime = `${newDueDate}T${newDueTime}`;
        } else {
          dueDateTime = newDueDate;
        }
      }
      await fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTodo,
          dueDate: dueDateTime,
          duration: parseInt(newDuration) || 1
        }),
      });
      setNewTodo('');
      setNewDueDate('');
      setNewDueTime('');
      setNewDuration('1');
      fetchTodos();
    } catch (error) {
      console.error('Failed to add todo:', error);
    }
  };

  const handleDeleteTodo = async (id: number) => {
    try {
      await fetch(`/api/todos/${id}`, {
        method: 'DELETE',
      });
      fetchTodos();
    } catch (error) {
      console.error('Failed to delete todo:', error);
    }
  };

  const handleAddDependency = async () => {
    if (!selectedTask || !dependsOnTask) return;

    try {
      const res = await fetch('/api/dependencies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromTaskId: dependsOnTask,
          toTaskId: selectedTask,
          dependencyType,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        alert(error.error || 'Failed to add dependency');
        return;
      }

      setShowDependencyModal(false);
      setSelectedTask(null);
      setDependsOnTask(null);
      setDependencyType('FS');
      fetchTodos();
    } catch (error) {
      console.error('Failed to add dependency:', error);
      alert('Failed to add dependency');
    }
  };

  const handleRemoveDependency = async (depId: number) => {
    try {
      await fetch(`/api/dependencies/${depId}`, {
        method: 'DELETE',
      });
      fetchTodos();
    } catch (error) {
      console.error('Failed to remove dependency:', error);
    }
  };

  const handleEditTask = (task: TodoWithDeps) => {
    setEditingTask(task);
    setEditTitle(task.title);

    if (task.dueDate) {
      const dueDate = new Date(task.dueDate);
      const dateStr = dueDate.toISOString().split('T')[0];
      setEditDueDate(dateStr);

      const hours = dueDate.getHours();
      const minutes = dueDate.getMinutes();
      if (hours !== 0 || minutes !== 0) {
        const timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
        setEditDueTime(timeStr);
      } else {
        setEditDueTime('');
      }
    } else {
      setEditDueDate('');
      setEditDueTime('');
    }

    setEditDuration(String(task.duration));
    setShowEditModal(true);
  };

  const handleUpdateTask = async () => {
    if (!editingTask || !editTitle.trim()) return;

    try {
      let dueDateTime = null;
      if (editDueDate) {
        if (editDueTime) {
          dueDateTime = `${editDueDate}T${editDueTime}`;
        } else {
          dueDateTime = editDueDate;
        }
      }

      const res = await fetch(`/api/todos/${editingTask.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle,
          dueDate: dueDateTime,
          duration: parseInt(editDuration) || 1,
        }),
      });

      if (!res.ok) {
        alert('Failed to update task');
        return;
      }

      setShowEditModal(false);
      setEditingTask(null);
      setEditTitle('');
      setEditDueDate('');
      setEditDueTime('');
      setEditDuration('1');
      fetchTodos();
    } catch (error) {
      console.error('Failed to update task:', error);
      alert('Failed to update task');
    }
  };

  const getDependencyTypeLabel = (type: string) => {
    switch (type) {
      case 'FS': return 'Finish-to-Start';
      case 'SS': return 'Start-to-Start';
      case 'FF': return 'Finish-to-Finish';
      case 'SF': return 'Start-to-Finish';
      default: return type;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-500 to-red-500 flex flex-col items-center p-4">
      <div className="w-full max-w-3xl">
        <h1 className="text-4xl font-bold text-center text-white mb-8">Things To Do App</h1>

        <div className="bg-white bg-opacity-90 p-4 rounded-lg shadow-lg mb-6">
          <div className="flex mb-3">
            <input
              type="text"
              className="flex-grow p-3 rounded-l-full focus:outline-none text-gray-700"
              placeholder="Add a new todo"
              value={newTodo}
              onChange={(e) => setNewTodo(e.target.value)}
            />
            <input
              type="date"
              className="p-3 focus:outline-none text-gray-700"
              value={newDueDate}
              onChange={(e) => setNewDueDate(e.target.value)}
            />
            <input
              type="time"
              className="p-3 focus:outline-none text-gray-700"
              value={newDueTime}
              onChange={(e) => setNewDueTime(e.target.value)}
            />
            <input
              type="number"
              min="1"
              className="w-20 p-3 focus:outline-none text-gray-700"
              placeholder="Days"
              value={newDuration}
              onChange={(e) => setNewDuration(e.target.value)}
              title="Duration in days"
            />
            <button
              onClick={handleAddTodo}
              className="bg-indigo-600 text-white p-3 rounded-r-full hover:bg-indigo-700 transition duration-300"
            >
              Add
            </button>
          </div>
          <div className="flex justify-between items-center text-sm text-gray-600">
            <span>Date, Time, Duration (days)</span>
            <button
              onClick={() => setShowGraphView(!showGraphView)}
              className="bg-blue-500 text-white px-4 py-2 rounded-full hover:bg-blue-600 transition duration-300 text-sm"
            >
              {showGraphView ? 'Hide' : 'Show'} Dependency Graph
            </button>
          </div>
        </div>

        {showGraphView && (
          <div className="bg-white bg-opacity-90 p-6 rounded-lg shadow-lg mb-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Dependency Graph</h2>
            <div className="space-y-2">
              {todos.map((todo) => (
                <div key={todo.id} className="flex items-center space-x-2">
                  <div className={`px-3 py-1 rounded ${todo.isOnCriticalPath ? 'bg-red-100 border-2 border-red-500' : 'bg-gray-100'}`}>
                    <span className="text-sm font-semibold">{todo.title}</span>
                    {todo.isOnCriticalPath && <span className="text-red-600 text-xs ml-2">(Critical)</span>}
                  </div>
                  {todo.dependencies.length > 0 && (
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-500">←</span>
                      {todo.dependencies.map((dep, idx) => (
                        <div key={idx} className="text-xs bg-blue-100 px-2 py-1 rounded text-gray-800 font-medium">
                          {dep.fromTask.title} ({getDependencyTypeLabel(dep.dependencyType)})
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <ul>
          {todos.map((todo) => {
            const isOverdue = todo.dueDate && new Date(todo.dueDate) < new Date();
            const dueDate = todo.dueDate ? new Date(todo.dueDate) : null;
            const hasTime = dueDate && (dueDate.getHours() !== 0 || dueDate.getMinutes() !== 0);
            const isImageLoading = loadingImages[todo.id];
            return (
              <li
                key={todo.id}
                className={`flex bg-white bg-opacity-90 mb-4 rounded-lg shadow-lg overflow-hidden ${
                  todo.isOnCriticalPath ? 'ring-2 ring-red-500' : ''
                }`}
              >
                {todo.imageUrl && (
                  <div className="relative w-32 h-32 flex-shrink-0">
                    {isImageLoading && (
                      <div className="absolute inset-0 bg-gray-200 animate-pulse"></div>
                    )}
                    <img
                      src={todo.imageUrl}
                      alt={todo.title}
                      className={`w-full h-full object-cover transition-opacity duration-300 ${
                        isImageLoading ? 'opacity-0' : 'opacity-100'
                      }`}
                      onLoadStart={() => setLoadingImages(prev => ({ ...prev, [todo.id]: true }))}
                      onLoad={() => setLoadingImages(prev => ({ ...prev, [todo.id]: false }))}
                      onError={() => setLoadingImages(prev => ({ ...prev, [todo.id]: false }))}
                    />
                  </div>
                )}
                <div className="flex flex-col flex-grow p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col flex-grow">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-800 font-semibold">{todo.title}</span>
                        {todo.isOnCriticalPath && (
                          <span className="text-xs bg-red-500 text-white px-2 py-1 rounded">Critical Path</span>
                        )}
                      </div>

                      <div className="flex gap-4 mt-2 text-sm text-gray-600">
                        <span>Duration: {todo.duration} day{todo.duration !== 1 ? 's' : ''}</span>
                        {todo.earliestStart && (
                          <span>Earliest Start: {new Date(todo.earliestStart).toLocaleDateString()}</span>
                        )}
                      </div>

                      {todo.dueDate && dueDate && (
                        <span className={`text-sm mt-1 ${isOverdue ? 'text-red-600 font-semibold' : 'text-gray-600'}`}>
                          Due: {hasTime
                            ? dueDate.toLocaleString('en-US', {
                                month: 'numeric',
                                day: 'numeric',
                                year: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit',
                                hour12: true
                              })
                            : dueDate.toLocaleDateString()}
                        </span>
                      )}

                      {todo.dependencies.length > 0 && (
                        <div className="mt-2">
                          <span className="text-xs font-semibold text-gray-700">Depends on:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {todo.dependencies.map((dep) => (
                              <div key={dep.id} className="flex items-center bg-blue-100 px-2 py-1 rounded text-xs text-gray-800">
                                <span className="font-medium">{dep.fromTask.title} ({getDependencyTypeLabel(dep.dependencyType)})</span>
                                <button
                                  onClick={() => handleRemoveDependency(dep.id)}
                                  className="ml-2 text-red-600 hover:text-red-800 font-bold"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditTask(todo)}
                        className="text-green-500 hover:text-green-700 transition duration-300 text-sm"
                        title="Edit task"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => {
                          setSelectedTask(todo.id);
                          setShowDependencyModal(true);
                        }}
                        className="text-blue-500 hover:text-blue-700 transition duration-300 text-sm"
                        title="Add dependency"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteTodo(todo.id)}
                        className="text-red-500 hover:text-red-700 transition duration-300"
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {showDependencyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full m-4">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Add Dependency</h2>
            <p className="text-sm text-gray-600 mb-4">
              {todos.find(t => t.id === selectedTask)?.title} depends on:
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Task</label>
                <select
                  value={dependsOnTask || ''}
                  onChange={(e) => setDependsOnTask(parseInt(e.target.value))}
                  className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a task...</option>
                  {todos
                    .filter(t => t.id !== selectedTask)
                    .map(t => (
                      <option key={t.id} value={t.id}>{t.title}</option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Dependency Type</label>
                <select
                  value={dependencyType}
                  onChange={(e) => setDependencyType(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="FS">Finish-to-Start (FS)</option>
                  <option value="SS">Start-to-Start (SS)</option>
                  <option value="FF">Finish-to-Finish (FF)</option>
                  <option value="SF">Start-to-Finish (SF)</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {dependencyType === 'FS' && 'Task starts when predecessor finishes'}
                  {dependencyType === 'SS' && 'Task starts when predecessor starts'}
                  {dependencyType === 'FF' && 'Task finishes when predecessor finishes'}
                  {dependencyType === 'SF' && 'Task finishes when predecessor starts'}
                </p>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={handleAddDependency}
                className="flex-1 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition duration-300"
              >
                Add Dependency
              </button>
              <button
                onClick={() => {
                  setShowDependencyModal(false);
                  setSelectedTask(null);
                  setDependsOnTask(null);
                  setDependencyType('FS');
                }}
                className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400 transition duration-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditModal && editingTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full m-4">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Edit Task</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Task title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Due Date</label>
                <input
                  type="date"
                  value={editDueDate}
                  onChange={(e) => setEditDueDate(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Due Time</label>
                <input
                  type="time"
                  value={editDueTime}
                  onChange={(e) => setEditDueTime(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Duration (days)</label>
                <input
                  type="number"
                  min="1"
                  value={editDuration}
                  onChange={(e) => setEditDuration(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={handleUpdateTask}
                className="flex-1 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition duration-300"
              >
                Save Changes
              </button>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingTask(null);
                  setEditTitle('');
                  setEditDueDate('');
                  setEditDueTime('');
                  setEditDuration('1');
                }}
                className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400 transition duration-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
