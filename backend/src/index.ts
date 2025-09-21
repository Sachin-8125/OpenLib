import { Hono } from 'hono'
import {cors} from 'hono/cors'
import { PrismaClient } from '@prisma/client'
import {sign, verify} from 'hono/jwt'
import { HTTPException } from 'hono/http-exception' 

const app = new Hono()
const prisma = new PrismaClient()

// CORS Middleware
app.use('/*', cors({
  origin: 'http://localhost:5173', // Your React app's URL
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['POST', 'GET', 'PUT', 'DELETE', 'OPTIONS'],
}));

//user signup
app.get('/', (c) => {
  return c.text('Hello Hono!')
})

export default app
