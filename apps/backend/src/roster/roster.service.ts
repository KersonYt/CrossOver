import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { User } from '../user/user.entity';

@Injectable()
export class RosterService {
  constructor(private readonly em: EntityManager) {}

  async getRoster(): Promise<any[]> {
    const users = await this.em.find(
      User,
      {},
      {
        populate: ['articles'],
      },
    );

    const results = [];

    for (const user of users) {
      const articles = user.articles.getItems();

      const authoredArticles = articles.length;

      const likes = articles.reduce((sum, article) => sum + article.favoritesCount, 0);

      articles.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      const firstArticleDate = articles.length ? articles[0].createdAt : null;

      results.push({
        username: user.username,
        authoredArticles: authoredArticles,
        likes: likes,
        firstArticleDate: firstArticleDate?.toLocaleDateString(),
      });
    }

    results.sort((a, b) => b.likes - a.likes);

    return results;
  }
}
