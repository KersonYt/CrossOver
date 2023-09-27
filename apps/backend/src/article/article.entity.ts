import {
  ArrayType,
  Collection,
  Entity,
  EntityDTO,
  ManyToOne,
  OneToMany,
  ManyToMany,
  PrimaryKey,
  Property,
  wrap,
} from '@mikro-orm/core';
import slug from 'slug';

import { User } from '../user/user.entity';
import { Comment } from './comment.entity';

@Entity()
export class Article {
  @PrimaryKey({ type: 'number' })
  id: number;

  @Property()
  slug: string;

  @Property()
  title: string;

  @Property()
  description = '';

  @Property()
  body = '';

  @Property({ type: 'date' })
  createdAt = new Date();

  @Property({ type: 'date', onUpdate: () => new Date() })
  updatedAt = new Date();

  @Property({ type: ArrayType })
  tagList: string[] = [];

  @ManyToOne(() => User)
  author: User;

  @ManyToMany(() => User)
  coauthors = new Collection<User>(this);

  @OneToMany(() => Comment, (comment) => comment.article, { eager: true, orphanRemoval: true })
  comments = new Collection<Comment>(this);

  @Property({ type: 'boolean', columnType: 'tinyint', default: false, fieldName: 'isLocked' })
  isLocked = false;

  @ManyToOne({ entity: () => User, nullable: true, fieldName: 'lockedBy' })
  lockedBy: User | null;

  @Property({ type: 'date', nullable: true, fieldName: 'lockedAt' })
  lockedAt: Date | null;

  @Property({ type: 'number' })
  favoritesCount = 0;

  constructor(author: User, title: string, description: string, body: string) {
    this.author = author;
    this.title = title;
    this.description = description;
    this.body = body;
    this.slug = slug(title, { lower: true }) + '-' + ((Math.random() * Math.pow(36, 6)) | 0).toString(36);
  }

  toJSON(user?: User) {
    const o = wrap<Article>(this).toObject() as ArticleDTO;
    o.favorited = user && user.favorites.isInitialized() ? user.favorites.contains(this) : false;
    o.author = this.author.toJSON(user);

    return o;
  }
}

export interface ArticleDTO extends EntityDTO<Article> {
  favorited?: boolean;
}
