import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

async function fetchPexelsImage(query: string): Promise<string | null> {
  try {
    // Enhance search query for better accuracy
    const enhancedQuery = `${query} activity task`;

    const response = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(enhancedQuery)}&per_page=1&orientation=landscape`,
      {
        headers: {
          Authorization: process.env.PEXELS_API_KEY || '',
        },
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    if (data.photos && data.photos.length > 0) {
      return data.photos[0].src.small;
    }

    return null;
  } catch (error) {
    console.error('Error fetching Pexels image:', error);
    return null;
  }
}

export async function GET() {
  try {
    const todos = await prisma.todo.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        dependencies: {
          include: {
            fromTask: true,
          },
        },
        dependents: {
          include: {
            toTask: true,
          },
        },
      },
    });
    return NextResponse.json(todos);
  } catch (error) {
    return NextResponse.json({ error: 'Error fetching todos' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { title, dueDate, duration } = await request.json();
    if (!title || title.trim() === '') {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const imageUrl = await fetchPexelsImage(title);

    const todo = await prisma.todo.create({
      data: {
        title,
        dueDate: dueDate ? new Date(dueDate) : null,
        imageUrl,
        duration: duration || 1,
      },
    });
    return NextResponse.json(todo, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Error creating todo' }, { status: 500 });
  }
}