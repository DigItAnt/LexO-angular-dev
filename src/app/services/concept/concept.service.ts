/*
  © Copyright 2021-2022  Istituto di Linguistica Computazionale "A. Zampolli", Consiglio Nazionale delle Ricerche, Pisa, Italy.
 
This file is part of EpiLexo.

EpiLexo is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

EpiLexo is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with EpiLexo. If not, see <https://www.gnu.org/licenses/>.
*/

import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
import { AuthService } from '../auth/auth.service';

@Injectable({
  providedIn: 'root',
})
export class ConceptService {
  private baseUrl = '/LexO-backend-itant_itant/service/';
  private key = 'PRINitant19';
  private author = '';
  private lexicalIRI = 'http://lexica/mylexicon#';
  private lexicalPrefix = 'lex';

  private _deleteConceptSetReq: BehaviorSubject<any> = new BehaviorSubject(
    null
  );
  private _addSubElementReq: BehaviorSubject<any> = new BehaviorSubject(null);

  deleteSkosReq$ = this._deleteConceptSetReq.asObservable();
  addSubReq$ = this._addSubElementReq.asObservable();

  constructor(private http: HttpClient, private auth: AuthService) {}

  // Questo metodo aggiunge una richiesta per un sottoelemento.
  // Accetta un parametro opzionale `request` e emette il valore attraverso il Subject `_addSubElementReq`.
  addSubElementRequest(request?: any) {
    this._addSubElementReq.next(request);
  }

  // Questo metodo restituisce l'IRI lessicale.
  getLexicalIRI() {
    return this.lexicalIRI;
  }

  // Questo metodo invia una richiesta di eliminazione.
  // Accetta un parametro opzionale `request` e emette il valore attraverso il Subject `_deleteConceptSetReq`.
  deleteRequest(request?: any) {
    this._deleteConceptSetReq.next(request);
  }

  // Questo metodo restituisce un Observable che esegue una richiesta GET per ottenere insiemi di concetti.
  getConceptSets(): Observable<any> {
    return this.http.get(this.baseUrl + 'lexicon/data/conceptSets');
  }

  // Questo metodo restituisce un Observable che esegue una richiesta GET per ottenere concetti lessicali radice.
  getRootLexicalConcepts(): Observable<any> {
    return this.http.get(this.baseUrl + 'lexicon/data/lexicalConcepts?id=root');
  }

  // Questo metodo restituisce un Observable che esegue una richiesta GET per ottenere i concetti lessicali.
  // Accetta un parametro `instance` e lo codifica per utilizzarlo nell'URL.
  getLexicalConcepts(instance: string): Observable<any> {
    return this.http.get(
      this.baseUrl +
        'lexicon/data/lexicalConcepts?id=' +
        encodeURIComponent(instance)
    );
  }

  // Questo metodo restituisce un Observable che esegue una richiesta GET per ottenere i dati del concetto lessicale.
  // Accetta un parametro `instance` e lo codifica per utilizzarlo nell'URL.
  getLexicalConceptData(instance: string): Observable<any> {
    return this.http.get(
      this.baseUrl +
        'lexicon/data/lexicalConcept?id=' +
        encodeURIComponent(instance)
    );
  }

  // Questo metodo restituisce un Observable che esegue una richiesta GET per creare un nuovo insieme di concetti.
  createNewConceptSet(): Observable<any> {
    this.author = this.auth.getUsername();
    return this.http.get(
      this.baseUrl +
        'lexicon/creation/conceptSet?key=' +
        this.key +
        '&author=' +
        this.author +
        '&prefix=' +
        encodeURIComponent(this.lexicalPrefix) +
        '&baseIRI=' +
        encodeURIComponent(this.lexicalIRI)
    );
  }

  // Questo metodo restituisce un Observable che esegue una richiesta GET per creare un nuovo concetto lessicale.
  createNewLexicalConcept(): Observable<any> {
    this.author = this.auth.getUsername();
    return this.http.get(
      this.baseUrl +
        'lexicon/creation/lexicalConcept?key=' +
        this.key +
        '&author=' +
        this.author +
        '&prefix=' +
        encodeURIComponent(this.lexicalPrefix) +
        '&baseIRI=' +
        encodeURIComponent(this.lexicalIRI)
    );
  }

  // Questo metodo restituisce un Observable che esegue una richiesta POST per collegare un concetto lessicale.
  // Accetta un parametro `parameters`.
  linkLexicalConceptTo(parameters): Observable<any> {
    return this.http.post(
      this.baseUrl + 'lexicon/creation/lexicalConcept?key=' + this.key,
      parameters
    );
  }

  // Questo metodo restituisce un Observable che esegue una richiesta GET per eliminare un insieme di concetti.
  // Accetta un parametro `conceptSetID` e lo codifica per utilizzarlo nell'URL.
  deleteConceptSet(conceptSetID): Observable<any> {
    return this.http.get(
      this.baseUrl +
        'lexicon/delete/conceptSet?key=' +
        this.key +
        '&id=' +
        encodeURIComponent(conceptSetID)
    );
  }

  // Questo metodo restituisce un Observable che esegue una richiesta GET per eliminare un concetto lessicale.
  // Accetta due parametri, `lexicalConceptID` e `recursive`, quest'ultimo è opzionale.
  deleteLexicalConcept(lexicalConceptID, recursive?): Observable<any> {
    if (recursive == undefined) {
      return this.http.get(
        this.baseUrl +
          'lexicon/delete/lexicalConcept?key=' +
          this.key +
          '&id=' +
          encodeURIComponent(lexicalConceptID) +
          '&recursive=false'
      );
    } else {
      return this.http.get(
        this.baseUrl +
          'lexicon/delete/lexicalConcept?key=' +
          this.key +
          '&id=' +
          encodeURIComponent(lexicalConceptID) +
          '&recursive=true'
      );
    }
  }

  // Questo metodo restituisce un Observable che esegue una richiesta POST per aggiornare un'etichetta SKOS.
  // Accetta un parametro `parameters`.
  updateSkosLabel(parameters): Observable<any> {
    return this.http.post(
      this.baseUrl + 'skos/updateLexicalLabel?key=' + this.key,
      parameters
    );
  }

  // Questo metodo restituisce un Observable che esegue una richiesta POST per aggiornare una proprietà dello schema SKOS.
  // Accetta un parametro `parameters`.
  updateSchemeProperty(parameters): Observable<any> {
    return this.http.post(
      this.baseUrl + 'skos/updateSchemeProperty?key=' + this.key,
      parameters
    );
  }

  // Questo metodo restituisce un Observable che esegue una richiesta POST per aggiornare una relazione semantica SKOS.
  // Accetta un parametro `parameters`.
  updateSemanticRelation(parameters): Observable<any> {
    return this.http.post(
      this.baseUrl + 'skos/updateSemanticRelation?key=' + this.key,
      parameters
    );
  }

  // Questo metodo restituisce un Observable che esegue una richiesta POST per aggiornare una proprietà delle note SKOS.
  // Accetta un parametro `parameters`.
  updateNoteProperty(parameters): Observable<any> {
    return this.http.post(
      this.baseUrl + 'skos/updateNoteProperty?key=' + this.key,
      parameters
    );
  }

  // Questo metodo restituisce un Observable che esegue una richiesta POST per eliminare una relazione.
  // Accetta due parametri, `instance` e `parameters`.
  deleteRelation(instance, parameters): Observable<any> {
    return this.http.post(
      this.baseUrl +
        'lexicon/delete/relation?key=' +
        this.key +
        '&id=' +
        encodeURIComponent(instance),
      parameters
    );
  }

  // Questo metodo restituisce un Observable che esegue una richiesta POST per filtrare i concetti.
  // Accetta un parametro `parameters`.
  conceptFilter(parameters: any): Observable<any> {
    return this.http.post(
      this.baseUrl + 'lexicon/data/filteredLexicalConcepts',
      parameters
    );
  }
}
