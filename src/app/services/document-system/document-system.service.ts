/*
  © Copyright 2021-2022  Istituto di Linguistica Computazionale "A. Zampolli", Consiglio Nazionale delle Ricerche, Pisa, Italy.
 
This file is part of EpiLexo.

EpiLexo is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

EpiLexo is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with EpiLexo. If not, see <https://www.gnu.org/licenses/>.
*/

import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { timeout } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class DocumentSystemService {
  private baseUrl_document = '/cash_itant/api/';

  private _epigraphyData: BehaviorSubject<object> = new BehaviorSubject(null);
  private _epigraphyTextData: BehaviorSubject<string> = new BehaviorSubject(
    null
  );
  private _epigraphyLeidenData: BehaviorSubject<any> = new BehaviorSubject(
    null
  );
  private _epigraphyTranslationData: BehaviorSubject<any> = new BehaviorSubject(
    null
  );
  private _metadataData: BehaviorSubject<object> = new BehaviorSubject(null);
  private _triggerMetadataPanel: BehaviorSubject<boolean> = new BehaviorSubject(
    null
  );

  epigraphyData$ = this._epigraphyData.asObservable();
  epigraphyTextData$ = this._epigraphyTextData.asObservable();
  epigraphyLeidenData$ = this._epigraphyLeidenData.asObservable();
  epigraphyTranslationData$ = this._epigraphyTranslationData.asObservable();
  metadataData$ = this._metadataData.asObservable();
  triggerMetadataPanel$ = this._triggerMetadataPanel.asObservable();

  constructor(private http: HttpClient) {}

  // Questo metodo invia un oggetto al tab epigrafico.
  sendToEpigraphyTab(object: object) {
    this._epigraphyData.next(object);
  }

  // Questo metodo invia una stringa al tab epigrafico.
  sendTextToEpigraphyTab(string: string) {
    this._epigraphyTextData.next(string);
  }

  // Questo metodo invia un array di traduzioni al tab epigrafico.
  sendTranslationToEpigraphyTab(array: any) {
    this._epigraphyTranslationData.next(array);
  }

  // Questo metodo invia una stringa Leiden al tab epigrafico.
  sendLeidenToEpigraphyTab(string: any) {
    this._epigraphyLeidenData.next(string);
  }

  // Questo metodo invia un oggetto al pannello dei metadati.
  sendToMetadataPanel(object: object) {
    this._metadataData.next(object);
  }

  // Questo metodo attiva o disattiva il pannello dei metadati.
  triggerMetadataPanel(bool: boolean) {
    this._triggerMetadataPanel.next(bool);
  }

  // Questo metodo esegue una richiesta GET per ottenere il sistema di documenti.
  getDocumentSystem(): Observable<any> {
    return this.http.get(
      this.baseUrl_document + 'public/getDocumentSystem?requestUUID=11'
    );
  }

  // Questo metodo esegue una richiesta POST per aggiungere una cartella al sistema di documenti.
  addFolder(parameters): Observable<any> {
    return this.http.post(this.baseUrl_document + 'crud/addFolder', parameters);
  }

  // Questo metodo esegue una richiesta POST per rimuovere una cartella dal sistema di documenti.
  removeFolder(parameters): Observable<any> {
    return this.http.post(
      this.baseUrl_document + 'crud/removeFolder',
      parameters
    );
  }

  // Questo metodo esegue una richiesta POST per spostare una cartella in un'altra cartella.
  moveFolder(parameters): Observable<any> {
    return this.http.post(
      this.baseUrl_document + 'crud/moveFolder',
      parameters
    );
  }

  // Questo metodo esegue una richiesta POST per rinominare una cartella.
  renameFolder(parameters): Observable<any> {
    return this.http.post(
      this.baseUrl_document + 'crud/renameFolder',
      parameters
    );
  }

  // Questo metodo esegue una richiesta POST per caricare un file di testo.
  uploadFile(parameters, element_id, request_uuid): Observable<any> {
    return this.http.post(
      this.baseUrl_document +
        'crud/uploadFile?requestUUID=' +
        request_uuid +
        '&element-id=' +
        element_id +
        '',
      parameters
    );
  }

  // Questo metodo esegue una richiesta POST per rimuovere un file.
  removeFile(parameters): Observable<any> {
    return this.http.post(
      this.baseUrl_document + 'crud/removeFile',
      parameters
    );
  }

  // Questo metodo esegue una richiesta POST per rinominare un file.
  renameFile(parameters): Observable<any> {
    return this.http.post(
      this.baseUrl_document + 'crud/renameFile',
      parameters
    );
  }

  // Questo metodo esegue una richiesta POST per spostare un file in un'altra cartella.
  moveFileTo(parameters): Observable<any> {
    return this.http.post(
      this.baseUrl_document + 'crud/moveFileTo',
      parameters
    );
  }

  // Questo metodo esegue una richiesta POST per copiare un file in un'altra cartella.
  copyFileTo(parameters): Observable<any> {
    return this.http.post(
      this.baseUrl_document + 'crud/copyFileTo',
      parameters
    );
  }

  // Questo metodo esegue una richiesta POST per scaricare un file.
  downloadFile(parameters): Observable<any> {
    return this.http.post(
      this.baseUrl_document + 'public/crud/downloadFile',
      parameters,
      { responseType: 'blob' }
    );
  }

  // Questo metodo esegue una richiesta POST per aggiornare i metadati di un file.
  updateMetadata(parameters): Observable<any> {
    return this.http.post(
      this.baseUrl_document + 'crud/updateMetadata',
      parameters
    );
  }

  // Questo metodo esegue una richiesta POST per eliminare i metadati di un file.
  deleteMetadata(parameters): Observable<any> {
    return this.http.post(
      this.baseUrl_document + 'crud/deleteMetadata',
      parameters
    );
  }

  // Questo metodo esegue una richiesta POST per cercare attestazioni con un determinato ID di forma.
  searchAttestations(formId): Observable<any> {
    return this.http.post(
      this.baseUrl_document +
        'public/search?requestUUID=11&limit=100&offset=0&query=' +
        encodeURIComponent('[attestation="' + formId + '"]'),
      null
    );
  }

  // Questo metodo esegue una richiesta POST per creare un file.
  createFile(parameters): Observable<any> {
    return this.http.post(
      this.baseUrl_document + 'crud/createFile',
      parameters
    );
  }

  // Questo metodo ottiene il contenuto di un nodo.
  getContent(nodeId): Observable<any> {
    return this.http.get(
      this.baseUrl_document +
        'public/getcontent?requestUUID=11&nodeid=' +
        nodeId
    );
  }

  // Questo metodo esegue una richiesta POST per convertire un testo di prova.
  testConvert(parameters): Observable<any> {
    return this.http.post('/leiden_demo/', parameters).pipe(timeout(10000));
  }

  // Questo metodo esegue una richiesta POST per convertire un testo di prova in italiano antico.
  testConvertItAnt(parameters): Observable<any> {
    return this.http.post('/leiden_itant/', parameters).pipe(timeout(10000));
  }

  // Questo metodo esegue una richiesta POST per aggiornare i metadati di un file.
  updateFileMetadata(parameters, element_id, request_uuid): Observable<any> {
    return this.http.post(
      this.baseUrl_document +
        'crud/updateFileMetadata?requestUUID=' +
        request_uuid +
        '&element-id=' +
        element_id +
        '',
      parameters
    );
  }

  // Questo metodo ritorna un observable vuoto.
  createText(): Observable<any> {
    return of();
  }
}
