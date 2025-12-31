import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface TaskNode {
  id: number;
  title: string;
  duration: number;
  earliestStart: number;
  earliestFinish: number;
  latestStart: number;
  latestFinish: number;
  slack: number;
  isOnCriticalPath: boolean;
  dependencies: Array<{ taskId: number; type: string }>;
}

function calculateEarliestTimes(
  tasks: Map<number, TaskNode>,
  dependencies: Map<number, Array<{ fromId: number; type: string }>>
): void {
  const visited = new Set<number>();
  const tempMarked = new Set<number>();

  function visit(taskId: number) {
    if (visited.has(taskId)) return;
    if (tempMarked.has(taskId)) return; // Cycle detection

    tempMarked.add(taskId);

    const task = tasks.get(taskId)!;
    const taskDeps = dependencies.get(taskId) || [];

    let maxEarliestStart = 0;

    for (const dep of taskDeps) {
      visit(dep.fromId);
      const predTask = tasks.get(dep.fromId)!;

      let requiredStart = 0;
      switch (dep.type) {
        case 'FS': // Finish-to-Start: This task starts when predecessor finishes
          requiredStart = predTask.earliestFinish;
          break;
        case 'SS': // Start-to-Start: This task starts when predecessor starts
          requiredStart = predTask.earliestStart;
          break;
        case 'FF': // Finish-to-Finish: This task finishes when predecessor finishes
          requiredStart = predTask.earliestFinish - task.duration;
          break;
        case 'SF': // Start-to-Finish: This task finishes when predecessor starts
          requiredStart = predTask.earliestStart - task.duration;
          break;
      }

      maxEarliestStart = Math.max(maxEarliestStart, requiredStart);
    }

    task.earliestStart = maxEarliestStart;
    task.earliestFinish = maxEarliestStart + task.duration;

    tempMarked.delete(taskId);
    visited.add(taskId);
  }

  for (const taskId of tasks.keys()) {
    visit(taskId);
  }
}

function calculateLatestTimes(
  tasks: Map<number, TaskNode>,
  dependencies: Map<number, Array<{ fromId: number; type: string }>>
): void {
  // Find project finish time (maximum earliest finish)
  let projectFinish = 0;
  for (const task of tasks.values()) {
    projectFinish = Math.max(projectFinish, task.earliestFinish);
  }

  // Initialize all latest times to project finish
  for (const task of tasks.values()) {
    task.latestFinish = projectFinish;
    task.latestStart = projectFinish - task.duration;
  }

  // Build reverse dependency map (who depends on me)
  const reverseDeps = new Map<number, Array<{ toId: number; type: string }>>();
  for (const [taskId, deps] of dependencies.entries()) {
    for (const dep of deps) {
      if (!reverseDeps.has(dep.fromId)) {
        reverseDeps.set(dep.fromId, []);
      }
      reverseDeps.get(dep.fromId)!.push({ toId: taskId, type: dep.type });
    }
  }

  const visited = new Set<number>();

  function visitBackward(taskId: number) {
    if (visited.has(taskId)) return;

    const task = tasks.get(taskId)!;
    const successors = reverseDeps.get(taskId) || [];

    let minLatestFinish = task.latestFinish;

    for (const succ of successors) {
      visitBackward(succ.toId);
      const succTask = tasks.get(succ.toId)!;

      let requiredFinish = task.latestFinish;
      switch (succ.type) {
        case 'FS':
          requiredFinish = Math.min(requiredFinish, succTask.latestStart);
          break;
        case 'SS':
          requiredFinish = Math.min(
            requiredFinish,
            succTask.latestStart + task.duration
          );
          break;
        case 'FF':
          requiredFinish = Math.min(requiredFinish, succTask.latestFinish);
          break;
        case 'SF':
          requiredFinish = Math.min(
            requiredFinish,
            succTask.latestFinish + task.duration
          );
          break;
      }

      minLatestFinish = Math.min(minLatestFinish, requiredFinish);
    }

    task.latestFinish = minLatestFinish;
    task.latestStart = minLatestFinish - task.duration;

    visited.add(taskId);
  }

  for (const taskId of tasks.keys()) {
    visitBackward(taskId);
  }
}

export async function GET() {
  try {
    const todos = await prisma.todo.findMany();
    const dependencies = await prisma.taskDependency.findMany();

    // Build task map
    const tasks = new Map<number, TaskNode>();
    for (const todo of todos) {
      tasks.set(todo.id, {
        id: todo.id,
        title: todo.title,
        duration: todo.duration,
        earliestStart: 0,
        earliestFinish: 0,
        latestStart: 0,
        latestFinish: 0,
        slack: 0,
        isOnCriticalPath: false,
        dependencies: [],
      });
    }

    // Build dependency map
    const depMap = new Map<number, Array<{ fromId: number; type: string }>>();
    for (const dep of dependencies) {
      if (!depMap.has(dep.toTaskId)) {
        depMap.set(dep.toTaskId, []);
      }
      depMap.get(dep.toTaskId)!.push({
        fromId: dep.fromTaskId,
        type: dep.dependencyType,
      });

      const task = tasks.get(dep.toTaskId);
      if (task) {
        task.dependencies.push({
          taskId: dep.fromTaskId,
          type: dep.dependencyType,
        });
      }
    }

    // Calculate earliest and latest times
    calculateEarliestTimes(tasks, depMap);
    calculateLatestTimes(tasks, depMap);

    // Calculate slack and identify critical path
    const criticalPath: number[] = [];
    for (const task of tasks.values()) {
      task.slack = task.latestStart - task.earliestStart;
      task.isOnCriticalPath = task.slack === 0;
      if (task.isOnCriticalPath) {
        criticalPath.push(task.id);
      }
    }

    // Update database with critical path info
    for (const task of tasks.values()) {
      await prisma.todo.update({
        where: { id: task.id },
        data: {
          isOnCriticalPath: task.isOnCriticalPath,
          earliestStart: new Date(
            Date.now() + task.earliestStart * 24 * 60 * 60 * 1000
          ),
        },
      });
    }

    return NextResponse.json({
      tasks: Array.from(tasks.values()),
      criticalPath,
    });
  } catch (error) {
    console.error('Error calculating critical path:', error);
    return NextResponse.json(
      { error: 'Error calculating critical path' },
      { status: 500 }
    );
  }
}
