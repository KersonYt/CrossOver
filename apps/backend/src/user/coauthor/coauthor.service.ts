import { Injectable } from '@nestjs/common';
import { EntityRepository } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { ArticleCoauthors } from './coauthor.entity';

@Injectable()
export class ArticleCoauthorsService {
  constructor(
    @InjectRepository(ArticleCoauthors)
    private readonly coauthorRepository: EntityRepository<ArticleCoauthors>,
  ) {}
}
