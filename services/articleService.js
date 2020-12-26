import db from './dbService';
import mongodb from 'mongodb';

const ArticleService = {};

ArticleService.getArticle = async id => {
  const articles = db.getDB().collection('articles');
  return await articles.findOne({ _id: new mongodb.ObjectId(id) });
}

ArticleService.getGlobalArticles = async () => {
  const articles = db.getDB().collection('articles');
  return await articles.find({}).toArray();
}

ArticleService.getCountryArticles = async countryId => {
  const articles = db.getDB().collection('articles');
  return await articles.find({ country: countryId }).toArray();
}

ArticleService.getNewspaperArticles = async newsId => {
  const articles = db.getDB().collection('articles');
  return await articles.find({ publisher: newsId }).toArray();
}

ArticleService.publishArticle = async (newsId, articleData) => {
  const articles = db.getDB().collection('articles');

  let article_doc = {
    ...articleData,
    publisher: newsId,
    published: true,
    likes: [],
    comments: [],
  };

  if (!article_doc._id) {
    article_doc._id = new mongodb.ObjectId();
    let article = await articles.insertOne(article_doc);

    return article ? article_doc._id : null;
  } else {
    article_doc._id = new mongodb.ObjectId(article_doc._id);
    let updated = await articles.findOneAndUpdate({ _id: article_doc._id }, { $set: article_doc });
    
    return updated ? article_doc._id : null;
  }
}

ArticleService.saveArticle = async (newsId, articleData) => {
  const articles = db.getDB().collection('articles');

  let articleId = new mongodb.ObjectId();
  let article_doc = {
    ...articleData,
    _id: articleId,
    publisher: newsId,
  };

  let article = await articles.insertOne(article_doc);
  return article ? articleId : null;
}

ArticleService.editArticle = async articleData => {
  const articles = db.getDB().collection('articles');
  let article = await articles.findOne({ _id: articleData._id });
  
  if (!article) {
    return false;
  }

  let updated = await articles.findOneAndUpdate({ _id: articleData._id }, { $set: articleData });

  return updated ? true : false;
}

export default ArticleService;