import { Router, Request, Response } from 'express';
import * as Shelf from '../models/shelf.js';
import * as User from '../models/user.js';
import * as Book from '../models/book.js';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  const users = User.getAllUsers();
  res.render('shelves/index', { users });
});

router.get('/user/:userId', (req: Request, res: Response) => {
  const userId = parseInt(req.params.userId as string, 10);
  const user = User.getUserById(userId);

  if (!user) {
    return res.status(404).render('error', { message: 'User not found' });
  }

  const shelves = Shelf.getShelvesByUserId(userId);
  const shelvesWithBooks = shelves.map(shelf => Shelf.getShelfWithBooks(shelf.id)!);

  res.render('shelves/user', { user, shelves: shelvesWithBooks });
});

router.get('/:id', (req: Request, res: Response) => {
  const shelfId = parseInt(req.params.id as string, 10);
  const shelf = Shelf.getShelfWithBooks(shelfId);

  if (!shelf) {
    return res.status(404).render('error', { message: 'Shelf not found' });
  }

  const allBooks = Book.getAllBooks();
  res.render('shelves/show', { shelf, allBooks });
});

router.post('/:id/books', (req: Request, res: Response) => {
  const shelfId = parseInt(req.params.id as string, 10);
  const { bookId } = req.body;

  if (!bookId) {
    return res.status(400).send('<p class="error">Book ID is required</p>');
  }

  Shelf.addBookToShelf(shelfId, parseInt(bookId));

  const shelf = Shelf.getShelfWithBooks(shelfId)!;
  res.render('shelves/books-list', { shelf });
});

router.delete('/:id/books/:bookId', (req: Request, res: Response) => {
  const shelfId = parseInt(req.params.id as string, 10);
  const bookId = parseInt(req.params.bookId as string, 10);

  Shelf.removeBookFromShelf(shelfId, bookId);

  const shelf = Shelf.getShelfWithBooks(shelfId)!;
  res.render('shelves/books-list', { shelf });
});

export default router;
