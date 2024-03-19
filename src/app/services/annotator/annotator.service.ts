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
export class AnnotatorService {
  private baseUrl = '/cash_itant/api/';

  constructor(private http: HttpClient) {}

  // Questa classe implementa un servizio per la gestione delle richieste relative alla ricerca, alla manipolazione e alla gestione dei token e delle annotazioni.

  private _triggerSearch: BehaviorSubject<any> = new BehaviorSubject(null);
  // BehaviorSubject per inviare la stringa di ricerca.

  private _deleteAnnoRequest: BehaviorSubject<any> = new BehaviorSubject(null);
  // BehaviorSubject per inviare la richiesta di eliminazione di un'annotazione.

  private _deleteTokenRequest: BehaviorSubject<any> = new BehaviorSubject(null);
  // BehaviorSubject per inviare la richiesta di eliminazione di un token.

  private _getIdText: BehaviorSubject<any> = new BehaviorSubject(null);
  // BehaviorSubject per inviare l'ID del testo.

  private _addToken: BehaviorSubject<any> = new BehaviorSubject(null);
  // BehaviorSubject per aggiungere un token.

  private arrayPanelFormsData = {};
  // Un oggetto per memorizzare i dati dei form dei pannelli.

  triggerSearch$ = this._triggerSearch.asObservable();
  // Observable per osservare le richieste di ricerca.

  deleteAnnoReq$ = this._deleteAnnoRequest.asObservable();
  // Observable per osservare le richieste di eliminazione delle annotazioni.

  deleteTokenReq$ = this._deleteTokenRequest.asObservable();
  // Observable per osservare le richieste di eliminazione dei token.

  getIdText$ = this._getIdText.asObservable();
  // Observable per osservare gli ID dei testi.

  addToken$ = this._addToken.asObservable();
  // Observable per osservare l'aggiunta di un token.

  // Metodo per attivare una ricerca con una stringa specifica.
  triggerSearch(string: string) {
    this._triggerSearch.next(string);
  }

  // Metodo per inviare una richiesta di eliminazione di un'annotazione dato l'ID dell'annotazione e l'ID del nodo.
  deleteAnnotationRequest(id: number, node_id: number) {
    this._deleteAnnoRequest.next({ id, node_id });
  }

  // Metodo per inviare una richiesta di eliminazione di un token dato l'ID del token.
  deleteTokenRequest(tokenId: number) {
    this._deleteTokenRequest.next(tokenId);
  }

  // Metodo per aggiungere un token ai form epigrafici.
  addTokenToEpigraphyForm(token: any) {
    this._addToken.next(token);
  }

  // Metodo per inviare un oggetto contenente l'ID del testo.
  getIdText(object: any) {
    this._getIdText.next(object);
  }

  // Metodo per ottenere i dati del form del pannello dato l'ID dell'annotazione.
  getPanelForm(id_annotation): object {
    return this.arrayPanelFormsData[id_annotation];
  }

  // Metodo per ottenere tutti i dati dei form dei pannelli.
  getAllPanelForms(): object {
    return this.arrayPanelFormsData;
  }

  // Metodo per chiudere il form del pannello dato l'ID dell'annotazione.
  closePanelForm(id_annotation): void {
    this.arrayPanelFormsData[id_annotation] = undefined;
  }

  // Metodo per creare un nuovo form del pannello dato l'ID dell'annotazione.
  newPanelForm(id_annotation): void {
    this.arrayPanelFormsData[id_annotation] = {};
    this.arrayPanelFormsData[id_annotation].data = undefined;
    this.arrayPanelFormsData[id_annotation].isOpen = undefined;
  }

  // Metodo per ottenere i token dato l'ID del nodo.
  getTokens(id: number): Observable<any> {
    return this.http.get(
      this.baseUrl + 'public/token?requestUUID=test123&nodeid=' + id
    );
  }

  // Metodo per aggiungere un token dato l'ID del nodo e il corpo del token.
  addToken(node_id: number, tokenBody: any): Observable<any> {
    return this.http.post(
      this.baseUrl + 'token?requestUUID=test123&nodeid=' + node_id,
      tokenBody
    );
  }

  // Questo metodo elimina un token dal backend utilizzando il suo ID.
  // Accetta l'ID del token come parametro e restituisce un'Observable che rappresenta la richiesta di eliminazione.
  deleteToken(tokenid: number): Observable<any> {
    // Effettua una richiesta HTTP di tipo DELETE al backend utilizzando l'ID del token fornito.
    return this.http.delete(
      this.baseUrl + 'token?requestUUID=test123&tokenid=' + tokenid
    );
  }

  // Questo metodo ottiene il testo associato a un determinato ID dal backend.
  // Accetta l'ID come parametro e restituisce un'Observable che rappresenta la risposta della richiesta GET.
  getText(id: number): Observable<any> {
    // Effettua una richiesta HTTP di tipo GET al backend utilizzando l'ID fornito per ottenere il testo associato.
    return this.http.get(
      this.baseUrl + 'public/gettext?requestUUID=test123&nodeid=' + id
    );
  }

  // Questo metodo aggiunge un'annotazione associata a un ID specifico nel backend.
  // Accetta un oggetto di parametri e l'ID come parametri e restituisce un'Observable che rappresenta la risposta della richiesta POST.
  addAnnotation(parameters: object, id: number): Observable<any> {
    // Effettua una richiesta HTTP di tipo POST al backend utilizzando l'ID fornito per aggiungere un'annotazione con i parametri specificati.
    return this.http.post(
      this.baseUrl + 'annotation?requestUUID=test123&nodeid=' + id,
      parameters
    );
  }

  // Questo metodo ottiene un'annotazione dal backend utilizzando un ID specifico.
  // Accetta l'ID come parametro e restituisce un'Observable che rappresenta la risposta della richiesta GET.
  getAnnotation(id: number): Observable<any> {
    // Effettua una richiesta HTTP di tipo GET al backend utilizzando l'ID fornito per ottenere l'annotazione corrispondente.
    return this.http.get(
      this.baseUrl + 'public/annotation?requestUUID=test123&nodeid=' + id
    );
  }

  // Questo metodo ottiene un'annotazione dal backend utilizzando un valore specifico.
  // Accetta l'ID del modulo come parametro e restituisce un'Observable che rappresenta la risposta della richiesta GET.
  getAnnotationByValue(formId: number): Observable<any> {
    // Effettua una richiesta HTTP di tipo GET al backend utilizzando l'ID del modulo fornito per ottenere l'annotazione corrispondente.
    return this.http.get(
      this.baseUrl +
        'annotationbyvalue?requestUUID=test123&value=' +
        encodeURIComponent(formId)
    );
  }

  // Questo metodo elimina un'annotazione dal backend utilizzando il suo ID.
  // Accetta l'ID dell'annotazione come parametro e restituisce un'Observable che rappresenta la richiesta di eliminazione.
  deleteAnnotation(id: number): Observable<any> {
    // Effettua una richiesta HTTP di tipo DELETE al backend utilizzando l'ID dell'annotazione fornito.
    return this.http.delete(
      this.baseUrl + 'annotate?requestUUID=test123&annotationID=' + id
    );
  }

  // Questo metodo elimina un'annotazione dal backend utilizzando un valore specifico.
  // Accetta il valore del modulo come parametro e restituisce un'Observable che rappresenta la richiesta di eliminazione.
  deleteAnnotationByValue(formId: string): Observable<any> {
    // Effettua una richiesta HTTP di tipo DELETE al backend utilizzando il valore del modulo fornito per eliminare l'annotazione corrispondente.
    return this.http.delete(
      `${
        this.baseUrl
      }annotationbyvalue?requestUUID=test123&value=${encodeURIComponent(
        formId
      )}`
    );
  }

  // Questo metodo aggiorna un'annotazione esistente nel backend.
  // Accetta un oggetto di annotazione come parametro e restituisce un'Observable che rappresenta la risposta della richiesta PUT.
  updateAnnotation(annotation: object): Observable<any> {
    // Effettua una richiesta HTTP di tipo PUT al backend per aggiornare l'annotazione con i nuovi dati forniti.
    return this.http.put(
      this.baseUrl + 'annotation?requestUUID=test123',
      annotation
    );
  }

  // Questo metodo aggiunge un elemento non strutturato associato a un ID specifico nel backend.
  // Accetta l'ID e un oggetto rappresentante il corpo dell'elemento non strutturato come parametri e restituisce un'Observable che rappresenta la risposta della richiesta POST.
  addUnstructured(id: number, body: object): Observable<any> {
    // Effettua una richiesta HTTP di tipo POST al backend utilizzando l'ID fornito per aggiungere l'elemento non strutturato con il corpo specificato.
    return this.http.post(
      this.baseUrl + 'unstructured?requestUUID=test123&nodeid=' + id,
      body
    );
  }
}
