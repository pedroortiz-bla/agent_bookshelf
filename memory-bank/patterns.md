# Patterns

The established way to do each kind of work here. Match these rather than inventing a parallel
style.

## Model function

All SQL lives in `src/models/`. Bind parameters; never interpolate.

```ts
import { all, get, run } from '../db/index.js';   // note the .js extension on a .ts import

export function getBookById(id: number): Book | undefined {
  return get('SELECT * FROM books WHERE id = ?', [id]) as unknown as Book | undefined;
}

export function createBook(data: Omit<Book, 'id' | 'created_at'>): Book {
  const result = run(
    'INSERT INTO books (title, author, isbn) VALUES (?, ?, ?)',
    [data.title, data.author, data.isbn]
  );
  return getBookById(result.lastInsertRowid)!;
}
```

- Each model exports an `interface` for its row shape and casts through
  `as unknown as T` — the db layer returns `Record<string, unknown>`.
- Partial updates build `updates: string[]` + `values: unknown[]` in parallel and join with
  `, ` (see `updateBook`). Column names are literals in code; only values are bound.

## Route

Routes resolve params, call models, and render or serialize. No SQL.

```ts
router.get('/books/:id', (req: Request, res: Response) => {
  const bookId = parseInt(req.params.id as string, 10);
  const book = Book.getBookById(bookId);

  if (!book) {
    return res.status(404).render('error', { message: 'Book not found' });
  }

  res.render('books/show', { book });
});
```

HTMX endpoints render a partial (`views/books/reviews-list.ejs`), not a full layout.

**Route order matters.** `/books/search` is declared before `/books/:id` in
`src/routes/books.ts`; reversed, `:id` would swallow `search` and `parseInt('search')` would
give `NaN`. Register literal paths above parameterized ones.

## Test

```ts
beforeEach(async () => {
  await initDb('/tmp/test-<subject>.db');   // await — initDb is async
});

afterEach(() => {
  closeDb();
  try { fs.unlinkSync('/tmp/test-<subject>.db'); } catch { /* ignore */ }
});
```

- One tmp DB path per spec file; specs share a process, so a shared path makes them interfere.
- Route tests drive the real Express app through `supertest` — no mocked database.
- Do not copy `tests/setup.ts` or the `tests/README.md` example: both omit the `await`, and
  `setup.ts` is never loaded at all. Copy `tests/models/book.test.ts`.

## Imports

ESM throughout (`"type": "module"`). Relative imports carry a **`.js` extension even in
TypeScript source** (`from '../db/index.js'`) — every module in `src/` does this. Note that
`moduleResolution: "bundler"` means `tsc` will *not* complain if you omit it, so a missing
extension passes typecheck; match the existing style rather than relying on the compiler to
catch it.
