import { Component, Input, ChangeDetectionStrategy, EventEmitter, Output } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Article } from '@realworld/core/api-types';
@Component({
  selector: 'cdt-article-meta',
  standalone: true,
  templateUrl: './article-meta.component.html',
  styleUrls: ['./article-meta.component.css'],
  imports: [RouterModule, CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArticleMetaComponent {
  @Input() article!: Article;
  @Input() isAuthenticated!: boolean;
  @Input() canModify!: boolean;
  @Input() isMainAuthor!: boolean;
  @Input() isCoauthor!: boolean;
  @Input() currentUser: any;
  @Output() follow: EventEmitter<string> = new EventEmitter<string>();
  @Output() unfollow: EventEmitter<string> = new EventEmitter<string>();
  @Output() unfavorite: EventEmitter<string> = new EventEmitter();
  @Output() favorite: EventEmitter<string> = new EventEmitter();
  @Output() delete: EventEmitter<string> = new EventEmitter();
  @Output() followCoauthor: EventEmitter<string> = new EventEmitter<string>();
  @Output() unfollowCoauthor: EventEmitter<string> = new EventEmitter<string>();
  @Output() lockAndEdit: EventEmitter<string> = new EventEmitter<string>();


  toggleFavorite() {
    if (this.article.favorited) {
      this.unfavorite.emit(this.article.slug);
    } else {
      this.favorite.emit(this.article.slug);
    }
  }

  toggleFollow() {
    if (this.article.author.following) {
      this.unfollow.emit(this.article.author.username);
    } else {
      this.follow.emit(this.article.author.username);
    }
  }

  toggleCoauthorFollow(coauthor: any) {
    if (coauthor.following) {
      this.unfollowCoauthor.emit(coauthor.username);
    } else {
      this.followCoauthor.emit(coauthor.username);
    }
  }
  

  deleteArticle() {
    this.delete.emit(this.article.slug);
  }

}
