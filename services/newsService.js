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

NewsService.getCountryNewspapers = async countryId => {
  const users = db.getDB().collection('users');
  
  // Get Citizens with CS of country
  let citizens = await users.find({ country: countryId }).toArray()

  // Remove citizens w/o newspapers
  let authors = citizens.filter(c => c.newspaper > 0)

  // Get their newspaper
  let newspapers = await Promise.all(authors.map(async author => {
    let res = await NewsService.getNewspaper(author.newspaper);

    if (res.status === 200 && res.payload && res.payload.news) {
      return res.payload.news;
    }
    return null;
  }));

  return newspapers;
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

// TODO: Speed up by moving articles to their own collection and
// keep a reference to its publisher (newspaper)
NewsService.getCountryArticles = async countryId => {
  let newspapers = await NewsService.getCountryNewspapers(countryId);
  let articles = [];

  for (let i = 0; i < newspapers.length; i++) {
    if (newspapers[i] === null)
      continue;

    for (let article of newspapers[i].articles) {
      if (!article.published)
        continue;
        
      article.publisher = { ...newspapers[i], articles: undefined };
      articles.push(article);
    }
  }

  articles.sort((a, b) => b.likes - a.likes);

  return articles;
}

NewsService.doAction = async (id, body) => {
  switch (body.action.toUpperCase()) {
    case NewsActions.EDIT_ARTICLE:
      return await edit_article(id, body.article);
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

  let article_doc = {
    ...article,
    likes: [],
    comments: [],
  };

  let articles = [];
  if (!article_doc.id) {
    article_doc.id = new mongodb.ObjectId();
    articles = [...newspaper.articles, article_doc];
  } else {
    let articleIdx = newspaper.articles.findIndex(art => art.id == article_doc.id);
    article_doc.id = mongodb.ObjectId(article_doc.id);
    newspaper.articles[articleIdx] = article_doc;
    articles = [...newspaper.articles];
  }

  
  let updated = await newspapers.findOneAndUpdate({ _id: id }, { $set: { articles } }, { new: true });

  if (updated) {
    payload = { success: true, articleId: article_doc.id };
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

const edit_article = async (id, article) => {
  const newspapers = db.getDB().collection('newspapers');
  let newspaper = await newspapers.findOne({ _id: id });
  let payload = {};

  if (!newspaper) {
    payload.error = 'Newspaper Not Found!';
    return Promise.resolve({ status: 404, payload });
  }

  // Find matching article index
  let articleIdx = newspaper.articles.findIndex(art => art.id == article.id);

  if (articleIdx === -1) {
    payload.error = 'Article Not Found!';
    return Promise.resolve({ status: 404, payload });
  }

  // Replace article
  newspaper.articles[articleIdx] = article;

  // Update Newspaper
  let updates = { articles: [...newspaper.articles] };
  let updated = await newspapers.findOneAndUpdate({ _id: id }, { $set: updates });

  if (updated) {
    payload = { success: true };
    return Promise.resolve({ status: 200, payload });
  }

  payload.error = 'Something Went Wrong!';
  return Promise.resolve({ status: 500, payload });
}

export default NewsService;