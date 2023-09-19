import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RosterActionsService } from './roster-actions.service';
import { ChangeDetectorRef } from '@angular/core';

@Component({
  standalone: true,
  selector: 'app-tabla-datos',
  templateUrl: './roster.component.html',
  styleUrls: ['./roster.component.css'],
  imports: [CommonModule]
})
export class RosterTableComponent implements OnInit {

  datos = [];

  constructor(private rosterActionsService: RosterActionsService, private cdr: ChangeDetectorRef) { }

  ngOnInit(): void {
    this.rosterActionsService.fetchRosterData().subscribe(data => {
      this.datos = data;
      this.cdr.detectChanges();
    });
  }

  redirectToProfile(username: string) {
    window.location.href = `http://localhost:4200/profile/${encodeURIComponent(username)}`;
  }

}
