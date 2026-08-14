import React from 'react';
import type { Book, Author } from '../types';

interface BookCardProps {
  book: Book;
  author?: Author;
  onClick: () => void;
}

const BookCard: React.FC<BookCardProps> = ({ book, author, onClick }) => {
  return (
    <div
      className="cursor-pointer group"
      onClick={onClick}
    >
      <div className="aspect-[2/3] w-full rounded-lg overflow-hidden shadow-lg transition-all duration-300 group-hover:shadow-xl group-hover:-translate-y-1">
        <img 
          src={book.cover} 
          alt={book.title} 
          loading="lazy" 
          className="w-full h-full object-cover"
        />
      </div>
      <div className="mt-2 text-right px-1">
        <h3 className="text-sm font-bold leading-tight line-clamp-2 text-text-primary group-hover:text-primary transition-colors h-10 ">{book.title}</h3>
        {author && (
          <p className="text-xs text-text-secondary mt-1 truncate ">{author.name}</p>
        )}
      </div>
    </div>
  );
};

export default BookCard;