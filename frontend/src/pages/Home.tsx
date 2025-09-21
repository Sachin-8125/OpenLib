import React,{useState,useEffect} from 'react';
import api from '../api/api';
import BookCard from '../components/BookCard';

interface Book{
    id: number;
    title: string;
    author: string;
    price: number;
    seller: {
        email: string
    };
}

const Home = () => {
    const [books, setBooks] = useState<Book[]>([]);

    useEffect(() => {
        const fetchBooks = async () => {
          try {
            const response = await api.get('/books');
            setBooks(response.data);
          } catch (error) {
            console.error("Failed to fetch books", error);
          }
        };
        fetchBooks();
      }, []);
    
    return (
        <div>
          <div className="hero">
            <h1>Welcome to BookStore</h1>
            <p>Discover your next favorite book from our curated collection</p>
          </div>
          <h2 style={{ textAlign: 'center', margin: '2rem 0', color: 'var(--primary-color)' }}>Available Books</h2>
          <div className="book-list">
            {books.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        </div>
    );
};

export default Home;