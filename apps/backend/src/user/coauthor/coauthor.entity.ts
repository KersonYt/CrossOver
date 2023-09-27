import { Entity, PrimaryKey, ManyToOne } from '@mikro-orm/core';
import { User } from '../user.entity';
import { Article } from '../../article/article.entity';

@Entity()
export class ArticleCoauthors {
  @PrimaryKey({ type: 'number' })
  id: number;

  @ManyToOne(() => User)
  user: User;

  @ManyToOne(() => Article)
  article: Article;

  constructor(user: User, article: Article) {
    this.user = user;
    this.article = article;
  }
}
