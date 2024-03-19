/*
  © Copyright 2021-2022  Istituto di Linguistica Computazionale "A. Zampolli", Consiglio Nazionale delle Ricerche, Pisa, Italy.
 
This file is part of EpiLexo.

EpiLexo is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

EpiLexo is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with EpiLexo. If not, see <https://www.gnu.org/licenses/>.
*/

import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class BibliographyService {
  constructor(private http: HttpClient) {}

  private baseUrl = 'https://api.zotero.org/groups/2552746/items';

  // Questa classe implementa un servizio per gestire le richieste di aggiunta e filtro per una bibliografia.

  // BehaviorSubject è un tipo di Observable che emette l'ultimo valore all'iscrizione.
  // Inizializziamo due BehaviorSubject: uno per gestire le richieste di aggiunta di un elemento bibliografico e l'altro per attivare un pannello.

  private _addBiblioItem: BehaviorSubject<any> = new BehaviorSubject(null);
  private _triggerPanel: BehaviorSubject<object> = new BehaviorSubject(null);

  // Esponiamo due Observable pubblici per permettere agli altri componenti di sottoscriversi ai cambiamenti.
  addBiblioReq$ = this._addBiblioItem.asObservable();
  triggerPanel$ = this._triggerPanel.asObservable();

  // Questo metodo invia un oggetto al pannello della bibliografia chiamando next sull'oggetto _addBiblioItem.
  sendDataToBibliographyPanel(object: any) {
    this._addBiblioItem.next(object);
  }

  // Questo metodo attiva un pannello chiamando next sull'oggetto _triggerPanel.
  triggerPanel(object: object) {
    this._triggerPanel.next(object);
  }

  // Questo metodo effettua una richiesta HTTP per ottenere i dati da visualizzare nella bibliografia.
  bootstrapData(
    start?: number,
    sortField?: string,
    direction?: string
  ): Observable<any> {
    return this.http.get(
      this.baseUrl +
        '?limit=25&start=' +
        start +
        '&sort=' +
        sortField +
        '&direction=' +
        direction +
        '&v=3'
    );
  }

  // Questo metodo effettua una richiesta HTTP per filtrare i dati nella bibliografia.
  filterBibliography(
    start?: number,
    sortField?: string,
    direction?: string,
    query?,
    queryMode?
  ): Observable<any> {
    return this.http.get(
      this.baseUrl +
        '?limit=25&q=' +
        query +
        '&qmode=' +
        queryMode +
        '&start=' +
        start +
        '&sort=' +
        sortField +
        '&direction=' +
        direction +
        '&v=3'
    );
  }
}
