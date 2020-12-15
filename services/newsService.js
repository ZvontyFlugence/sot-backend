import db from './dbService';
import mongodb from 'mongodb';

const NewsService = {};
const NewsActions = {
  EDIT_ARTICLE: 'EDIT_ARTICLE',
  PUBLISH_ARTICLE: 'PUBLISH_ARTICLE',
  SAVE_ARTICLE: 'SAVE_ARTICLE',  
};

NewsService.createNews = async data => {
  let newspapers = db.getDB().collection('newspapers');

  let news_doc = {
    _id: await newspapers.estimatedDocumentCount() + 1,
    name: data.name,
    image: process.env.DEFAULT_IMAGE,
    author: data.author,
    subscribers: 0,
    articles: [],
  };

  let res = await newspapers.insert(news_doc);
  let newspaper = res.ops[0];

  if (newspaper)
    return Promise.resolve({ status: 201, payload: { success: true, newsId: newspaper._id } });
  return Promise.resolve({ status: 500, payload: { success: false, err: 'Something Unexpected Happened' } });
}

NewsService.getNewspaper = async id => {
  let newspapers = db.getDB().collection('newspapers');
  let newspaper = await newspapers.findOne({ _id: id });

  if (newspaper) {
    return Promise.resolve({ status: 200, payload: { news: newspaper } });
  }

  return Promise.resolve({ status: 404 , payload: { error: 'Newspaper Not Found!' } });
}

NewsService.getArticle = async (newsId, articleId) => {
  let newspapers = db.getDB().collection('newspapers');
  let newspaper = await newspapers.findOne({ _id: newsId });
  let payload = {};

  if (!newspaper) {
    payload.error = 'Newspaper Not Found!';
    return Promise.resolve({ status: 404, payload });
  }

  let article = newspaper.articles.find(art => art.id == articleId);

  if (article) {
    payload = { success: true, article };
    return Promise.resolve({ status: 200, payload });
  }

  payload.error = 'Article Not Found!';
  return Promise.resolve({ status: 404, payload });
}

NewsService.doAction = async (id, body) => {
  switch (body.action.toUpperCase()) {
    case NewsActions.PUBLISH_ARTICLE:
      return await publish_article(id, body.article);
    case NewsActions.SAVE_ARTICLE:
      return await save_article(id, body.article);
    default:
      const payload = { error: 'Unsupported Action!' };
      return Promise.resolve({ status: 400, payload });
  }
}

const publish_article = async (id, article) => {
  let newspapers = db.getDB().collection('newspapers');
  let newspaper = await newspapers.findOne({ _id: id });
  let payload = {};

  if (!newspaper) {
    payload.error = 'Newspaper Not Found!';
    return Promise.resolve({ status: 404, payload });
  }

  let articleId = new mongodb.ObjectID();
  let article_doc = {
    ...article,
    id: articleId,
    likes: [],
    comments: [],
  };

  let articles = [...newspaper.articles, article_doc];
  let updated = await newspapers.findOneAndUpdate({ _id: id }, { $set: { articles } }, { new: true });

  if (updated) {
    payload = { success: true, articleId };
    return Promise.resolve({ status: 201, payload });
  }

  payload.error = 'Something Went Wrong!';
  return Promise.resolve({ status: 500, payload });
}

const save_article = async (id, article) => {
  let newspapers = db.getDB().collection('newspapers');
  let newspaper = await newspapers.findOne({ _id: id });
  let payload = {};

  if (!newspaper) {
    payload.error = 'Newspaper Not Found!';
    return Promise.resolve({ status: 404, payload });
  }

  let articleId = new mongodb.ObjectID();
  let article_doc = {
    ...article,
    id: articleId,
  };

  let articles = [...newspaper.articles, article_doc];
  let updated = await newspapers.findOneAndUpdate({ _id: id }, { $set: { articles } }, { new: true });

  if (updated) {
    payload = { success: true, articleId };
    return Promise.resolve({ status: 201, payload });
  }

  payload.error = 'Something Went Wrong!';
  return Promise.resolve({ status: 500, payload });
}

export default NewsService;