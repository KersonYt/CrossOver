import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { ArticleCoauthors } from './coauthor.entity';
import { ArticleCoauthorsService } from './coauthor.service';

@Module({
  imports: [MikroOrmModule.forFeature([ArticleCoauthors])],
  providers: [ArticleCoauthorsService],
  exports: [ArticleCoauthorsService],
})
export class ArticleCoauthorsModule {}
