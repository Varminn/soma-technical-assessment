import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Check for circular dependencies using DFS
function hasCircularDependency(
  fromTaskId: number,
  toTaskId: number,
  dependencies: Map<number, number[]>
): boolean {
  const visited = new Set<number>();
  const recStack = new Set<number>();

  function dfs(taskId: number): boolean {
    if (recStack.has(taskId)) return true;
    if (visited.has(taskId)) return false;

    visited.add(taskId);
    recStack.add(taskId);

    const neighbors = dependencies.get(taskId) || [];
    for (const neighbor of neighbors) {
      if (dfs(neighbor)) return true;
    }

    recStack.delete(taskId);
    return false;
  }

  // Add the new edge temporarily
  const existing = dependencies.get(fromTaskId) || [];
  dependencies.set(fromTaskId, [...existing, toTaskId]);

  const hasCircle = dfs(toTaskId);

  // Remove the temporary edge
  dependencies.set(fromTaskId, existing);

  return hasCircle;
}

export async function POST(request: Request) {
  try {
    const { fromTaskId, toTaskId, dependencyType } = await request.json();

    if (!fromTaskId || !toTaskId) {
      return NextResponse.json(
        { error: 'fromTaskId and toTaskId are required' },
        { status: 400 }
      );
    }

    if (fromTaskId === toTaskId) {
      return NextResponse.json(
        { error: 'A task cannot depend on itself' },
        { status: 400 }
      );
    }

    // Get all existing dependencies
    const allDependencies = await prisma.taskDependency.findMany();
    const dependencyMap = new Map<number, number[]>();

    allDependencies.forEach(dep => {
      const existing = dependencyMap.get(dep.toTaskId) || [];
      dependencyMap.set(dep.toTaskId, [...existing, dep.fromTaskId]);
    });

    // Check for circular dependency
    if (hasCircularDependency(toTaskId, fromTaskId, dependencyMap)) {
      return NextResponse.json(
        { error: 'This dependency would create a circular dependency' },
        { status: 400 }
      );
    }

    const dependency = await prisma.taskDependency.create({
      data: {
        fromTaskId,
        toTaskId,
        dependencyType: dependencyType || 'FS',
      },
    });

    return NextResponse.json(dependency, { status: 201 });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'This dependency already exists' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Error creating dependency' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const dependencies = await prisma.taskDependency.findMany({
      include: {
        fromTask: true,
        toTask: true,
      },
    });
    return NextResponse.json(dependencies);
  } catch (error) {
    return NextResponse.json(
      { error: 'Error fetching dependencies' },
      { status: 500 }
    );
  }
}
