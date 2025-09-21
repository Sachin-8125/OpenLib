import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { PrismaClient } from './generated/prisma';
import { PrismaNeon } from '@prisma/adapter-neon';
import { sign, verify } from 'hono/jwt';
import { HTTPException } from 'hono/http-exception';

// Define the context type for user data and environment
type Variables = {
  user: {
    id: number;
    email: string;
    exp: number;
  };
};

type Bindings = {
  DATABASE_URL: string;
  JWT_SECRET: string;
};

const app = new Hono<{ Variables: Variables; Bindings: Bindings }>();

// Initialize Prisma with Neon adapter for edge runtime
let prisma: PrismaClient;

function initializePrisma(env: any) {
  if (!prisma) {
    if (!env.DATABASE_URL) {
      console.error('DATABASE_URL is not configured');
      throw new Error('Database configuration error');
    }
    
    // Create Neon adapter with connection string
    const adapter = new PrismaNeon({ connectionString: env.DATABASE_URL });
    
    prisma = new PrismaClient({
      adapter,
      log: ['error', 'warn'],
    });
  }
  return prisma;
}

// Web Crypto API password hashing functions
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  const hashedInput = await hashPassword(password);
  return hashedInput === hashedPassword;
}

// Timeout wrapper for database operations
async function withTimeout<T>(promise: Promise<T>, timeoutMs: number = 15000): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('Database operation timed out')), timeoutMs);
  });
  
  return Promise.race([promise, timeoutPromise]);
}

// CORS Middleware
app.use('/*', cors({
  origin: ['http://localhost:5173', 'http://localhost:5174'], // Your React app's URLs
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['POST', 'GET', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
}));

// --- AUTHENTICATION ---
// User Signup
app.post('/api/auth/signup', async (c) => {
  try {
    const prismaClient = initializePrisma(c.env);
    const { email, password } = await c.req.json();
    
    if (!email || !password) {
      throw new HTTPException(400, { message: 'Email and password are required' });
    }

    // Check if user already exists
    const existingUser = await withTimeout(
      prismaClient.user.findUnique({ where: { email } })
    );
    
    if (existingUser) {
      throw new HTTPException(409, { message: 'User already exists' });
    }

    const hashedPassword = await hashPassword(password);
    const user = await withTimeout(
      prismaClient.user.create({
        data: { email, password: hashedPassword },
      })
    );

    return c.json({ id: user.id, email: user.email }, 201);
  } catch (error) {
    console.error('Signup error:', error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, { message: 'Internal server error during signup' });
  }
});

// User Login
app.post('/api/auth/login', async (c) => {
  try {
    // Check if JWT_SECRET is available
    if (!c.env.JWT_SECRET) {
      console.error('JWT_SECRET is not configured');
      throw new HTTPException(500, { message: 'Server configuration error' });
    }

    const prismaClient = initializePrisma(c.env);
    const { email, password } = await c.req.json();
    
    if (!email || !password) {
      throw new HTTPException(400, { message: 'Email and password are required' });
    }

    const user = await withTimeout(
      prismaClient.user.findUnique({ where: { email } })
    );

    if (!user || !(await verifyPassword(password, user.password))) {
      throw new HTTPException(401, { message: 'Invalid credentials' });
    }

    const payload = { id: user.id, email: user.email, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 }; // 24hr expiration
    const token = await sign(payload, c.env.JWT_SECRET);

    return c.json({ token });
  } catch (error) {
    console.error('Login error:', error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, { message: 'Internal server error during login' });
  }
});

// --- MIDDLEWARE FOR PROTECTED ROUTES ---
app.use('/api/books/*', async (c, next) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new HTTPException(401, { message: 'Unauthorized' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decodedPayload = await verify(token, c.env.JWT_SECRET);
    c.set('user', decodedPayload as { id: number; email: string; exp: number }); // Attach user payload to the context
    await next();
  } catch (error) {
    throw new HTTPException(401, { message: 'Invalid token' });
  }
});

// --- BOOK ROUTES ---
// Get all books
app.get('/api/books', async (c) => {
  try {
    const prismaClient = initializePrisma(c.env);
    const books = await withTimeout(
      prismaClient.book.findMany({
        where: { isSold: false },
        include: { seller: { select: { email: true } } },
      })
    );
    return c.json(books);
  } catch (error) {
    console.error('Books fetch error:', error);
    throw new HTTPException(500, { message: 'Failed to fetch books' });
  }
});

// Sell a book (Create)
app.post('/api/books', async (c) => {
  const prismaClient = initializePrisma(c.env);
  const user = c.get('user');
  const { title, author, description, price } = await c.req.json();

  const book = await prismaClient.book.create({
    data: {
      title,
      author,
      description,
      price,
      sellerId: user.id,
    },
  });

  return c.json(book, 201);
});

// Update a book's details
app.put('/api/books/:id', async (c) => {
    const prismaClient = initializePrisma(c.env);
    const user = c.get('user');
    const bookId = parseInt(c.req.param('id'));
    const { title, author, description, price } = await c.req.json();

    const book = await prismaClient.book.findUnique({ where: { id: bookId } });

    if (!book || book.sellerId !== user.id) {
        throw new HTTPException(403, { message: 'Forbidden' });
    }

    const updatedBook = await prismaClient.book.update({
        where: { id: bookId },
        data: { title, author, description, price },
    });

    return c.json(updatedBook);
});

// Mark a book as sold (or delete it)
app.delete('/api/books/:id', async (c) => {
    const prismaClient = initializePrisma(c.env);
    const user = c.get('user');
    const bookId = parseInt(c.req.param('id'));

    const book = await prismaClient.book.findUnique({ where: { id: bookId } });
    if (!book || book.sellerId !== user.id) {
        throw new HTTPException(403, { message: 'Forbidden' });
    }

    await prismaClient.book.delete({ where: { id: bookId }});
    return c.json({ message: 'Book deleted successfully' });
});

// Global error handler
app.onError((err, c) => {
  console.error(`${err.name}: ${err.message}`);
  if (err instanceof HTTPException) {
    return err.getResponse();
  }
  return c.json({ message: "Internal Server Error" }, 500);
});



export default app;
