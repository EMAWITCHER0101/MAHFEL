
import React, { useMemo, useState, useCallback } from 'react';
import type { Author, Book } from '../types';
import BookCard from '../components/BookCard';

interface MatnPageProps {
  authors: Author[];
  books: Book[];
  onBookSelect: (book: Book) => void;
  onAuthorSelect: (author: Author) => void;
}

const MatnPage: React.FC<MatnPageProps> = ({ authors, books, onBookSelect, onAuthorSelect }) => {

  const masterAuthors = useMemo(() => authors.filter(a => a.role === 'master'), [authors]);

  const getAuthorById = useCallback((id: number) => authors.find(a => a.id === id), [authors]);

  const bookCategories = useMemo(() => {
    const allCategories = books.flatMap(b => b.categories);
    const categoryOrder = ["گفتمان پیشرفت", "مدرسه سیاست", "روضه سرای هنر و اندیشه", "هیئت کتاب", "قصه مقاومت"];
    const uniqueCategories = [...new Set(allCategories)];
    
    return uniqueCategories.sort((a: string, b: string) => {
        const indexA = categoryOrder.indexOf(a);
        const indexB = categoryOrder.indexOf(b);
        if (indexA === -1 && indexB === -1) return a.localeCompare(b);
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
    });
  }, [books]);
  
  const [selectedCategory, setSelectedCategory] = useState<string>('همه');

  const filteredBooks = useMemo(() => {
    const sortedBooks = [...books].sort((a, b) => new Date(b.addedDate || 0).getTime() - new Date(a.addedDate || 0).getTime());
    if (selectedCategory === 'همه') {
      return sortedBooks;
    }
    return sortedBooks.filter(b => b.categories.includes(selectedCategory));
  }, [books, selectedCategory]);

  return (
    <main className="pb-20 bg-gray-50">
      <section className="pt-6 mb-8">
        <h2 className="text-lg font-black mb-4 text-gray-800 pr-4 border-r-4 border-primary mx-4">اساتید و مولفین</h2>
        <div className="flex overflow-x-auto gap-6 py-4 no-scrollbar px-4">
          {masterAuthors.map(author => (
            <div key={author.id} onClick={() => onAuthorSelect(author)} className="flex flex-col items-center gap-3 flex-shrink-0 w-24 cursor-pointer group">
              <div className="relative p-1">
                <img src={author.avatar} alt={author.name} className="w-20 h-20 rounded-full object-cover shadow-lg border-2 border-white ring-2 ring-gray-100 group-hover:ring-primary transition-all duration-300" />
              </div>
              <p className="text-[11px] font-black text-center text-gray-500 group-hover:text-primary transition-colors line-clamp-2 h-8 leading-tight">{author.name}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-black mb-4 text-gray-800 pr-4 border-r-4 border-primary mx-4 ">کتابخانه سرای هنر و اندیشه</h2>
        <div className="flex overflow-x-auto gap-2 pb-4 no-scrollbar px-4 sticky top-0 bg-gray-50/90 backdrop-blur-md z-10 py-3 border-b border-gray-100">
          {['همه', ...bookCategories].map(cat => (
            <button key={cat} onClick={() => setSelectedCategory(cat)} className={`py-1.5 px-4 rounded-full text-[11px] font-black whitespace-nowrap transition-all duration-200 flex-shrink-0 active:scale-95 ${selectedCategory === cat ? 'bg-primary text-white shadow-lg' : 'bg-white text-gray-400 hover:bg-gray-100 border border-gray-200 shadow-sm'}`}>
              {cat}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-3 sm:gap-x-4 gap-y-6 sm:gap-y-8 px-4 mt-6">
          {filteredBooks.map(book => {
            const author = getAuthorById(book.authorId);
            return <BookCard key={book.id} book={book} author={author} onClick={() => onBookSelect(book)} />
          })}
        </div>
      </section>
    </main>
  );
};

export default MatnPage;
