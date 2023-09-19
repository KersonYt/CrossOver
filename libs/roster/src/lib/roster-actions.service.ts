import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class RosterActionsService {
  private apiUrl = 'http://localhost:3000/api/roster-profiles/';

  constructor(private http: HttpClient) {}

  fetchRosterData(): Observable<any> {
    return this.http.get<any>(this.apiUrl);
  }
}
