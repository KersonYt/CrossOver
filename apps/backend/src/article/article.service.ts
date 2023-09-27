import { Injectable } from '@nestjs/common';
import { EntityManager, QueryOrder, wrap } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/mysql';

import { User } from '../user/user.entity';
import { ArticleCoauthors } from '../user/coauthor/coauthor.entity';
import { Article } from './article.entity';
import { Tag } from '../tag/tag.entity';
import { IArticleRO, IArticlesRO, ICommentsRO } from './article.interface';
import { Comment } from './comment.entity';
import { CreateArticleDto, CreateCommentDto } from './dto';
import { NotFoundException } from '@nestjs/common';

@Injectable()
export class ArticleService {
  constructor(
    private readonly em: EntityManager,
    @InjectRepository(Article)
    private readonly articleRepository: EntityRepository<Article>,
    @InjectRepository(Comment)
    private readonly commentRepository: EntityRepository<Comment>,
    @InjectRepository(User)
    private readonly userRepository: EntityRepository<User>,
    @InjectRepository(Tag)
    private readonly tagRepository: EntityRepository<Tag>,
    @InjectRepository(ArticleCoauthors)
    private readonly coauthorRepository: EntityRepository<ArticleCoauthors>,
  ) { }

  async findAll(userId: number, query: Record<string, string>): Promise<IArticlesRO> {
    console.log("Second part");
    const user = userId
      ? await this.userRepository.findOne(userId, { populate: ['followers', 'favorites'] })
      : undefined;
    const qb = this.articleRepository.createQueryBuilder('a').select('a.*').leftJoin('a.author', 'u');

    if ('tag' in query) {
      qb.andWhere({ tagList: new RegExp(query.tag) });
    }

    if ('author' in query) {
      const author = await this.userRepository.findOne({ username: query.author });

      if (!author) {
        return { articles: [], articlesCount: 0 };
      }

      qb.andWhere({ author: author.id });
    }

    if ('favorited' in query) {
      const author = await this.userRepository.findOne({ username: query.favorited }, { populate: ['favorites'] });

      if (!author) {
        return { articles: [], articlesCount: 0 };
      }

      const ids = author.favorites.$.getIdentifiers();
      qb.andWhere({ author: ids });
    }

    qb.orderBy({ createdAt: QueryOrder.DESC });
    const res = await qb.clone().count('id', true).execute('get');
    const articlesCount = res.count;

    if ('limit' in query) {
      qb.limit(+query.limit);
    }

    if ('offset' in query) {
      qb.offset(+query.offset);
    }

    const articles = await qb.getResult();

    for (const article of articles) {
      const sql = `
          SELECT u.* 
          FROM user u 
          INNER JOIN article_coauthors ac ON u.id = ac.user_id 
          WHERE ac.article_id = ?
      `;

      const coauthors = await this.em.getConnection().execute(sql, [article.id]);
      console.log(coauthors);
      article.coauthors = coauthors; // assuming 'coauthors' is a property in the Article object, otherwise adjust as needed
    }

    return { articles: articles.map((a) => a.toJSON(user!)), articlesCount };
  }

  async findFeed(userId: number, query: Record<string, string>): Promise<IArticlesRO> {
    const user = userId
      ? await this.userRepository.findOne(userId, { populate: ['followers', 'favorites'] })
      : undefined;
    const res = await this.articleRepository.findAndCount(
      { author: { followers: userId } },
      {
        populate: ['author'],
        orderBy: { createdAt: QueryOrder.DESC },
        limit: +query.limit,
        offset: +query.offset,
      },
    );

    console.log('findFeed', { articles: res[0], articlesCount: res[1] });
    return { articles: res[0].map((a) => a.toJSON(user!)), articlesCount: res[1] };
  }

  async findOne(userId: number, where: Partial<Article>): Promise<IArticleRO> {
    const user = userId
      ? await this.userRepository.findOneOrFail(userId, { populate: ['followers', 'favorites'] })
      : undefined;
    const article = await this.articleRepository.findOne(where, { populate: ['author', 'coauthors'] });
    return { article: article && article.toJSON(user) } as IArticleRO;
  }

  async addComment(userId: number, slug: string, dto: CreateCommentDto) {
    const article = await this.articleRepository.findOneOrFail({ slug }, { populate: ['author'] });
    const author = await this.userRepository.findOneOrFail(userId);
    const comment = new Comment(author, article, dto.body);
    await this.em.persistAndFlush(comment);

    return { comment, article: article.toJSON(author) };
  }

  async deleteComment(userId: number, slug: string, id: number): Promise<IArticleRO> {
    const article = await this.articleRepository.findOneOrFail({ slug }, { populate: ['author'] });
    const user = await this.userRepository.findOneOrFail(userId);
    const comment = this.commentRepository.getReference(id);

    if (article.comments.contains(comment)) {
      article.comments.remove(comment);
      await this.em.removeAndFlush(comment);
    }

    return { article: article.toJSON(user) };
  }

  async favorite(id: number, slug: string): Promise<IArticleRO> {
    const article = await this.articleRepository.findOneOrFail({ slug }, { populate: ['author'] });
    const user = await this.userRepository.findOneOrFail(id, { populate: ['favorites', 'followers'] });

    if (!user.favorites.contains(article)) {
      user.favorites.add(article);
      article.favoritesCount++;
    }

    await this.em.flush();
    return { article: article.toJSON(user) };
  }

  async unFavorite(id: number, slug: string): Promise<IArticleRO> {
    const article = await this.articleRepository.findOneOrFail({ slug }, { populate: ['author'] });
    const user = await this.userRepository.findOneOrFail(id, { populate: ['followers', 'favorites'] });

    if (user.favorites.contains(article)) {
      user.favorites.remove(article);
      article.favoritesCount--;
    }

    await this.em.flush();
    return { article: article.toJSON(user) };
  }

  async findComments(slug: string): Promise<ICommentsRO> {
    const article = await this.articleRepository.findOne({ slug }, { populate: ['comments'] });
    return { comments: article!.comments.getItems() };
  }

  async create(userId: number, dto: CreateArticleDto) {
    const user = await this.userRepository.findOne(
      { id: userId },
      { populate: ['followers', 'favorites', 'articles'] },
    );
    const article = new Article(user!, dto.title, dto.description, dto.body);
    const tags = dto.tagList;
    const tagsArray = tags.split(',').map((tag) => tag.trim());
    article.tagList.push(tags);
    await this.insertTags(tagsArray);
    user?.articles.add(article);
    await this.em.flush();

    return { article: article.toJSON(user!) };
  }

  private async insertTags(tagsArray: string[]) {
    for (const tagName of tagsArray) {
      let tag = await this.tagRepository.findOne({ tag: tagName });
      if (!tag) {
        tag = new Tag();
        tag.tag = tagName;
        this.tagRepository.persist(tag);
      }
    }
  }

  async update(userId: number, slug: string, articleData: any): Promise<IArticleRO> {
    const user = await this.userRepository.findOne(
      { id: userId },
      { populate: ['followers', 'favorites', 'articles'] },
    );

    console.log("You're here");
    // Load the article and its current coauthors
    const article = await this.articleRepository.findOne({ slug }, { populate: ['author'] });

    if (!article) {
      throw new Error('Article not found.');
    }

    // If coauthors data is provided, process it
    if (articleData.coAuthors && typeof articleData.coAuthors === 'string') {
      const coauthorEmails = articleData.coAuthors.split(',').map((name: string) => name.trim());

      // Remove all current coauthors for the article
      await this.coauthorRepository.nativeDelete({ article: article.id });

      // For each username, find the user in the database and add them as a co-author
      for (const coauthorEmail of coauthorEmails) {
        const coauthorUser = await this.userRepository.findOne({ email: coauthorEmail });
        console.log(coauthorUser);
        if (coauthorUser) {
          const coauthor = new ArticleCoauthors(coauthorUser, article);
          await this.coauthorRepository.persist(coauthor);  // Saving the new coauthor relationship
        }
      }

      // Remove coauthors from the data to prevent unwanted assignment
      delete articleData.coauthors;
    }

    articleData.updatedAt = new Date();
    articleData.createdAt = formatToMySQLDateTime(articleData.createdAt);
    articleData.lockedAt = new Date();

    // Assign other article data
    wrap(article).assign(articleData);
    await this.em.flush();

    return { article: article!.toJSON(user!) };
  }

  async delete(slug: string) {
    return this.articleRepository.nativeDelete({ slug });
  }

  async lockArticle(userId: number, slug: string): Promise<IArticleRO> {
    const user = await this.userRepository.findOneOrFail(userId);
    const article = await this.articleRepository.findOneOrFail({ slug });

    article.isLocked = true;
    article.lockedBy = user;
    article.lockedAt = new Date();

    await this.em.flush();

    return { article: article.toJSON() };
  }


  async unlockArticle(userId: number, slug: string): Promise<IArticleRO> {
    const user = await this.userRepository.findOneOrFail(userId);
    const article = await this.articleRepository.findOneOrFail({ slug });

    article.isLocked = false;
    article.lockedBy = null;
    article.lockedAt = null;

    await this.em.flush();

    return { article: article.toJSON() };
  }

}


function formatToMySQLDateTime(dateString: string): string {
  const date = new Date(dateString);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0'); // Months are 0-based
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  const seconds = String(date.getUTCSeconds()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}
