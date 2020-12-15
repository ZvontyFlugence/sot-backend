import express from 'express';
import auth from '../middleware/auth';
import NewsService from '../services/newsService';

const router = express.Router();

router.get('/:id', auth, async (req, res) => {
  let newsId = Number.parseInt(req.params.id);
  let result = await NewsService.getNewspaper(newsId);

  if (result)
    return res.status(result.status).json(result.payload);
  return res.status(500).json({ error: 'Something Went Wrong!' });
});

router.post('/:id/action', auth, async (req, res) => {
  const newsId = Number.parseInt(req.params.id);
  let result = await NewsService.doAction(newsId, req.body);

  return res.status(result.status).json(result.payload);
});

router.get('/:newsId/article/:articleId', auth, async (req, res) => {
  const newsId = Number.parseInt(req.params.newsId);
  const articleId = req.params.articleId;
  let result = await NewsService.getArticle(newsId, articleId);

  return res.status(result.status).json(result.payload);
});

export default router;