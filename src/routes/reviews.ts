import { Router, Request, Response } from 'express';
import * as Review from '../models/review.js';

const router = Router();

router.get('/:id', (req: Request, res: Response) => {
  const reviewId = parseInt(req.params.id as string, 10);
  const review = Review.getReviewById(reviewId);

  if (!review) {
    return res.status(404).render('error', { message: 'Review not found' });
  }

  res.render('reviews/show', { review });
});

export default router;
