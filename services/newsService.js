import db from './dbService';
import ArticleService from './articleService';

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

  if (!newspaper) {
    return Promise.resolve({ status: 404 , payload: { error: 'Newspaper Not Found!' } });    
  }

  let articles = [];
  for (let articleId of newspaper.articles) {
    let article = await ArticleService.getArticle(articleId);
    articles.push(article);
  }

  newspaper.articles = articles;

  return Promise.resolve({ status: 200, payload: { news: newspaper } });
}

NewsService.getNewspapers = async () => {
  const newspapers = db.getDB().collection('newspapers');
  return await newspapers.find({}).toArray();
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

  let articleIndex = newspaper.articles.findIndex(art => `${art}` == articleId);
  if (articleIndex === -1) {
    payload.error = 'Article Not Found!';
    return Promise.resolve({ status: 404, payload });
  }

  let article = await ArticleService.getArticle(articleId)

  if (article) {
    payload = { success: true, article, newspaper };
    return Promise.resolve({ status: 200, payload });
  }

  payload.error = 'Something Went Wrong!';
  return Promise.resolve({ status: 404, payload });
}

NewsService.getCountryArticles = async countryId => {
  let articles = await ArticleService.getCountryArticles(countryId);

  for (let i = 0; i < articles.length; i++) {
    let result = await NewsService.getNewspaper(articles[i].publisher);
    if (result.payload.news) {
      let publisher = result.payload.news;
      articles[i].publisher = { ...publisher, articles: undefined };
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

  let articleId = await ArticleService.publishArticle(id, article);

  if (!articleId) {
    payload.error = 'Article Not Published!';
    return Promise.resolve({ status: 400, payload });
  }

  if (!newspaper.articles.includes(articleId)) {
    let articles = [...newspaper.articles, articleId];
    let updated = await newspapers.findOneAndUpdate({ _id: id }, { $set: { articles } }, { new: true });

    if (updated) {
      payload = { success: true, articleId };
      return Promise.resolve({ status: 201, payload });
    }
  } else {
    payload = { success: true, articleId };
    return Promise.resolve({ status: 200, payload });
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

  let articleId = await ArticleService.saveArticle(id, article);

  if (!articleId) {
    payload.error = 'Article Not Saved!';
    return Promise.resolve({ status: 400, payload });
  }

  let articles = [...newspaper.articles, articleId];
  let updated = await newspapers.findOneAndUpdate({ _id: id }, { $set: { articles } });

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

  let updated = await ArticleService.editArticle(article);

  if (updated) {
    payload = { success: true };
    return Promise.resolve({ status: 200, payload });
  }

  payload.error = 'Something Went Wrong!';
  return Promise.resolve({ status: 500, payload });
}

export default NewsService;