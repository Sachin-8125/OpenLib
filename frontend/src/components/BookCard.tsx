import React from 'react';

interface Book {
  id: number;
  title: string;
  author: string;
  price: number;
  seller: { email: string };
}

const BookCard = ({ book }: { book: Book }) => {
  return (
    <div className="book-card">
      <h3>{book.title}</h3>
      <p>by {book.author}</p>
      <h4>${book.price.toFixed(2)}</h4>
      <p>Seller: {book.seller.email}</p>
      <button>Buy Now</button>
    </div>
  );
};

export default BookCard;