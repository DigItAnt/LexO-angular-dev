/*
  © Copyright 2021-2022  Istituto di Linguistica Computazionale "A. Zampolli", Consiglio Nazionale delle Ricerche, Pisa, Italy.
 
This file is part of EpiLexo.

EpiLexo is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

EpiLexo is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with EpiLexo. If not, see <https://www.gnu.org/licenses/>.
*/

import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
import { AuthService } from '../auth/auth.service';

@Injectable({
  providedIn: 'root'
})
export class ConceptService {

  private baseUrl = "/LexO-backend-itant_demo/service/"
  private key = "PRINitant19";
  private author = "";
  private lexicalIRI = 'http://lexica/mylexicon#';
  private lexicalPrefix = 'lex'

  constructor(private http: HttpClient, private auth: AuthService) { }

  getConceptSets(): Observable<any> {
    return this.http.get(this.baseUrl + "lexicon/data/conceptSets");
  }

  getRootConceptSets(): Observable<any> {
    return this.http.get(this.baseUrl + "lexicon/data/conceptSets?id=root");
  }

  createNewConceptSet(): Observable<any> {
    this.author = this.auth.getUsername();
    return this.http.get(this.baseUrl + "lexicon/creation/conceptSet?key="+this.key+"&author="+this.author+"&prefix="+encodeURIComponent(this.lexicalPrefix)+"&baseIRI="+encodeURIComponent(this.lexicalIRI));
  }
}
