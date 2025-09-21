import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { PrismaClient } from '@prisma/client';
import { sign, verify } from 'hono/jwt';
import { HTTPException } from 'hono/http-exception';
import { hash, compare } from 'bcrypt';
const app = new Hono();
const prisma = new PrismaClient();
// CORS Middleware
app.use('/*', cors({
    origin: 'http://localhost:5173', // Your React app's URL
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['POST', 'GET', 'PUT', 'DELETE', 'OPTIONS'],
}));
// --- AUTHENTICATION ---
// User Signup
app.post('/api/auth/signup', async (c) => {
    const { email, password } = await c.req.json();
    if (!email || !password) {
        throw new HTTPException(400, { message: 'Email and password are required' });
    }
    const hashedPassword = await hash(password, 10); // Hash the password
    const user = await prisma.user.create({
        data: { email, password: hashedPassword },
    });
    return c.json({ id: user.id, email: user.email }, 201);
});
// User Login
app.post('/api/auth/login', async (c) => {
    const { email, password } = await c.req.json();
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await compare(password, user.password))) {
        throw new HTTPException(401, { message: 'Invalid credentials' });
    }
    const payload = { id: user.id, email: user.email, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 }; // 24hr expiration
    const token = await sign(payload, process.env.JWT_SECRET);
    return c.json({ token });
});
// --- MIDDLEWARE FOR PROTECTED ROUTES ---
app.use('/api/books/*', async (c, next) => {
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new HTTPException(401, { message: 'Unauthorized' });
    }
    const token = authHeader.split(' ')[1];
    try {
        const decodedPayload = await verify(token, process.env.JWT_SECRET);
        c.set('user', decodedPayload); // Attach user payload to the context
        await next();
    }
    catch (error) {
        throw new HTTPException(401, { message: 'Invalid token' });
    }
});
// --- BOOK ROUTES ---
// Get all books
app.get('/api/books', async (c) => {
    const books = await prisma.book.findMany({
        where: { isSold: false },
        include: { seller: { select: { email: true } } },
    });
    return c.json(books);
});
// Sell a book (Create)
app.post('/api/books', async (c) => {
    const user = c.get('user');
    const { title, author, description, price } = await c.req.json();
    const book = await prisma.book.create({
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
    const user = c.get('user');
    const bookId = parseInt(c.req.param('id'));
    const { title, author, description, price } = await c.req.json();
    const book = await prisma.book.findUnique({ where: { id: bookId } });
    if (!book || book.sellerId !== user.id) {
        throw new HTTPException(403, { message: 'Forbidden' });
    }
    const updatedBook = await prisma.book.update({
        where: { id: bookId },
        data: { title, author, description, price },
    });
    return c.json(updatedBook);
});
// Mark a book as sold (or delete it)
app.delete('/api/books/:id', async (c) => {
    const user = c.get('user');
    const bookId = parseInt(c.req.param('id'));
    const book = await prisma.book.findUnique({ where: { id: bookId } });
    if (!book || book.sellerId !== user.id) {
        throw new HTTPException(403, { message: 'Forbidden' });
    }
    await prisma.book.delete({ where: { id: bookId } });
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
