import { Field, formsActions, ngrxFormsQuery } from '@realworld/core/forms';
import { ChangeDetectionStrategy, Component, OnDestroy, OnInit } from '@angular/core';
import { combineLatest } from 'rxjs';
import { filter } from 'rxjs/operators';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { articleActions, articleQuery, articlesActions } from '@realworld/articles/data-access';
import { selectAuthState, selectLoggedIn, selectUser } from '@realworld/auth/data-access';
import { ArticleMetaComponent } from './article-meta/article-meta.component';
import { CommonModule } from '@angular/common';
import { MarkdownPipe } from './pipes/markdown.pipe';
import { ArticleCommentComponent } from './article-comment/article-comment.component';
import { AddCommentComponent } from './add-comment/add-comment.component';
import { Store } from '@ngrx/store';
import { Router } from '@angular/router';

const structure: Field[] = [
  {
    type: 'TEXTAREA',
    name: 'comment',
    placeholder: 'Write a comment...',
    attrs: {
      rows: 3,
    },
  },
];

@UntilDestroy()
@Component({
  selector: 'cdt-article',
  standalone: true,
  templateUrl: './article.component.html',
  styleUrls: ['./article.component.css'],
  imports: [CommonModule, ArticleMetaComponent, ArticleCommentComponent, MarkdownPipe, AddCommentComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArticleComponent implements OnInit, OnDestroy {
  article$ = this.store.select(articleQuery.selectData);
  comments$ = this.store.select(articleQuery.selectComments);
  canModify = false;
  articleShown: any;
  currentUser: any;
  isMainAuthor = false;
  isCoauthor = false;
  isAuthenticated$ = this.store.select(selectLoggedIn);
  structure$ = this.store.select(ngrxFormsQuery.selectStructure);
  data$ = this.store.select(ngrxFormsQuery.selectData);
  currentUser$ = this.store.select(selectUser);
  touchedForm$ = this.store.select(ngrxFormsQuery.selectTouched);

  constructor(private readonly store: Store, private router: Router) { }

  ngOnInit() {
    this.store.dispatch(formsActions.setStructure({ structure }));
    this.store.dispatch(formsActions.setData({ data: '' }));

    // Suscribirse al artículo y usuario actual
    combineLatest([
      this.article$,
      this.currentUser$,
      this.store.select(selectAuthState)
    ])
      .pipe(
        filter(([, , auth]) => auth.loggedIn),
        untilDestroyed(this)
      )
      .subscribe(([article, currentUser]) => {
        this.articleShown = article;
        this.currentUser = currentUser;
        this.isMainAuthor = this.articleShown?.author?.username === this.currentUser?.username;
        this.isCoauthor = this.articleShown?.coauthors?.some((coauthor: { username: string }) => coauthor.username === this.currentUser?.username);
        this.canModify = this.isAuthorOrCoauthor();
      });
  }

  follow(username: string) {
    this.store.dispatch(articleActions.follow({ username }));
  }
  unfollow(username: string) {
    this.store.dispatch(articleActions.unfollow({ username }));
  }
  favorite(slug: string) {
    this.store.dispatch(articlesActions.favorite({ slug }));
  }
  unfavorite(slug: string) {
    this.store.dispatch(articlesActions.unfavorite({ slug }));
  }
  delete(slug: string) {
    this.store.dispatch(articleActions.deleteArticle({ slug }));
  }
  deleteComment(data: { commentId: number; slug: string }) {
    this.store.dispatch(articleActions.deleteComment(data));
  }
  submit(slug: string) {
    this.store.dispatch(articleActions.addComment({ slug }));
  }
  updateForm(changes: any) {
    this.store.dispatch(formsActions.updateData({ data: changes }));
  }

  lockAndEdit(slug: string) {
    // Verificar si el artículo está bloqueado y no por el usuario actual
    if (this.articleShown.isLocked) {
        // Mostrar un mensaje al usuario
        alert('This article is being updated by someone else');
        return;
    }

    // Si no está bloqueado o está bloqueado por el usuario actual, proceder a bloquearlo
    this.store.dispatch(articleActions.lockArticle({ slug }));

    // Navegar a la página de edición
    this.router.navigate(['/editor', slug]);
}

  unlock(slug: string) {
    this.store.dispatch(articleActions.unlockArticle({ slug }));
  }

  followCoauthor(username: string) {
    this.store.dispatch(articleActions.followCoauthor({ username }));
  }

  unfollowCoauthor(username: string) {
    this.store.dispatch(articleActions.unfollowCoauthor({ username }));
  }

  isAuthorOrCoauthor(): boolean {
    // Verificar si el usuario actual es el autor principal
    const isMainAuthor = this.articleShown?.author?.username === this.currentUser?.username;

    // Verificar si el usuario actual es un coautor
    const isCoauthor = this.articleShown?.coauthors?.some((coauthor: { username: string }) => coauthor.username === this.currentUser?.username);

    return isMainAuthor || isCoauthor;
  }


  ngOnDestroy() {
    this.store.dispatch(articleActions.initializeArticle());
  }
}
