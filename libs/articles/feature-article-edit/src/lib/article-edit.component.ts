import { DynamicFormComponent, Field, formsActions, ListErrorsComponent, ngrxFormsQuery } from '@realworld/core/forms';
import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { OnDestroy } from '@angular/core';
import { Validators } from '@angular/forms';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { Store } from '@ngrx/store';
import { articleActions, articleEditActions, articleQuery } from '@realworld/articles/data-access';

const structure: Field[] = [
  {
    type: 'INPUT',
    name: 'title',
    placeholder: 'Article Title',
    validator: [Validators.required],
  },
  {
    type: 'INPUT',
    name: 'description',
    placeholder: "What's this article about?",
    validator: [Validators.required],
  },
  {
    type: 'TEXTAREA',
    name: 'body',
    placeholder: 'Write your article (in markdown)',
    validator: [Validators.required],
  },
  {
    type: 'INPUT',
    name: 'tagList',
    placeholder: 'Enter Tags',
    validator: [],
  },
  {
    type: 'INPUT',
    name: 'coAuthors',
    placeholder: 'Enter co-authors',
    validator: [],
  },
];

@UntilDestroy()
@Component({
  selector: 'cdt-article-edit',
  standalone: true,
  templateUrl: './article-edit.component.html',
  styleUrls: ['./article-edit.component.css'],
  imports: [DynamicFormComponent, ListErrorsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArticleEditComponent implements OnInit, OnDestroy {
  structure$ = this.store.select(ngrxFormsQuery.selectStructure);
  data$ = this.store.select(ngrxFormsQuery.selectData);
  showCoAuthors = false;

  constructor(private readonly store: Store) { }

  ngOnInit() {
    this.store.dispatch(formsActions.setStructure({ structure: this.getStructure() }));

    this.store
      .select(articleQuery.selectData)
      .pipe(untilDestroyed(this))
      .subscribe((article) => {
        this.showCoAuthors = !!article?.body?.length;

        // Convert coauthors array to string and set it in the form data
        let formData = {
          ...article,
          coAuthors: article?.coauthors?.length ? this.coauthorsToString(article.coauthors) : ''
        };

        // Update the form data with the modified data
        this.store.dispatch(formsActions.setData({ data: formData }));

        this.store.dispatch(formsActions.setStructure({ structure: this.getStructure() }));
      });
  }

  getStructure(): Field[] {
    let baseStructure: Field[] = [
      {
        type: 'INPUT',
        name: 'title',
        placeholder: 'Article Title',
        validator: [Validators.required],
      },
      {
        type: 'INPUT',
        name: 'description',
        placeholder: "What's this article about?",
        validator: [Validators.required],
      },
      {
        type: 'TEXTAREA',
        name: 'body',
        placeholder: 'Write your article (in markdown)',
        validator: [Validators.required],
      },
      {
        type: 'INPUT',
        name: 'tagList',
        placeholder: 'Enter Tags',
        validator: [],
      },
    ];

    if (this.showCoAuthors) {
      baseStructure.push({
        type: 'INPUT',
        name: 'coAuthors',
        placeholder: 'Enter co-authors',
        validator: [],
      });
    }

    return baseStructure;
  }

  updateForm(changes: any) {
    this.store.dispatch(formsActions.updateData({ data: changes }));
  }

  submit() {
    this.store.dispatch(articleEditActions.publishArticle());
  }

  coauthorsToString(coauthors: any[]): string {
    return coauthors.map(coauthor => coauthor.email).join(', ');
  }

  ngOnDestroy() {
    this.store.dispatch(formsActions.initializeForm());
  }
}
