# OpenLib

OpenLib is a full-stack web application that allows users to buy and sell books.

## Technologies Used

### Frontend

*   React
*   TypeScript
*   Vite
*   React Router
*   Axios

### Backend

*   Node.js
*   Hono
*   Prisma
*   PostgreSQL
*   Cloudflare Workers

## Getting Started

To get a local copy up and running, follow these simple steps.

### Prerequisites

*   npm
    ```sh
    npm install npm@latest -g
    ```

### Installation

1.  Clone the repo
    ```sh
    git clone https://github.com/your_username/OpenLib.git
    ```
2.  Install NPM packages for the backend
    ```sh
    cd backend
    npm install
    ```
3.  Install NPM packages for the frontend
    ```sh
    cd ../frontend
    npm install
    ```

### Running the Application

1.  Start the backend server
    ```sh
    cd backend
    npm run dev
    ```
2.  Start the frontend development server
    ```sh
    cd ../frontend
    npm run dev
    ```

## Database Schema

The database is managed using Prisma and has the following schema:

### User

| Field     | Type    | Description              |
| :-------- | :------ | :----------------------- |
| id        | Int     | Unique identifier        |
| email     | String  | User's email address     |
| password  | String  | User's hashed password   |
| createdAt | DateTime| Date and time of creation|
| booksSold | Book[]  | List of books sold by user|

### Book

| Field       | Type    | Description                |
| :---------- | :------ | :------------------------- |
| id          | Int     | Unique identifier          |
| title       | String  | Book's title               |
| author      | String  | Book's author              |
| description | String  | Book's description         |
| price       | Float   | Book's price               |
| isSold      | Boolean | Whether the book is sold   |
| createdAt   | DateTime| Date and time of creation  |
| sellerId    | Int     | ID of the user selling the book |
| seller      | User    | User selling the book      |